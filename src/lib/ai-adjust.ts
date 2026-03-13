import { aiJSON } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getAILanguageInstruction } from "@/lib/ai-locale";

interface ClientContext {
  name: string;
  gender: string | null;
  goals: string | null;
  notes: string | null;
  allergies: string | null;
  dietaryPrefs: string | null;
  injuries: string | null;
  fitnessLevel: string | null;
  activityLevel: string | null;
  dateOfBirth: Date | null;
  latestWeight: number | null;
  latestBodyFat: number | null;
}

async function getClientContext(clientId: string): Promise<ClientContext> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      name: true, gender: true, goals: true, notes: true, dateOfBirth: true,
      allergies: true, dietaryPrefs: true, injuries: true, fitnessLevel: true, activityLevel: true,
    },
  });

  if (!client) throw new Error("Client not found");

  const latestMeasurement = await prisma.measurement.findFirst({
    where: { clientId },
    orderBy: { date: "desc" },
    select: { weight: true, bodyFat: true },
  });

  return {
    ...client,
    latestWeight: latestMeasurement?.weight ?? null,
    latestBodyFat: latestMeasurement?.bodyFat ?? null,
  };
}

function buildClientPrompt(ctx: ClientContext): string {
  const parts: string[] = [];

  if (ctx.gender) parts.push(`Gender: ${ctx.gender}`);
  if (ctx.dateOfBirth) {
    const age = Math.floor((Date.now() - ctx.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    parts.push(`Age: ${age}`);
  }
  if (ctx.latestWeight) parts.push(`Current weight: ${ctx.latestWeight}kg`);
  if (ctx.latestBodyFat) parts.push(`Body fat: ${ctx.latestBodyFat}%`);
  if (ctx.fitnessLevel) parts.push(`Fitness level: ${ctx.fitnessLevel}`);
  if (ctx.activityLevel) parts.push(`Activity level: ${ctx.activityLevel}`);
  if (ctx.goals) parts.push(`Goals: ${ctx.goals}`);
  if (ctx.allergies) parts.push(`ALLERGIES (MUST AVOID): ${ctx.allergies}`);
  if (ctx.dietaryPrefs) parts.push(`Dietary preferences/restrictions: ${ctx.dietaryPrefs}`);
  if (ctx.injuries) parts.push(`Injuries/limitations: ${ctx.injuries}`);
  if (ctx.notes) parts.push(`Coach notes: ${ctx.notes}`);

  return parts.join("\n");
}

// ---- Meal Plan Adjustment ----

interface MealFood {
  name: string;
  portion: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface MealData {
  name: string;
  time: string | null;
  foods: MealFood[];
}

interface AdjustedMealPlan {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  meals: MealData[];
}

export async function adjustMealPlanForClient(
  clientId: string,
  plan: {
    name: string;
    targetCalories: number | null;
    targetProtein: number | null;
    targetCarbs: number | null;
    targetFat: number | null;
    meals: MealData[];
  },
  locale: string = "en"
): Promise<AdjustedMealPlan> {
  const ctx = await getClientContext(clientId);
  const clientInfo = buildClientPrompt(ctx);

  const langInstruction = getAILanguageInstruction(locale);

  const originalCalories = plan.targetCalories || 0;

  const { data: result } = await aiJSON<AdjustedMealPlan>({
    messages: [
      {
        role: "system",
        content: `You are an expert fitness nutrition coach. You are given a template meal plan and a client's profile. Adjust the meal plan to fit the client.

CLIENT PROFILE:
${clientInfo}

CRITICAL: The original plan's calorie target is sacred. Your adjusted plan MUST hit the SAME total calories (±30 kcal). If you remove a food, you MUST replace it with an alternative of equal calories — NEVER just delete foods.

ADJUSTMENT RULES:
1. Adjust calories and macros based on the client's weight, gender, age, and goals.
   - A 55kg woman cutting should NOT eat 3000 kcal or 200g protein.
   - General guidelines: protein ~1.6-2.2g per kg bodyweight, adjust calories for goal (cut/maintain/bulk).
   - If the template's calorie target is already appropriate for the client, KEEP IT. Only change if clearly wrong for their profile.
2. Replace any foods that conflict with the client's ALLERGIES with safe alternatives of EQUAL calories (this is a health/safety issue — always substitute, NEVER just remove).
3. For dietary PREFERENCES (e.g., "no pork", "no protein shakes"):
   - REPLACE with suitable alternatives of EQUAL calories (e.g., whey protein → Greek yogurt + almonds, pork → chicken/beef/turkey)
   - NEVER just remove a food — always add a replacement that matches the removed food's calories and macros
   - If the client doesn't want protein powder/shakes, replace with whole food protein sources (Greek yogurt, cottage cheese, eggs, etc.)
4. Keep the same meal structure (same number of meals, similar timing).
5. Adjust portions to match the calorie/macro targets. If you replaced foods, increase portions of other items or add foods to make up any calorie shortfall.
6. Use ONLY basic, single ingredients — never prepared meals or recipes.
7. Portions must use grams (e.g., "150g") or count for countable items (e.g., "2 eggs").
8. All macro values must be integers.
9. VERIFY: Sum all food calories across ALL meals. The total MUST be within ±30 kcal of targetCalories. If too low, ADD more food or INCREASE portions. Do NOT return a plan below target.
10. VERIFY: targetCalories ≈ targetProtein*4 + targetCarbs*4 + targetFat*9 (±30 kcal)
11. ${langInstruction}

Return a JSON object:
{
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
        content: `Adjust this meal plan for the client:\n\nPlan: ${plan.name}\nCurrent targets: ${plan.targetCalories || "not set"} kcal, ${plan.targetProtein || "?"}g protein, ${plan.targetCarbs || "?"}g carbs, ${plan.targetFat || "?"}g fat\n\nMeals:\n${plan.meals.map((m) => `${m.name} (${m.time || "no time"}):\n${(m.foods || []).map((f) => `  - ${f.name}: ${f.portion}, ${f.calories}cal, P:${f.protein} C:${f.carbs} F:${f.fat}`).join("\n")}`).join("\n\n")}`,
      },
    ],
    maxTokens: 4000,
    temperature: 0.3,
  });

  // Safety net: recalculate totals from actual food items (AI math is unreliable)
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

  // Auto-scale portions to hit the calorie target if AI undershot
  const targetCal = originalCalories || result.targetCalories;
  if (targetCal && totalCalories > 0) {
    const ratio = targetCal / totalCalories;
    // Only scale if off by more than 5%
    if (Math.abs(ratio - 1) > 0.05) {
      for (const meal of result.meals) {
        for (const food of meal.foods) {
          food.calories = Math.round((food.calories || 0) * ratio);
          food.protein = Math.round((food.protein || 0) * ratio);
          food.carbs = Math.round((food.carbs || 0) * ratio);
          food.fat = Math.round((food.fat || 0) * ratio);
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

  return {
    ...result,
    targetCalories: totalCalories,
    targetProtein: totalProtein,
    targetCarbs: totalCarbs,
    targetFat: totalFat,
  };
}

/**
 * Scale a portion string by a ratio.
 * "150g" × 1.4 → "210g"
 * "2 eggs" × 1.5 → "3 eggs"
 * "30g" × 1.4 → "40g"
 */
function scalePortionString(portion: string, ratio: number): string {
  if (!portion) return portion;

  // Gram-based: "150g", "150 g"
  const gramMatch = portion.match(/^(\d+(?:\.\d+)?)\s*g$/i);
  if (gramMatch) {
    const scaled = Math.round(parseFloat(gramMatch[1]) * ratio / 5) * 5;
    return `${scaled}g`;
  }

  // Count + unit: "2 eggs", "1 banana", "3 slices bread"
  const countMatch = portion.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (countMatch) {
    const count = parseFloat(countMatch[1]);
    const unit = countMatch[2];
    const scaled = Math.round(count * ratio * 2) / 2;
    const finalCount = Math.max(0.5, scaled);
    return `${finalCount % 1 === 0 ? finalCount.toFixed(0) : finalCount} ${unit}`;
  }

  // Gram-based with context: "150g chicken"
  const gramCtxMatch = portion.match(/^(\d+(?:\.\d+)?)\s*g\s+(.+)$/i);
  if (gramCtxMatch) {
    const scaled = Math.round(parseFloat(gramCtxMatch[1]) * ratio / 5) * 5;
    return `${scaled}g ${gramCtxMatch[2]}`;
  }

  // ml-based: "200ml", "200 ml"
  const mlMatch = portion.match(/^(\d+(?:\.\d+)?)\s*ml$/i);
  if (mlMatch) {
    const scaled = Math.round(parseFloat(mlMatch[1]) * ratio / 10) * 10;
    return `${scaled}ml`;
  }

  return portion;
}

// ---- Workout Plan Adjustment ----

interface ExerciseData {
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  restSeconds: number | null;
  notes: string | null;
}

interface AdjustedWorkoutPlan {
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    weight: string;
    restSeconds: number;
    notes: string;
  }>;
}

export async function adjustWorkoutPlanForClient(
  clientId: string,
  plan: {
    name: string;
    exercises: ExerciseData[];
  },
  locale: string = "en"
): Promise<AdjustedWorkoutPlan> {
  const ctx = await getClientContext(clientId);
  const clientInfo = buildClientPrompt(ctx);

  const langInstruction = getAILanguageInstruction(locale);

  const { data } = await aiJSON<AdjustedWorkoutPlan>({
    messages: [
      {
        role: "system",
        content: `You are an expert fitness coach. You are given a template workout plan and a client's profile. Adjust the workout to fit the client.

CLIENT PROFILE:
${clientInfo}

ADJUSTMENT RULES:
1. Adjust weights, sets, and reps based on the client's experience level, weight, gender, and goals.
   - A 55kg beginner woman should NOT be prescribed the same weights as a 90kg experienced man.
   - Use "bodyweight" for bodyweight exercises, leave weight empty ("") when the coach should determine it, or suggest reasonable starting weights.
2. NEVER remove or replace exercises — the coach chose them intentionally. If an exercise conflicts with the client's injuries/limitations, keep it but add a WARNING in the notes field (e.g., "⚠ Pažnja: klijent ima povredu ramena — razmotrite zamjenu sa coach-om").
3. Keep the same exercise count and general structure.
4. Adjust rest periods for the client's fitness level (beginners need more rest).
5. Provide detailed form notes (2-3 sentences per exercise).
6. ${langInstruction}

Return a JSON object:
{
  "exercises": [
    {
      "name": "Exercise name",
      "sets": 4,
      "reps": "8-12",
      "weight": "",
      "restSeconds": 90,
      "notes": "Detailed form cues"
    }
  ]
}`,
      },
      {
        role: "user",
        content: `Adjust this workout for the client:\n\nPlan: ${plan.name}\n\nExercises:\n${plan.exercises.map((ex, i) => `${i + 1}. ${ex.name} — ${ex.sets}x${ex.reps}, weight: ${ex.weight || "not set"}, rest: ${ex.restSeconds}s${ex.notes ? `, notes: ${ex.notes}` : ""}`).join("\n")}`,
      },
    ],
    maxTokens: 3000,
    temperature: 0.3,
  });
  return data;
}
