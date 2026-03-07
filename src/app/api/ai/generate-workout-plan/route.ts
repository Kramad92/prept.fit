import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aiJSON } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { getAILanguageInstruction, getAIExerciseNameInstruction } from "@/lib/ai-locale";

const schema = z.object({
  prompt: z.string().min(3).max(1000),
  preferences: z.string().max(500).optional(),
  locale: z.enum(["bs", "sr", "hr", "en"]).optional().default("bs"),
  includeVideos: z.boolean().optional().default(false),
});

interface GeneratedExercise {
  name: string;
  nameEn: string;
  sets: number;
  reps: string;
  weight: string;
  restSeconds: number;
  notes: string;
}

interface GeneratedWorkoutPlan {
  name: string;
  description: string;
  exercises: GeneratedExercise[];
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const { prompt, preferences, locale, includeVideos } = parsed.data;

  // Fetch existing exercise library for matching
  const libraryExercises = await prisma.exerciseLibrary.findMany({
    where: { tenantId: session.user.tenantId },
    select: { name: true, nameBs: true, videoUrl: true, instructions: true, category: true },
    take: 200,
  });

  const libraryContext = libraryExercises.length > 0
    ? `\nYou have access to the coach's exercise library. If an exercise matches one from this list, use the EXACT same name:\n${libraryExercises.map((e) => `- ${e.name}${e.nameBs ? ` / ${e.nameBs}` : ""}${e.category ? ` (${e.category})` : ""}`).join("\n")}\n`
    : "";

  const prefInstruction = preferences
    ? `Additional preferences/constraints: ${preferences}`
    : "";

  const langInstruction = getAILanguageInstruction(locale || "bs");
  const exerciseNameInstruction = getAIExerciseNameInstruction(locale || "bs");

  try {
    const result = await aiJSON<GeneratedWorkoutPlan>({
      messages: [
        {
          role: "system",
          content: `You are an expert fitness coach and exercise programmer. Generate a complete workout plan based on the user's request.
${libraryContext}
Rules:
- Each exercise must have: name, nameEn (English name for reference), sets (number), reps (string like "8-12" or "10"), weight (string like "bodyweight", "moderate", or leave empty ""), restSeconds (number), notes (string with detailed form cues)
- Include 5-10 exercises per workout
- Order exercises logically (compound first, isolation after)
- Use appropriate set/rep schemes for the goal (strength: 3-5x3-5, hypertrophy: 3-4x8-12, endurance: 2-3x15-20)
- Include rest periods appropriate for the training style
- The "notes" field MUST contain helpful form cues and technique tips for each exercise (2-3 sentences). Example: "Držite leđa ravno, spuštajte šipku do grudi kontrolisano. Laktove držite pod uglom od 45 stepeni. Izdahnite pri guranju."
- ${exerciseNameInstruction}
- ${langInstruction}
${prefInstruction}

Return a JSON object with this exact structure:
{
  "name": "Workout name",
  "description": "Brief description of the workout",
  "exercises": [
    {
      "name": "Potisak s klupe (Bench Press)",
      "nameEn": "Bench Press",
      "sets": 4,
      "reps": "8-12",
      "weight": "",
      "restSeconds": 90,
      "notes": "Detailed form cues here (2-3 sentences)"
    }
  ]
}`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      maxTokens: 3000,
      temperature: 0.3,
    });

    // Build a lookup from exercise library for videoUrl matching
    const libraryLookup = new Map<string, string>();
    for (const ex of libraryExercises) {
      if (ex.videoUrl) {
        libraryLookup.set(ex.name.toLowerCase(), ex.videoUrl);
      }
    }

    // Enrich exercises with video URLs
    const exercises = result.exercises.map((ex) => {
      // Try to match from library first
      const libraryVideo = libraryLookup.get(ex.name.toLowerCase());
      let videoUrl = libraryVideo || "";

      // If no library match and videos requested, generate YouTube search URL
      if (!videoUrl && includeVideos && ex.nameEn) {
        const query = encodeURIComponent(`${ex.nameEn} exercise form how to`);
        videoUrl = `https://www.youtube.com/results?search_query=${query}`;
      }

      return { ...ex, videoUrl };
    });

    return NextResponse.json({ ...result, exercises });
  } catch (e) {
    console.error("AI generate-workout-plan error:", e);
    return NextResponse.json({ error: "Failed to generate workout plan" }, { status: 502 });
  }
}
