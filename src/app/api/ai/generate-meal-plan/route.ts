import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aiJSON } from "@/lib/ai";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { getAILanguageInstruction } from "@/lib/ai-locale";

const schema = z.object({
  prompt: z.string().min(3).max(1000),
  targetCalories: z.number().min(500).max(10000).optional(),
  numMeals: z.number().min(1).max(10).optional(),
  preferences: z.string().max(500).optional(),
  locale: z.enum(["bs", "sr", "hr", "en"]).optional().default("bs"),
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

  const langInstruction = getAILanguageInstruction(locale || "bs");

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
    const result = await aiJSON<GeneratedPlan>({
      messages: [
        {
          role: "system",
          content: `You are an expert fitness nutrition coach. Generate a complete daily meal plan based on the user's request.

CRITICAL RULES — you MUST follow these exactly:
1. Use ONLY basic, single ingredients (chicken breast, rice, oats, eggs, olive oil, banana, etc.) — NEVER prepared/combined meals, recipes, or dishes
2. Portions MUST use weight in grams (e.g. "150g", "200g", "30g") or count for countable items (e.g. "2 eggs", "1 banana"). NEVER mix units (wrong: "2 eggs" for oats)
3. Macros for each food MUST be accurate for the stated portion size. Use standard nutritional databases as reference:
   - Chicken breast: ~31g protein, 0g carbs, 3.6g fat per 100g
   - Rice (cooked): ~2.7g protein, 28g carbs, 0.3g fat per 100g
   - Eggs: ~6g protein, 0.6g carbs, 5g fat per egg (50g)
   - Oats (dry): ~13g protein, 66g carbs, 7g fat per 100g
   - Banana: ~1.1g protein, 23g carbs, 0.3g fat per 100g
4. ${calorieInstruction}
5. ${mealCountInstruction}
6. Use standard meal times (07:00, 10:00, 13:00, 16:00, 19:00, 21:00 — pick appropriate ones)
7. Each meal should have 2-5 ingredients
8. All macro values must be integers
9. VERIFY: Sum all food calories across all meals. The total MUST equal the targetCalories value (±20 kcal). If it doesn't, adjust portions until it does.
10. VERIFY: targetCalories = targetProtein*4 + targetCarbs*4 + targetFat*9 (±30 kcal)
11. Give the plan a short descriptive name
12. ${langInstruction}
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
      "name": "Meal name",
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
      maxTokens: 3000,
      temperature: 0.3,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("AI generate-meal-plan error:", e);
    return NextResponse.json({ error: "Failed to generate meal plan" }, { status: 502 });
  }
}
