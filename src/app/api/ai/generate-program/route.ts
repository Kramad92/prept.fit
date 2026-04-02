import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aiJSON } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { getAILanguageInstruction } from "@/lib/ai-locale";

const schema = z.object({
  prompt: z.string().min(3).max(1000),
  locale: z.enum(["bs", "sr", "hr", "en"]).optional().default("bs"),
  durationWeeks: z.number().min(1).max(52),
  daysPerWeek: z.number().min(1).max(7),
});

// ─── Types ──────────────────────────────────────────────────

interface ExerciseSwap {
  originalExerciseName: string;
  swapExerciseName: string;
  swapExerciseLibraryId: string | null;
  reason: string;
}

interface GeneratedDay {
  weekNumber: number;
  dayNumber: number;
  label: string;
  workoutName: string;
  exerciseSwaps?: ExerciseSwap[];
}

interface GeneratedProgram {
  name: string;
  description: string;
  days: GeneratedDay[];
}

// ─── Helpers ────────────────────────────────────────────────

interface SwapCandidate {
  id: string;
  name: string;
  muscleGroup: string | null;
  category: string | null;
  equipment: string | null;
}

function buildSwapPool(
  workouts: Array<{
    name: string;
    exercises: Array<{ name: string; muscleGroup?: string | null; category?: string | null }>;
  }>,
  libraryExercises: SwapCandidate[]
): string {
  // Group library exercises by muscleGroup
  const byMuscle = new Map<string, SwapCandidate[]>();
  for (const ex of libraryExercises) {
    const key = ex.muscleGroup || ex.category || "Other";
    if (!byMuscle.has(key)) byMuscle.set(key, []);
    byMuscle.get(key)!.push(ex);
  }

  const lines: string[] = [];
  for (const workout of workouts) {
    lines.push(`\nWorkout "${workout.name}" exercises:`);
    for (const ex of workout.exercises) {
      const key = ex.muscleGroup || ex.category || "Other";
      const candidates = byMuscle.get(key) || [];
      // Pick up to 5 swap candidates that aren't the same exercise
      const swaps = candidates
        .filter((c) => c.name.toLowerCase() !== ex.name.toLowerCase())
        .slice(0, 5);
      if (swaps.length > 0) {
        lines.push(
          `  - ${ex.name} (${key}) → possible swaps: ${swaps.map((s) => `${s.name} [${s.id}]`).join(", ")}`
        );
      } else {
        lines.push(`  - ${ex.name} (${key}) → no swap candidates available`);
      }
    }
  }
  return lines.join("\n");
}

