import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aiJSON } from "@/lib/ai";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { getAILanguageInstruction } from "@/lib/ai-locale";
import { logAiUsage } from "@/lib/usage";

const schema = z.object({
  prompt: z.string().min(3).max(1000),
  targetCalories: z.number().min(500).max(10000).optional(),
  numMeals: z.number().min(1).max(10).optional(),
  preferences: z.string().max(500).optional(),
  locale: z.enum(["bs", "sr", "hr", "en"]).optional().default("en"),
});

interface GeneratedFood {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface GeneratedMeal {
  name: string;
  description: string;
  time: string;
  foods: GeneratedFood[];
}

interface GeneratedPlan {
  name: string;
  description: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  meals: GeneratedMeal[];
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const { prompt, targetCalories, numMeals, preferences, locale } = parsed.data;

  const langInstruction = getAILanguageInstruction(locale || "en");

  const calorieInstruction = targetCalories
    ? `The TOTAL daily calories MUST be exactly ${targetCalories} kcal. Distribute them across all meals.`
    : "Extract the calorie target from the user's request. If none specified, estimate appropriate daily calories.";

  const mealCountInstruction = numMeals
    ? `Create exactly ${numMeals} meals.`
    : "Extract the number of meals from the user's request. If not specified, default to 3 meals (breakfast, lunch, dinner).";

  const prefInstruction = preferences
    ? `Additional preferences: ${preferences}`
    : "";

