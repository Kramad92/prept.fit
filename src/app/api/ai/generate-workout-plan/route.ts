import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aiJSON } from "@/lib/ai";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { getAILanguageInstruction, getAIExerciseNameInstruction } from "@/lib/ai-locale";
import { logAiUsage } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit";
import { getFilteredExercises, buildExerciseContext, fuzzyMatchExercise } from "@/lib/exercise-filter";

const schema = z.object({
  prompt: z.string().min(3).max(1000),
  preferences: z.string().max(500).optional(),
  locale: z.enum(["bs", "sr", "hr", "en"]).optional().default("en"),
  includeVideos: z.boolean().optional().default(false),
});

// ─── Types ──────────────────────────────────────────────────

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
  error?: string;
}

// ─── Route ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit("ai", session.user.tenantId);
  if (rl) return rl;

  const parsed = await validateBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const { prompt, preferences, locale, includeVideos } = parsed.data;
  const tenantId = session.user.tenantId;

  try {
    // Two-stage filtering: classify prompt → filter library → generate with focused context
    const { exercises: filteredExercises, exerciseNames } = await getFilteredExercises(tenantId, prompt, preferences);
    const { libraryContext, libraryLookup } = buildExerciseContext(filteredExercises);

    const prefInstruction = preferences
      ? `Additional preferences/constraints: ${preferences}`
      : "";

    const langInstruction = getAILanguageInstruction(locale || "en");
    const exerciseNameInstruction = getAIExerciseNameInstruction(locale || "en");

    // Stage 2: Generate the workout plan with filtered exercises
    const { data: result, usage } = await aiJSON<GeneratedWorkoutPlan>({
      messages: [
        {
          role: "system",
          content: `You are an expert fitness coach and exercise programmer. Generate a complete workout plan based on the user's request.

SCOPE: You ONLY handle requests related to fitness, exercise, workout programming, and physical training. If the user's request is clearly unrelated (e.g. coding, math homework, general knowledge, writing essays), return ONLY this JSON: {"error": "off_topic"}. Do NOT attempt to answer off-topic requests.
${libraryContext}
Rules:
- Each exercise must have: name, nameEn (English name for reference), sets (number), reps (string like "8-12" or "10"), weight (string like "bodyweight", "moderate", or leave empty ""), restSeconds (number), notes (string with detailed form cues)
- CRITICAL: The "name" and "nameEn" fields must ONLY contain the standard exercise name (e.g. "Barbell Close Grip Bench Press"). NEVER include substitution context, reasoning, or phrases like "X is replaced with Y", "instead of X", "replaces X", or similar. If you are replacing an exercise from a previous version, just use the new exercise's clean name.
- Avoid including duplicate or overly similar exercises (e.g. do not include both Barbell Bench Press and Barbell Close Grip Bench Press in the same plan unless specifically requested). Each exercise should target the muscle group from a distinct angle or movement pattern.
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

    if (result.error === "off_topic") {
      return NextResponse.json({ error: "Please provide a fitness or exercise related request." }, { status: 400 });
    }

    // Enrich exercises with video URLs and isFromLibrary flag (with fuzzy matching)
    const exercises = result.exercises.map((ex) => {
      let videoUrl = libraryLookup.get(ex.name.toLowerCase()) || "";
      let isFromLibrary =
        exerciseNames.has(ex.name.toLowerCase()) ||
        exerciseNames.has(ex.nameEn?.toLowerCase() || "");
      let name = ex.name;

      // Fuzzy match if exact match missed
      if (!isFromLibrary) {
        const fuzzy = fuzzyMatchExercise(ex.name, filteredExercises) ||
          (ex.nameEn ? fuzzyMatchExercise(ex.nameEn, filteredExercises) : null);
        if (fuzzy) {
          name = fuzzy.exercise.name;
          videoUrl = fuzzy.exercise.videoUrl || videoUrl;
          isFromLibrary = true;
        }
      }

      if (!videoUrl && includeVideos && ex.nameEn) {
        const query = encodeURIComponent(`${ex.nameEn} exercise form how to`);
        videoUrl = `https://www.youtube.com/results?search_query=${query}`;
      }

      return { ...ex, name, videoUrl, isFromLibrary };
    });

    if (session.user.tenantId) {
      logAiUsage({ tenantId: session.user.tenantId, endpoint: "generate-workout-plan", tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, provider: usage.provider });
    }

    return NextResponse.json({ ...result, exercises });
  } catch (e) {
    console.error("AI generate-workout-plan error:", e);
    return NextResponse.json({ error: "Failed to generate workout plan" }, { status: 502 });
  }
}
