import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aiJSON } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { getAILanguageInstruction, getAIExerciseNameInstruction } from "@/lib/ai-locale";
import { logAiUsage } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit";

// Allow longer execution for multi-step generation
export const maxDuration = 120;

const schema = z.object({
  type: z.enum(["workout", "nutrition"]),
  prompt: z.string().min(3).max(1000),
  generateNew: z.boolean().default(false),
  durationWeeks: z.number().min(1).max(12),
  daysPerWeek: z.number().min(1).max(8),
  locale: z.enum(["bs", "sr", "hr", "en"]).optional().default("en"),
});

// --- Types ---

interface UnifiedBlueprintPlan {
  name: string;
  prompt: string;
  source: "existing" | "generate";
}

interface UnifiedBlueprintDay {
  weekNumber: number;
  dayNumber: number;
  label: string;
  planIndex: number;
}

interface UnifiedBlueprint {
  name: string;
  description: string;
  fit: "good" | "partial" | "poor";
  missingPlans: string[];
  plans: UnifiedBlueprintPlan[];
  schedule: UnifiedBlueprintDay[];
}

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

interface GeneratedMealPlan {
  name: string;
  description: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  meals: GeneratedMeal[];
}

interface GeneratedPlanData {
  workoutData?: { name: string; description: string | null; exercises: any[] };
  mealData?: { name: string; description: string | null; targetCalories: number; targetProtein: number; targetCarbs: number; targetFat: number; meals: any[] };
  usage: { tokensIn: number; tokensOut: number; provider: string };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit("ai", session.user.tenantId);
  if (rl) return rl;

  const parsed = await validateBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const { type, prompt, generateNew, durationWeeks, daysPerWeek, locale: rawLocale } = parsed.data;
  const locale = rawLocale || "en";
  const tenantId = session.user.tenantId;

  try {
    return await handleProgram(tenantId, type, prompt, generateNew ?? false, durationWeeks, daysPerWeek, locale);
  } catch (e) {
    console.error("AI generate-full-program error:", e);
    const raw = e instanceof Error ? e.message : String(e);
    const isRateLimit = raw.includes("429") || raw.toLowerCase().includes("rate limit");
    const msg = isRateLimit
      ? "AI providers are temporarily rate-limited. Please wait a minute and try again."
      : "Failed to generate program. Please try again.";
    return NextResponse.json({ error: msg }, { status: isRateLimit ? 429 : 502 });
  }
}

// ===========================================
// Unified program builder
// ===========================================