  try {
    const result = await aiJSON<GeneratedPlan & { error?: string }>({
      messages: [
        {
          role: "system",
          content: `You are an expert fitness nutrition coach. Generate a complete daily meal plan based on the user's request.

SCOPE: You ONLY handle requests related to fitness, nutrition, meal planning, diet, and health. If the user's request is clearly unrelated (e.g. coding, math homework, general knowledge, writing essays), return ONLY this JSON: {"error": "off_topic"}. Do NOT attempt to answer off-topic requests.

CRITICAL RULES — you MUST follow these exactly:
1. Each meal represents a MEAL TIME (breakfast, lunch, dinner, snack). Give it a descriptive name (e.g. "Breakfast — Eggs & Oatmeal", "Lunch — Steak & Potatoes", "Dinner — Pasta Bolognese").
2. Each meal MUST have a short "description" field (1-2 sentences) describing what to eat or how to prepare it.
3. A meal can (and often SHOULD) include MULTIPLE dishes and foods to hit calorie targets. For example, breakfast might include eggs, sausage, toast, AND a protein shake. Lunch might include steak, potatoes, a side salad, AND a dessert. Think of it as everything you eat at that meal time.
4. List ALL individual food items in the "foods" array. Use basic, single ingredients for accurate macro tracking (chicken breast, rice, oats, eggs, olive oil, banana, protein powder, etc.).
5. Portions MUST use weight in grams (e.g. "150g", "200g", "30g") or count for countable items (e.g. "2 eggs", "1 banana").
6. Macros for each food MUST be accurate for the stated portion size. Use standard nutritional databases as reference:
   - Chicken breast: ~31g protein, 0g carbs, 3.6g fat per 100g
   - Rice (cooked): ~2.7g protein, 28g carbs, 0.3g fat per 100g
   - Eggs: ~6g protein, 0.6g carbs, 5g fat per egg (50g)
   - Oats (dry): ~13g protein, 66g carbs, 7g fat per 100g
   - Banana: ~1.1g protein, 23g carbs, 0.3g fat per 100g
   - Protein powder (whey): ~24g protein, 3g carbs, 1g fat per scoop (30g)
7. ${calorieInstruction}
8. ${mealCountInstruction}
9. Use standard meal times (07:00, 10:00, 13:00, 16:00, 19:00, 21:00 — pick appropriate ones)
10. Each meal should have 3-8 food items. Use MORE items and LARGER portions to hit higher calorie targets. A 2200 kcal plan needs substantial meals — don't be conservative with portions.
11. All macro values must be integers
12. VERIFY: Sum all food calories across all meals. The total MUST be within ±30 kcal of targetCalories. If it's too low, ADD more foods or INCREASE portions until it matches. Do NOT return a plan that is hundreds of calories below target.
13. VERIFY: targetCalories = targetProtein*4 + targetCarbs*4 + targetFat*9 (±30 kcal)
14. Give the plan a short descriptive name
15. ${langInstruction}
${prefInstruction}

Return a JSON object with this exact structure:
{
  "name": "Plan name",
  "description": "Brief description",
  "targetCalories": number,
  "targetProtein": number,
  "targetCarbs": number,
  "targetFat": number,
  "meals": [
    {
      "name": "Dish name (e.g. Grilled Chicken & Rice Bowl)",
      "description": "Short prep instructions or description of the dish",
      "time": "HH:MM",
      "foods": [
        { "name": "Food", "portion": "150g", "calories": 200, "protein": 30, "carbs": 0, "fat": 8 }
      ]
    }
  ]
}`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      maxTokens: 4000,
      temperature: 0.3,
    });

    if (result.error === "off_topic") {
      return NextResponse.json({ error: "Please provide a fitness or nutrition related request." }, { status: 400 });
    }

    // Recalculate totals from actual food items — AI math is unreliable
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    for (const meal of result.meals) {
      for (const food of meal.foods) {
        totalCalories += food.calories || 0;
        totalProtein += food.protein || 0;
        totalCarbs += food.carbs || 0;
        totalFat += food.fat || 0;
      }
    }

    // Auto-scale portions to hit the calorie target (AI can't do math)
    if (targetCalories && totalCalories > 0) {
      const ratio = targetCalories / totalCalories;
      // Only scale if off by more than 5%
      if (Math.abs(ratio - 1) > 0.05) {
        for (const meal of result.meals) {
          for (const food of meal.foods) {
            // Scale macros
            food.calories = Math.round((food.calories || 0) * ratio);
            food.protein = Math.round((food.protein || 0) * ratio);
            food.carbs = Math.round((food.carbs || 0) * ratio);
            food.fat = Math.round((food.fat || 0) * ratio);

            // Scale portions
            food.portion = scalePortionString(food.portion, ratio);
          }
        }
        // Recalculate after scaling
        totalCalories = 0;
        totalProtein = 0;
        totalCarbs = 0;
        totalFat = 0;
        for (const meal of result.meals) {
          for (const food of meal.foods) {
            totalCalories += food.calories || 0;
            totalProtein += food.protein || 0;
            totalCarbs += food.carbs || 0;
            totalFat += food.fat || 0;
          }
        }
      }
    }

    if (session.user.tenantId) {
      logAiUsage({ tenantId: session.user.tenantId, endpoint: "generate-meal-plan", provider: process.env.AI_PROVIDER || "groq" });
    }

    return NextResponse.json({
      ...result,
      targetCalories: totalCalories,
      targetProtein: totalProtein,
      targetCarbs: totalCarbs,
      targetFat: totalFat,
    });
  } catch (e) {
    console.error("AI generate-meal-plan error:", e);
    return NextResponse.json({ error: "Failed to generate meal plan" }, { status: 502 });
  }
}

/**
 * Scale a portion string by a ratio.
 * "150g" × 1.4 → "210g"
 * "2 eggs" × 1.5 → "3 eggs"
 * "1 banana" × 2 → "2 bananas"
 * "30g" × 1.4 → "40g"
 */
function scalePortionString(portion: string, ratio: number): string {
  if (!portion) return portion;

  // Gram-based: "150g", "150 g"
  const gramMatch = portion.match(/^(\d+(?:\.\d+)?)\s*g$/i);
  if (gramMatch) {
    const scaled = Math.round(parseFloat(gramMatch[1]) * ratio / 5) * 5; // Round to nearest 5g
    return `${scaled}g`;
  }

  // Count + unit: "2 eggs", "1 banana", "3 slices bread"
  const countMatch = portion.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (countMatch) {
    const count = parseFloat(countMatch[1]);
    const unit = countMatch[2];
    const scaled = Math.round(count * ratio * 2) / 2; // Round to nearest 0.5
    const finalCount = Math.max(0.5, scaled);
    return `${finalCount % 1 === 0 ? finalCount.toFixed(0) : finalCount} ${unit}`;
  }

  // Gram-based with context: "150g chicken" → just scale the number
  const gramCtxMatch = portion.match(/^(\d+(?:\.\d+)?)\s*g\s+(.+)$/i);
  if (gramCtxMatch) {
    const scaled = Math.round(parseFloat(gramCtxMatch[1]) * ratio / 5) * 5;
    return `${scaled}g ${gramCtxMatch[2]}`;
  }

  // ml-based: "200ml", "200 ml"
  const mlMatch = portion.match(/^(\d+(?:\.\d+)?)\s*ml$/i);
  if (mlMatch) {
    const scaled = Math.round(parseFloat(mlMatch[1]) * ratio / 10) * 10; // Round to nearest 10ml
    return `${scaled}ml`;
  }

  return portion; // Can't parse — return as-is
}
