import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aiJSON } from "@/lib/ai";
import { z } from "zod";
import { validateBody } from "@/lib/validations";

const schema = z.object({
  prompt: z.string().min(3).max(1000),
  preferences: z.string().max(500).optional(),
  locale: z.enum(["bs", "en"]).optional().default("bs"),
});

interface GeneratedExercise {
  name: string;
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

  const { prompt, preferences, locale } = parsed.data;

  const prefInstruction = preferences
    ? `Additional preferences/constraints: ${preferences}`
    : "";

  const langInstruction = locale === "bs"
    ? "IMPORTANT: ALL text output (workout name, description, exercise names, notes) MUST be in Bosnian/Croatian/Serbian language. Example exercise names: Bench press (potisak s klupe), Čučanj, Mrtvo dizanje, Povlačenje na lat spravi, Sklekovi, Zgibovi."
    : "ALL text output must be in English.";

  try {
    const result = await aiJSON<GeneratedWorkoutPlan>({
      messages: [
        {
          role: "system",
          content: `You are an expert fitness coach and exercise programmer. Generate a complete workout plan based on the user's request.

Rules:
- Use standard exercise names (Barbell Bench Press, Squat, Deadlift, Lat Pulldown, etc.)
- Each exercise must have: name, sets (number), reps (string like "8-12" or "10"), weight (string like "bodyweight", "moderate", or leave empty ""), restSeconds (number), notes (brief form cues or empty string)
- Include 5-10 exercises per workout
- Order exercises logically (compound first, isolation after)
- Use appropriate set/rep schemes for the goal (strength: 3-5x3-5, hypertrophy: 3-4x8-12, endurance: 2-3x15-20)
- Include rest periods appropriate for the training style
- Add brief form notes for complex lifts
- ${langInstruction}
${prefInstruction}

Return a JSON object with this exact structure:
{
  "name": "Workout name",
  "description": "Brief description of the workout",
  "exercises": [
    {
      "name": "Exercise name",
      "sets": 4,
      "reps": "8-12",
      "weight": "",
      "restSeconds": 90,
      "notes": "Keep elbows tucked"
    }
  ]
}`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      maxTokens: 2048,
      temperature: 0.5,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("AI generate-workout-plan error:", e);
    return NextResponse.json({ error: "Failed to generate workout plan" }, { status: 502 });
  }
}