async function handleProgram(
  tenantId: string,
  type: string,
  prompt: string,
  generateNew: boolean,
  durationWeeks: number,
  daysPerWeek: number,
  locale: string,
) {
  const langInstruction = getAILanguageInstruction(locale);
  const mealsPerDay = type === "nutrition" ? daysPerWeek : undefined;

  const totalSlots = type === "workout"
    ? durationWeeks * daysPerWeek
    : durationWeeks * 7;

  const maxUniquePlans = type === "workout"
    ? Math.min(daysPerWeek * Math.min(durationWeeks, 2), 10)
    : Math.min(5, 4);

  const planType = type === "workout" ? "workout" : "meal";
  const dayDesc = type === "workout"
    ? `${daysPerWeek} training days per week`
    : `7 days per week, ${mealsPerDay} meal(s) per day`;

  // ---- Fetch existing plans ----

  let existingPlans: { id: string; name: string; description: string | null }[] = [];

  if (type === "workout") {
    existingPlans = await prisma.workoutPlan.findMany({
      where: { tenantId, sourceTemplateId: null },
      select: { id: true, name: true, description: true },
      take: 100,
    });
  } else {
    existingPlans = await prisma.mealPlan.findMany({
      where: { tenantId, sourceTemplateId: null },
      select: { id: true, name: true, description: true },
      take: 100,
    });
  }

  const existingList = existingPlans.length > 0
    ? existingPlans.map((p) => `- "${p.name}"${p.description ? ` — ${p.description}` : ""}`).join("\n")
    : "(none)";

  // ---- Step 1: Unified blueprint with fit assessment ----

  const { data: blueprint, usage: bpUsage } = await aiJSON<UnifiedBlueprint & { error?: string }>({
    messages: [
      {
        role: "system",
        content: `You are an expert ${type === "workout" ? "fitness" : "nutrition"} coach. Design a ${planType} program blueprint.

SCOPE: You ONLY handle ${type === "workout" ? "fitness" : "nutrition"}-related requests. If unrelated, return: {"error": "off_topic"}.

EXISTING ${planType.toUpperCase()} PLANS available to the coach:
${existingList}

PROGRAM: ${durationWeeks} weeks, ${dayDesc}.
${mealsPerDay ? `Each meal plan MUST contain exactly ${mealsPerDay} meal(s). This is critical — the user specified ${mealsPerDay} meal(s) per day.` : ""}

YOUR TASK:
1. Determine what unique ${planType} plans this program needs (max ${maxUniquePlans} distinct plans).
2. Check if the EXISTING plans above cover what's needed. A plan "matches" if it is clearly suitable for a slot in the program based on its name and description.
3. Evaluate the overall fit:
   - "good" = all needed plans exist and match the request
   - "partial" = some plans match but others are missing
   - "poor" = none or almost none of the existing plans match the request
4. For each plan the program needs, set source to "existing" if a matching plan exists (use its EXACT name), or "generate" if it needs to be created.
5. "missingPlans" should list the NAMES of plans that need to be generated (human-readable, for display to the user).
6. The "prompt" field: for "existing" plans, leave empty "". For "generate" plans, write a detailed description of what that plan should contain.${mealsPerDay ? ` Every generate prompt MUST specify: "This plan must have exactly ${mealsPerDay} meal(s)."` : ""}

Rules:
- ${maxUniquePlans} or fewer unique plans total.
- Schedule ALL ${totalSlots} day slots by referencing planIndex (0-based index into the plans array).
- Label days with weekday names in the user's language.
- ${type === "workout" ? "Arrange logically — avoid same muscle group on consecutive days." : "Vary plans across days for dietary balance."}
- For "generate" plans: use specific, descriptive names (e.g. "Upper Body Push — Chest & Shoulders" instead of just "Chest Day").
- For "existing" plans: use the EXACT name from the list above.
- Be strict about matching — don't force-fit a "Full Body Kettlebell" plan when the user asked for an isolated "Shoulder Day". Only mark as "existing" if the plan genuinely fits.
- ${langInstruction}
${type === "workout" && durationWeeks > 1 ? `
WEEK-TO-WEEK VARIETY (CRITICAL):
- Do NOT repeat the exact same schedule every week. Each week should feel different.
- Create VARIANT plans that target the same muscle groups but with different exercises or emphasis.
  Example: "Upper Push A — Barbell Focus" (Week 1) and "Upper Push B — Dumbbell Focus" (Week 2).
- Rotate which variants appear on which days across weeks so no two weeks are identical.
- Aim for at least ${Math.min(daysPerWeek, 3)} variant pairs (A/B versions) to keep the program fresh.
- This is a periodized program — progressive variation across weeks is essential, not optional.` : ""}

Return JSON:
{
  "name": "Program name",
  "description": "Brief program description",
  "fit": "good" | "partial" | "poor",
  "missingPlans": ["Plan Name That Needs Generating", ...],
  "plans": [
    { "name": "Plan Name", "prompt": "...", "source": "existing" | "generate" }
  ],
  "schedule": [
    { "weekNumber": 1, "dayNumber": 1, "label": "Monday", "planIndex": 0 }
  ]
}`,
      },
      { role: "user", content: prompt },
    ],
    maxTokens: durationWeeks > 1 ? 4000 : 3000,
    temperature: 0.4,
  });

  if (blueprint.error === "off_topic") {
    return NextResponse.json({ error: `Please provide a ${type === "workout" ? "fitness" : "nutrition"}-related request.` }, { status: 400 });
  }

  logAiUsage({ tenantId, endpoint: "generate-full-program-blueprint", tokensIn: bpUsage.tokensIn, tokensOut: bpUsage.tokensOut, provider: bpUsage.provider });

  // ---- Step 2: Check if generation is needed but not allowed ----

  const plansToGenerate = blueprint.plans.filter((p) => p.source === "generate");
  const plansFromExisting = blueprint.plans.filter((p) => p.source === "existing");

  if (plansToGenerate.length > 0 && !generateNew) {
    // Return fit feedback — don't build anything yet
    return NextResponse.json({
      needsGeneration: true,
      fit: blueprint.fit,
      missingPlans: blueprint.missingPlans.length > 0
        ? blueprint.missingPlans
        : plansToGenerate.map((p) => p.name),
      existingCount: plansFromExisting.length,
      totalNeeded: blueprint.plans.length,
    });
  }

  // ---- Step 3: Resolve existing plan IDs ----

  const existingLookup = new Map(
    existingPlans.map((p) => [p.name.toLowerCase(), p.id])
  );

  // Cap plans
  const plans = blueprint.plans.slice(0, maxUniquePlans);

  // ---- Step 4: Generate missing plans into memory ----

  let libraryContext = "";
  let libraryLookup = new Map<string, string>();
  if (type === "workout") {
    const libraryExercises = await prisma.exerciseLibrary.findMany({
      where: { tenantId },
      select: { name: true, nameI18n: true, videoUrl: true, category: true },
      take: 200,
    });
    if (libraryExercises.length > 0) {
      libraryContext = `\nYou have access to the coach's exercise library. If an exercise matches one from this list, use the EXACT same name:\n${libraryExercises.map((e) => {
        const i18n = e.nameI18n as Record<string, string> | null;
        const altName = i18n ? Object.values(i18n)[0] : null;
        return `- ${e.name}${altName ? ` / ${altName}` : ""}${e.category ? ` (${e.category})` : ""}`;
      }).join("\n")}\n`;
      for (const ex of libraryExercises) {
        if (ex.videoUrl) libraryLookup.set(ex.name.toLowerCase(), ex.videoUrl);
      }
    }
  }

  // Build plan resolution: existing ID or generated data
  interface ResolvedPlan {
    existingId?: string;
    generated?: GeneratedPlanData;
  }

  const resolved: ResolvedPlan[] = [];
  let genCount = 0;

  for (let i = 0; i < plans.length; i++) {
    const planDef = plans[i];

    if (planDef.source === "existing") {
      const existingId = existingLookup.get(planDef.name.toLowerCase());
      if (existingId) {
        resolved.push({ existingId });
        continue;
      }
      // AI said "existing" but plan doesn't actually exist — fall through to generate
      console.warn(`Blueprint referenced existing plan "${planDef.name}" but it wasn't found — will generate instead`);
    }

    // Generate this plan
    if (genCount > 0) await delay(5000);
    genCount++;

    if (type === "workout") {
      const data = await generateWorkout(planDef, locale, langInstruction, libraryContext, libraryLookup);
      resolved.push({ generated: data });
    } else {
      const data = await generateMealPlan(planDef, locale, langInstruction, mealsPerDay);
      resolved.push({ generated: data });
    }
  }

  // ---- Step 5: Save everything in one transaction ----

  const existingNames = existingPlans.map((p) => p.name);
  const usedNames = new Set(existingNames.map((n) => n.toLowerCase()));

  function uniqueName(name: string): string {
    const lower = name.toLowerCase();
    if (!usedNames.has(lower)) {
      usedNames.add(lower);
      return name;
    }
    for (let n = 2; n <= 50; n++) {
      const candidate = `${name} (${n})`;
      if (!usedNames.has(candidate.toLowerCase())) {
        usedNames.add(candidate.toLowerCase());
        return candidate;
      }
    }
    return name;
  }

  const result = await prisma.$transaction(async (tx) => {
    const planIds: string[] = [];
    let plansCreated = 0;

    for (const plan of resolved) {
      if (plan.existingId) {
        planIds.push(plan.existingId);
      } else if (plan.generated) {
        const gen = plan.generated;
        if (type === "workout" && gen.workoutData) {
          const created = await tx.workoutPlan.create({
            data: {
              name: uniqueName(gen.workoutData.name),
              description: gen.workoutData.description,
              isTemplate: true,
              tenantId,
              exercises: { create: gen.workoutData.exercises },
            },
          });
          planIds.push(created.id);
          plansCreated++;
        } else if (type === "nutrition" && gen.mealData) {
          const created = await tx.mealPlan.create({
            data: {
              name: uniqueName(gen.mealData.name),
              description: gen.mealData.description,
              isTemplate: true,
              targetCalories: gen.mealData.targetCalories,
              targetProtein: gen.mealData.targetProtein,
              targetCarbs: gen.mealData.targetCarbs,
              targetFat: gen.mealData.targetFat,
              tenantId,
              meals: {
                create: gen.mealData.meals.map((meal: any, idx: number) => ({
                  name: meal.name,
                  description: meal.description || null,
                  time: meal.time || null,
                  foods: (meal.foods || []) as any,
                  orderIndex: idx,
                })),
              },
            },
          });
          planIds.push(created.id);
          plansCreated++;
        }
      }
    }

    const days = blueprint.schedule
      .filter((d) => d.planIndex >= 0 && d.planIndex < planIds.length)
      .map((d) => ({
        weekNumber: d.weekNumber,
        dayNumber: d.dayNumber,
        label: d.label || null,
        ...(type === "workout"
          ? { workoutPlanId: planIds[d.planIndex] }
          : { mealPlanId: planIds[d.planIndex] }),
      }));

    if (type === "workout") {
      const program = await tx.workoutProgram.create({
        data: {
          name: blueprint.name,
          description: blueprint.description || null,
          durationWeeks,
          daysPerWeek,
          isTemplate: true,
          tenantId,
          days: { create: days },
        },
      });
      return { programId: program.id, plansCreated };
    } else {
      const program = await tx.nutritionProgram.create({
        data: {
          name: blueprint.name,
          description: blueprint.description || null,
          durationWeeks,
          mealsPerDay: daysPerWeek,
          isTemplate: true,
          tenantId,
          days: { create: days },
        },
      });
      return { programId: program.id, plansCreated };
    }
  });

  // Log usage for generated plans
  for (const plan of resolved) {
    if (plan.generated) {
      logAiUsage({
        tenantId,
        endpoint: type === "workout" ? "generate-workout-plan" : "generate-meal-plan",
        tokensIn: plan.generated.usage.tokensIn,
        tokensOut: plan.generated.usage.tokensOut,
        provider: plan.generated.usage.provider,
      });
    }
  }

  return NextResponse.json({
    programId: result.programId,
    programName: blueprint.name,
    plansCreated: result.plansCreated,
    plansReused: resolved.filter((r) => r.existingId).length,
  });
}

