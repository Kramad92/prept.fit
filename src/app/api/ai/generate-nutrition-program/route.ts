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
  mealsPerDay: z.number().min(1).max(8),
});

interface GeneratedDay {
  weekNumber: number;
  dayNumber: number;
  label: string;
  mealPlanName: string;
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

  const { prompt, locale, durationWeeks, mealsPerDay } = parsed.data;

  // Fetch existing meal plan templates for this coach
  const mealPlans = await prisma.mealPlan.findMany({
    where: { tenantId: session.user.tenantId, sourceTemplateId: null },
    select: { id: true, name: true, description: true, _count: { select: { meals: true } } },
    take: 100,
  });

  if (mealPlans.length === 0) {
    return NextResponse.json(
      { error: "No meal plans available. Create some meal plans first." },
      { status: 400 }
    );
  }

  const mealPlanList = mealPlans
    .map((m) => `- "${m.name}"${m.description ? ` — ${m.description}` : ""} (${m._count.meals} meals)`)
    .join("\n");

  const langInstruction = getAILanguageInstruction(locale || "en");

  try {
    const { data: result, usage } = await aiJSON<GeneratedProgram & { error?: string }>({
      messages: [
        {
          role: "system",
          content: `You are an expert nutrition coach. Generate a nutrition program schedule by selecting from the coach's EXISTING meal plans.

SCOPE: You ONLY handle requests related to nutrition, diet, and meal planning. If the user's request is clearly unrelated (e.g. coding, math homework, general knowledge, writing essays), return ONLY this JSON: {"error": "off_topic"}. Do NOT attempt to answer off-topic requests.

AVAILABLE MEAL PLANS:
${mealPlanList}

PROGRAM PARAMETERS:
- Duration: ${durationWeeks} weeks
- Meals per day: ${mealsPerDay}

Rules:
- You MUST only use meal plan names EXACTLY as they appear in the list above. Do NOT invent new meal plan names.
- Assign one meal plan per day slot (weekNumber 1-${durationWeeks}, dayNumber 1-7 for all 7 days of the week)
- Each day needs a label — use the day of the week (e.g. "Monday", "Tuesday", etc.) in the user's language
- Arrange meal plans logically — vary plans across days for dietary balance
- You can repeat meal plans across different days and weeks
- If there are fewer meal plans than day slots, reuse them in a logical rotation
- ${langInstruction}

Return a JSON object with this exact structure:
{
  "name": "Program name",
  "description": "Brief program description",
  "days": [
    { "weekNumber": 1, "dayNumber": 1, "label": "Monday", "mealPlanName": "Exact Meal Plan Name From List" },
    { "weekNumber": 1, "dayNumber": 2, "label": "Tuesday", "mealPlanName": "Exact Meal Plan Name From List" }
  ]
}

Include ALL ${durationWeeks * 7} day slots in the response.`,
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
      return NextResponse.json({ error: "Please provide a nutrition or diet related request." }, { status: 400 });
    }

    // Build a lookup map from meal plan name to ID (case-insensitive)
    const mealPlanLookup = new Map<string, string>();
    for (const m of mealPlans) {
      mealPlanLookup.set(m.name.toLowerCase(), m.id);
    }

    // Map AI-generated meal plan names to actual IDs
    const days = result.days.map((day) => {
      const mealPlanId = mealPlanLookup.get(day.mealPlanName.toLowerCase());
      return {
        weekNumber: day.weekNumber,
        dayNumber: day.dayNumber,
        label: day.label,
        mealPlanId: mealPlanId || null,
        mealPlanName: mealPlanId ? day.mealPlanName : null,
      };
    });

    if (session.user.tenantId) {
      logAiUsage({ tenantId: session.user.tenantId, endpoint: "generate-nutrition-program", tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, provider: usage.provider });
    }

    return NextResponse.json({
      name: result.name,
      description: result.description,
      days,
    });
  } catch (e) {
    console.error("AI generate-nutrition-program error:", e);
    return NextResponse.json({ error: "Failed to generate program" }, { status: 502 });
  }
}
