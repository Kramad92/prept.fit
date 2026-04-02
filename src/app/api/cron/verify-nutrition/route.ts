import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiJSON } from "@/lib/ai";

// Vercel Cron handler — runs every 6 hours to verify nutrition log macros
// Protected by CRON_SECRET to prevent unauthorized access

interface ExpectedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  reasoning: string;
}

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this automatically for cron jobs)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  // Find unverified logs from the last 6 hours that have at least one macro
  const logs = await prisma.nutritionLog.findMany({
    where: {
      verifiedAt: null,
      createdAt: { gte: sixHoursAgo },
      OR: [
        { calories: { not: null } },
        { protein: { not: null } },
        { carbs: { not: null } },
        { fat: { not: null } },
      ],
    },
    select: {
      id: true,
      mealName: true,
      foods: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      clientId: true,
      client: { select: { tenantId: true } },
    },
    take: 30, // Process max 30 per run to stay within serverless timeout
  });

  if (logs.length === 0) {
    return NextResponse.json({ verified: 0, flagged: 0 });
  }

  let verified = 0;
  let flagged = 0;

  for (const log of logs) {
    try {
      const expected = await aiJSON<ExpectedMacros>({
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

      // Check deviations > 25%
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

      const isFlagged = deviations.length > 0;
      const flagReason = isFlagged
        ? `${deviations.join("; ")}. AI reasoning: ${expected.reasoning}`
        : null;

      await prisma.nutritionLog.update({
        where: { id: log.id },
        data: {
          verifiedAt: new Date(),
          flagged: isFlagged,
          flagReason,
          expectedCalories: expected.calories,
          expectedProtein: expected.protein,
          expectedCarbs: expected.carbs,
          expectedFat: expected.fat,
        },
      });

      verified++;
      if (isFlagged) flagged++;
    } catch (err) {
      console.error(`[cron] Failed to verify nutrition log ${log.id}:`, err);
      // Continue processing other logs
    }
  }

  return NextResponse.json({ verified, flagged, total: logs.length });
}