// ===========================================
// AI generators (generate into memory, no DB writes)
// ===========================================

async function generateWorkout(
  planDef: UnifiedBlueprintPlan,
  locale: string,
  langInstruction: string,
  libraryContext: string,
  libraryLookup: Map<string, string>,
) {
  const exerciseNameInstruction = getAIExerciseNameInstruction(locale);

  const { data: result, usage } = await aiJSON<GeneratedWorkoutPlan>({
    messages: [
      {
        role: "system",
        content: `You are an expert fitness coach and exercise programmer. Generate a complete workout plan based on the description.
${libraryContext}
Rules:
- Each exercise must have: name, nameEn (English name for reference), sets (number), reps (string like "8-12" or "10"), weight (string like "bodyweight", "moderate", or leave empty ""), restSeconds (number), notes (string with detailed form cues)
- CRITICAL: The "name" and "nameEn" fields must ONLY contain the standard exercise name. NEVER include substitution context or phrases like "X is replaced with Y".
- Avoid duplicate or overly similar exercises.
- Include 5-10 exercises per workout
- Order exercises logically (compound first, isolation after)
- Use appropriate set/rep schemes for the goal
- Include rest periods appropriate for the training style
- The "notes" field MUST contain helpful form cues (2-3 sentences)
- ${exerciseNameInstruction}
- ${langInstruction}

Return a JSON object with this exact structure:
{
  "name": "Workout name",
  "description": "Brief description of the workout",
  "exercises": [
    {
      "name": "Exercise Name",
      "nameEn": "English Name",
      "sets": 4,
      "reps": "8-12",
      "weight": "",
      "restSeconds": 90,
      "notes": "Detailed form cues here"
    }
  ]
}`,
      },
      {
        role: "user",
        content: `Create a workout plan: ${planDef.name}. ${planDef.prompt}`,
      },
    ],
    maxTokens: 3000,
    temperature: 0.3,
  });

  const exercises = result.exercises.map((ex, idx) => {
    const libraryVideo = libraryLookup.get(ex.name.toLowerCase());
    return {
      name: ex.name,
      sets: ex.sets || null,
      reps: ex.reps || null,
      weight: ex.weight || null,
      restSeconds: ex.restSeconds || null,
      notes: ex.notes || null,
      videoUrl: libraryVideo || null,
      orderIndex: idx,
    };
  });

  return {
    workoutData: {
      name: result.name || planDef.name,
      description: result.description || null,
      exercises,
    },
    usage: { tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, provider: usage.provider },
  };
}

