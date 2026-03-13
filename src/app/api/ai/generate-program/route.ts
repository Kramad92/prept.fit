import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aiJSON } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { getAILanguageInstruction } from "@/lib/ai-locale";
import { logAiUsage } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  prompt: z.string().min(3).max(1000),
  locale: z.enum(["bs", "sr", "hr", "en"]).optional().default("en"),
  durationWeeks: z.number().min(1).max(52),
  daysPerWeek: z.number().min(1).max(7),
});

interface GeneratedDay {
  weekNumber: number;
  dayNumber: number;
  label: string;
  workoutName: string;
}

interface GeneratedProgram {
  name: string;
  description: string;
  days: GeneratedDay[];
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit("ai", session.user.tenantId);
  if (rl) return rl;

  const parsed = await validateBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const { prompt, locale, durationWeeks, daysPerWeek } = parsed.data;

  // Fetch existing workout templates for this coach
  const workouts = await prisma.workoutPlan.findMany({
    where: { tenantId: session.user.tenantId, sourceTemplateId: null },
    select: { id: true, name: true, description: true, _count: { select: { exercises: true } } },
    take: 100,
  });

  if (workouts.length === 0) {
    return NextResponse.json(
      { error: "No workouts available. Create some workouts first." },
      { status: 400 }
    );
  }

  const workoutList = workouts
    .map((w) => `- "${w.name}"${w.description ? ` — ${w.description}` : ""} (${w._count.exercises} exercises)`)
    .join("\n");

  const langInstruction = getAILanguageInstruction(locale || "en");

  try {
    const { data: result, usage } = await aiJSON<GeneratedProgram & { error?: string }>({
      messages: [
        {
          role: "system",
          content: `You are an expert fitness coach. Generate a workout program schedule by selecting from the coach's EXISTING workouts.

SCOPE: You ONLY handle requests related to fitness, exercise programming, and workout scheduling. If the user's request is clearly unrelated (e.g. coding, math homework, general knowledge, writing essays), return ONLY this JSON: {"error": "off_topic"}. Do NOT attempt to answer off-topic requests.

AVAILABLE WORKOUTS:
${workoutList}

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
- ${langInstruction}

Return a JSON object with this exact structure:
{
  "name": "Program name",
  "description": "Brief program description",
  "days": [
    { "weekNumber": 1, "dayNumber": 1, "label": "Monday", "workoutName": "Exact Workout Name From List" },
    { "weekNumber": 1, "dayNumber": 2, "label": "Wednesday", "workoutName": "Exact Workout Name From List" }
  ]
}

Include ALL ${durationWeeks * daysPerWeek} day slots in the response.`,
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

    // Build a lookup map from workout name to ID (case-insensitive)
    const workoutLookup = new Map<string, string>();
    for (const w of workouts) {
      workoutLookup.set(w.name.toLowerCase(), w.id);
    }

    // Map AI-generated workout names to actual IDs
    const days = result.days.map((day) => {
      const workoutId = workoutLookup.get(day.workoutName.toLowerCase());
      return {
        weekNumber: day.weekNumber,
        dayNumber: day.dayNumber,
        label: day.label,
        workoutPlanId: workoutId || null,
        workoutName: workoutId ? day.workoutName : null,
      };
    });

    if (session.user.tenantId) {
      logAiUsage({ tenantId: session.user.tenantId, endpoint: "generate-program", tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, provider: usage.provider });
    }

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
