import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aiJSON } from "@/lib/ai";
import { z } from "zod";
import { validateBody } from "@/lib/validations";

// On-demand verification: coaches can trigger verification for a specific log

const schema = z.object({
  nutritionLogId: z.string().min(1),
});

interface ExpectedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  reasoning: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const { nutritionLogId } = parsed.data;

  const log = await prisma.nutritionLog.findFirst({
    where: { id: nutritionLogId, client: { tenantId: session.user.tenantId } },
  });

  if (!log) return NextResponse.json({ error: "Log not found" }, { status: 404 });
  if (!log.calories && !log.protein && !log.carbs && !log.fat) {
    return NextResponse.json({ error: "No macros to verify" }, { status: 400 });
  }

  const { data: expected } = await aiJSON<ExpectedMacros>({
    messages: [
      {
        role: "system",
        content: `You are a nutrition database. Given a food description from a meal log, estimate the macronutrient values.

Rules:
- Use standard nutritional data (USDA/equivalent) for common foods
- Consider the portion size mentioned in the description
- If multiple foods are listed, sum up all macros
- All values should be integers (round to nearest whole number)
- Be conservative — if unsure about portion size, estimate a typical serving

Return a JSON object:
{
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "reasoning": "Brief explanation of your estimate"
}`,
      },
      {
        role: "user",
        content: `Meal: ${log.mealName}\nFoods: ${log.foods}`,
      },
    ],
    maxTokens: 300,
    temperature: 0.1,
  });

  const deviations: string[] = [];
  function checkDeviation(name: string, logged: number | null, exp: number) {
    if (logged === null || exp === 0) return;
    const pct = Math.abs(logged - exp) / exp;
    if (pct > 0.25) {
      deviations.push(
        `${name}: logged ${logged}, expected ~${exp} (${Math.round(pct * 100)}% off)`
      );
    }
  }

  checkDeviation("Calories", log.calories, expected.calories);
  checkDeviation("Protein", log.protein, expected.protein);
  checkDeviation("Carbs", log.carbs, expected.carbs);
  checkDeviation("Fat", log.fat, expected.fat);

  const flagged = deviations.length > 0;
  const flagReason = flagged
    ? `${deviations.join("; ")}. AI reasoning: ${expected.reasoning}`
    : null;

  const updated = await prisma.nutritionLog.update({
    where: { id: nutritionLogId },
    data: {
      verifiedAt: new Date(),
      flagged,
      flagReason,
      expectedCalories: expected.calories,
      expectedProtein: expected.protein,
      expectedCarbs: expected.carbs,
      expectedFat: expected.fat,
    },
  });

  return NextResponse.json({
    flagged,
    flagReason,
    expected: {
      calories: expected.calories,
      protein: expected.protein,
      carbs: expected.carbs,
      fat: expected.fat,
    },
    logged: {
      calories: log.calories,
      protein: log.protein,
      carbs: log.carbs,
      fat: log.fat,
    },
    reasoning: expected.reasoning,
  });
}