async function generateMealPlan(
  planDef: UnifiedBlueprintPlan,
  locale: string,
  langInstruction: string,
  numMeals?: number,
) {
  const mealCountInstruction = numMeals
    ? `Create exactly ${numMeals} meal(s). This is a strict requirement — do NOT add extra meals.`
    : "Default to 3 meals (breakfast, lunch, dinner).";

  const { data: result, usage } = await aiJSON<GeneratedMealPlan>({
    messages: [
      {
        role: "system",
        content: `You are an expert fitness nutrition coach. Generate a complete daily meal plan based on the description.

CRITICAL RULES:
1. ${mealCountInstruction}
2. Each meal represents a MEAL TIME (breakfast, lunch, dinner, snack). Give it a descriptive name.
3. Meal "name" and food "name" fields must ONLY contain the standard name. NEVER include substitution phrases.
4. Each meal MUST have a short "description" field (1-2 sentences).
5. Avoid duplicate or overly similar meals or food items.
6. A meal can include MULTIPLE dishes and foods to hit calorie targets.
7. List ALL individual food items in the "foods" array. Use basic single ingredients.
8. Portions MUST use weight in grams (e.g. "150g", "200g") or count (e.g. "2 eggs").
9. Macros must be accurate for the stated portion size.
10. Each meal should have 3-8 food items.
11. All macro values must be integers.
12. VERIFY: Sum all food calories. Total MUST be within ±30 kcal of targetCalories.
13. VERIFY: targetCalories = targetProtein*4 + targetCarbs*4 + targetFat*9 (±30 kcal)
14. Give the plan a short descriptive name.
15. ${langInstruction}

Return JSON:
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
      "description": "Short prep instructions",
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
        content: `Create a meal plan: ${planDef.name}. ${planDef.prompt}`,
      },
    ],
    maxTokens: 4000,
    temperature: 0.3,
  });

  // Recalculate totals from actual food items
  let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
  for (const meal of result.meals) {
    for (const food of meal.foods) {
      totalCalories += food.calories || 0;
      totalProtein += food.protein || 0;
      totalCarbs += food.carbs || 0;
      totalFat += food.fat || 0;
    }
  }

  // Auto-scale portions if off by more than 5%
  const target = result.targetCalories;
  if (target && totalCalories > 0) {
    const ratio = target / totalCalories;
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
      totalCalories = 0; totalProtein = 0; totalCarbs = 0; totalFat = 0;
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
    mealData: {
      name: result.name || planDef.name,
      description: result.description || null,
      targetCalories: totalCalories,
      targetProtein: totalProtein,
      targetCarbs: totalCarbs,
      targetFat: totalFat,
      meals: result.meals,
    },
    usage: { tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, provider: usage.provider },
  };
}

// ===========================================
// Utility
// ===========================================

function scalePortionString(portion: string, ratio: number): string {
  if (!portion) return portion;

  const gramMatch = portion.match(/^(\d+(?:\.\d+)?)\s*g$/i);
  if (gramMatch) {
    const scaled = Math.round(parseFloat(gramMatch[1]) * ratio / 5) * 5;
    return `${scaled}g`;
  }

  const countMatch = portion.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (countMatch) {
    const count = parseFloat(countMatch[1]);
    const unit = countMatch[2];
    const scaled = Math.round(count * ratio * 2) / 2;
    const finalCount = Math.max(0.5, scaled);
    return `${finalCount % 1 === 0 ? finalCount.toFixed(0) : finalCount} ${unit}`;
  }

  const gramCtxMatch = portion.match(/^(\d+(?:\.\d+)?)\s*g\s+(.+)$/i);
  if (gramCtxMatch) {
    const scaled = Math.round(parseFloat(gramCtxMatch[1]) * ratio / 5) * 5;
    return `${scaled}g ${gramCtxMatch[2]}`;
  }

  const mlMatch = portion.match(/^(\d+(?:\.\d+)?)\s*ml$/i);
  if (mlMatch) {
    const scaled = Math.round(parseFloat(mlMatch[1]) * ratio / 10) * 10;
    return `${scaled}ml`;
  }

  return portion;
}