// ─── Route ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const { prompt, locale, durationWeeks, daysPerWeek } = parsed.data;
  const tenantId = session.user.tenantId;

  // Fetch existing workout templates WITH their exercises
  const workouts = await prisma.workoutPlan.findMany({
    where: { tenantId, sourceTemplateId: null },
    select: {
      id: true,
      name: true,
      description: true,
      exercises: {
        select: { id: true, name: true, sets: true, reps: true, orderIndex: true },
        orderBy: { orderIndex: "asc" },
      },
      _count: { select: { exercises: true } },
    },
    take: 100,
  });

  if (workouts.length === 0) {
    return NextResponse.json(
      { error: "No workouts available. Create some workouts first." },
      { status: 400 }
    );
  }

  // Fetch exercise library for swap candidates
  const libraryExercises = await prisma.exerciseLibrary.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      muscleGroup: true,
      category: true,
      equipment: true,
    },
    take: 500,
  });

  // We need muscleGroup/category for each workout exercise — try to match from library
  const libraryByName = new Map(
    libraryExercises.map((e) => [e.name.toLowerCase(), e])
  );

  const workoutsWithMeta = workouts.map((w) => ({
    ...w,
    exercises: w.exercises.map((ex) => {
      const lib = libraryByName.get(ex.name.toLowerCase());
      return {
        ...ex,
        muscleGroup: lib?.muscleGroup || null,
        category: lib?.category || null,
      };
    }),
  }));

  const workoutList = workouts
    .map(
      (w) =>
        `- "${w.name}"${w.description ? ` — ${w.description}` : ""} (${w._count.exercises} exercises: ${w.exercises.map((e) => e.name).join(", ")})`
    )
    .join("\n");

  // Build swap pool context
  const swapPoolContext =
    libraryExercises.length > 0 && durationWeeks > 1
      ? `\nEXERCISE SWAP POOL (for variety across weeks):\n${buildSwapPool(workoutsWithMeta, libraryExercises)}\n`
      : "";

  const langInstruction = getAILanguageInstruction(locale || "bs");

  const variationInstructions =
    durationWeeks > 1
      ? `
VARIATION RULES (CRITICAL for multi-week programs):
- Week 1 uses the base workouts as-is (no swaps).
- For weeks 2+, suggest 1-3 exercise swaps per workout to add variety while targeting the same muscle groups.
- Use ONLY exercises from the swap pool above. Include the library ID in brackets [id] for each swap.
- Each swap should have a brief reason (e.g., "different angle for chest", "unilateral variation").
- Not every workout needs swaps every week — vary 1-3 exercises per workout, not all of them.
- Maintain progressive structure: swaps should make sense in a periodized program.
- Format exerciseSwaps as an array for each day:
  [{"originalExerciseName": "Bench Press", "swapExerciseName": "Incline Dumbbell Press", "swapExerciseLibraryId": "clx123...", "reason": "incline angle for upper chest emphasis"}]
`
      : "";

  try {
    const result = await aiJSON<GeneratedProgram>({
      messages: [
        {
          role: "system",
          content: `You are an expert fitness coach. Generate a workout program schedule by selecting from the coach's EXISTING workouts.

AVAILABLE WORKOUTS:
${workoutList}
${swapPoolContext}
PROGRAM PARAMETERS:
- Duration: ${durationWeeks} weeks
- Training days per week: ${daysPerWeek}

Rules:
- You MUST only use workout names EXACTLY as they appear in the list above. Do NOT invent new workout names.
- Assign one workout per day slot (weekNumber 1-${durationWeeks}, dayNumber 1-${daysPerWeek})
- Each day needs a label — use the day of the week (e.g. "Monday", "Tuesday", etc.) in the user's language
- Arrange workouts logically — avoid repeating the same muscle group on consecutive days
- You can repeat workouts across different weeks (common in periodized programs)
- If there are fewer workouts than day slots, reuse workouts in a logical rotation
${variationInstructions}
- ${langInstruction}

Return a JSON object with this exact structure:
{
  "name": "Program name",
  "description": "Brief program description",
  "days": [
    {
      "weekNumber": 1,
      "dayNumber": 1,
      "label": "Monday",
      "workoutName": "Exact Workout Name From List",
      "exerciseSwaps": []
    }
  ]
}

Include ALL ${durationWeeks * daysPerWeek} day slots in the response.${durationWeeks > 1 ? " Week 1 days should have empty exerciseSwaps arrays. Weeks 2+ should have 1-3 swaps per day for variety." : ""}`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      maxTokens: durationWeeks > 2 ? 4000 : 3000,
      temperature: 0.3,
    });

    // Build lookup maps
    const workoutLookup = new Map<string, string>();
    for (const w of workouts) {
      workoutLookup.set(w.name.toLowerCase(), w.id);
    }

    const libraryIdLookup = new Map<string, string>();
    for (const e of libraryExercises) {
      libraryIdLookup.set(e.name.toLowerCase(), e.id);
    }

    // Map AI-generated workout names to actual IDs and validate swaps
    const days = result.days.map((day) => {
      const workoutId = workoutLookup.get(day.workoutName.toLowerCase());

      // Validate and clean exercise swaps
      const exerciseSwaps = (day.exerciseSwaps || [])
        .map((swap) => ({
          originalExerciseName: swap.originalExerciseName,
          swapExerciseName: swap.swapExerciseName,
          swapExerciseLibraryId:
            swap.swapExerciseLibraryId ||
            libraryIdLookup.get(swap.swapExerciseName.toLowerCase()) ||
            null,
          reason: swap.reason,
        }))
        .filter((swap) => swap.swapExerciseLibraryId); // Only keep swaps we can resolve

      return {
        weekNumber: day.weekNumber,
        dayNumber: day.dayNumber,
        label: day.label,
        workoutPlanId: workoutId || null,
        workoutName: workoutId ? day.workoutName : null,
        exerciseSwaps: exerciseSwaps.length > 0 ? exerciseSwaps : null,
      };
    });

    return NextResponse.json({
      name: result.name,
      description: result.description,
      days,
    });
  } catch (e) {
    console.error("AI generate-program error:", e);
    return NextResponse.json({ error: "Failed to generate program" }, { status: 502 });
  }
}
