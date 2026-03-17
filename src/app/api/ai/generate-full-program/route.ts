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
  source: z.enum(["existing", "generate"]),
  durationWeeks: z.number().min(1).max(12),
  daysPerWeek: z.number().min(1).max(8),
  locale: z.enum(["bs", "sr", "hr", "en"]).optional().default("en"),
});

// --- Types ---

interface BlueprintPlan {
  name: string;
  prompt: string;
}

interface BlueprintDay {
  weekNumber: number;
  dayNumber: number;
  label: string;
  planIndex: number;
}

interface Blueprint {
  name: string;
  description: string;
  plans: BlueprintPlan[];
  schedule: BlueprintDay[];
}

interface ExistingDay {
  weekNumber: number;
  dayNumber: number;
  label: string;
  workoutName?: string;
  mealPlanName?: string;
}

interface ExistingResult {
  name: string;
  description: string;
  days: ExistingDay[];
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

  const { type, prompt, source, durationWeeks, daysPerWeek, locale: rawLocale } = parsed.data;
  const locale = rawLocale || "en";

  try {
    if (source === "existing") {
      return await handleExisting(session, type, prompt, durationWeeks, daysPerWeek, locale);
    } else {
      return await handleGenerate(session, type, prompt, durationWeeks, daysPerWeek, locale);
    }
  } catch (e) {
    console.error("AI generate-full-program error:", e);
    const msg = e instanceof Error ? e.message : "Failed to generate program";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

// ===========================================
// SOURCE: "existing" — single AI call, select from existing plans, create program
// ===========================================

async function handleExisting(
  session: any,
  type: string,
  prompt: string,
  durationWeeks: number,
  daysPerWeek: number,
  locale: string,
) {
  const tenantId = session.user.tenantId;
  const langInstruction = getAILanguageInstruction(locale);

  if (type === "workout") {
    const workouts = await prisma.workoutPlan.findMany({
      where: { tenantId, sourceTemplateId: null },
      select: { id: true, name: true, description: true, _count: { select: { exercises: true } } },
      take: 100,
    });

    if (workouts.length === 0) {
      return NextResponse.json({ error: "No workouts available. Create some workouts first, or use 'Generate new'." }, { status: 400 });
    }

    const workoutList = workouts
      .map((w) => `- "${w.name}"${w.description ? ` — ${w.description}` : ""} (${w._count.exercises} exercises)`)
      .join("\n");

    const { data: result, usage } = await aiJSON<ExistingResult & { error?: string }>({
      messages: [
        {
          role: "system",
          content: `You are an expert fitness coach. Generate a workout program schedule by selecting from the coach's EXISTING workouts.

SCOPE: You ONLY handle fitness-related requests. If unrelated, return: {"error": "off_topic"}.

AVAILABLE WORKOUTS:
${workoutList}

PROGRAM: ${durationWeeks} weeks, ${daysPerWeek} days/week.

Rules:
- Use workout names EXACTLY as listed. Do NOT invent new names.
- Assign one workout per day slot (weekNumber 1-${durationWeeks}, dayNumber 1-${daysPerWeek})
- Label each day (Monday, Tuesday, etc.) in the user's language
- Arrange logically — avoid same muscle group on consecutive days
- Reuse workouts across weeks if needed
- ${langInstruction}

Return JSON: { "name": "...", "description": "...", "days": [{ "weekNumber": 1, "dayNumber": 1, "label": "Monday", "workoutName": "Exact Name" }] }
Include ALL ${durationWeeks * daysPerWeek} day slots.`,
        },
        { role: "user", content: prompt },
      ],
      maxTokens: 3000,
      temperature: 0.3,
    });

    if (result.error === "off_topic") {
      return NextResponse.json({ error: "Please provide a fitness-related request." }, { status: 400 });
    }

    const workoutLookup = new Map(workouts.map((w) => [w.name.toLowerCase(), w.id]));
    const days = result.days.map((d) => ({
      weekNumber: d.weekNumber,
      dayNumber: d.dayNumber,
      label: d.label,
      workoutPlanId: workoutLookup.get(d.workoutName?.toLowerCase() || "") || null,
    }));

    const program = await prisma.workoutProgram.create({
      data: {
        name: result.name,
        description: result.description || null,
        durationWeeks,
        daysPerWeek,
        isTemplate: true,
        tenantId,
        days: { create: days.filter((d) => d.workoutPlanId) },
      },
    });

    logAiUsage({ tenantId, endpoint: "generate-full-program", tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, provider: usage.provider });

    return NextResponse.json({ programId: program.id, programName: result.name, plansCreated: 0 });
  } else {
    // nutrition — existing
    const mealPlans = await prisma.mealPlan.findMany({
      where: { tenantId, sourceTemplateId: null },
      select: { id: true, name: true, description: true, _count: { select: { meals: true } } },
      take: 100,
    });

    if (mealPlans.length === 0) {
      return NextResponse.json({ error: "No meal plans available. Create some meal plans first, or use 'Generate new'." }, { status: 400 });
    }

    const planList = mealPlans
      .map((m) => `- "${m.name}"${m.description ? ` — ${m.description}` : ""} (${m._count.meals} meals)`)
      .join("\n");

    const { data: result, usage } = await aiJSON<ExistingResult & { error?: string }>({
      messages: [
        {
          role: "system",
          content: `You are an expert nutrition coach. Generate a nutrition program schedule by selecting from the coach's EXISTING meal plans.

SCOPE: You ONLY handle nutrition-related requests. If unrelated, return: {"error": "off_topic"}.

AVAILABLE MEAL PLANS:
${planList}

PROGRAM: ${durationWeeks} weeks, 7 days/week.

Rules:
- Use meal plan names EXACTLY as listed. Do NOT invent new names.
- Assign one meal plan per day (weekNumber 1-${durationWeeks}, dayNumber 1-7)
- Label each day (Monday–Sunday) in the user's language
- Vary plans across days for dietary balance
- Reuse if fewer plans than days
- ${langInstruction}

Return JSON: { "name": "...", "description": "...", "days": [{ "weekNumber": 1, "dayNumber": 1, "label": "Monday", "mealPlanName": "Exact Name" }] }
Include ALL ${durationWeeks * 7} day slots.`,
        },
        { role: "user", content: prompt },
      ],
      maxTokens: 3000,
      temperature: 0.3,
    });

    if (result.error === "off_topic") {
      return NextResponse.json({ error: "Please provide a nutrition-related request." }, { status: 400 });
    }

    const planLookup = new Map(mealPlans.map((m) => [m.name.toLowerCase(), m.id]));
    const days = result.days.map((d) => ({
      weekNumber: d.weekNumber,
      dayNumber: d.dayNumber,
      label: d.label,
      mealPlanId: planLookup.get(d.mealPlanName?.toLowerCase() || "") || null,
    }));

    const program = await prisma.nutritionProgram.create({
      data: {
        name: result.name,
        description: result.description || null,
        durationWeeks,
        mealsPerDay: daysPerWeek,
        isTemplate: true,
        tenantId,
        days: { create: days.filter((d) => d.mealPlanId) },
      },
    });

    logAiUsage({ tenantId, endpoint: "generate-full-program", tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, provider: usage.provider });

    return NextResponse.json({ programId: program.id, programName: result.name, plansCreated: 0 });
  }
}

// ===========================================
// SOURCE: "generate" — full server-side orchestration
// Blueprint → generate each plan → save to DB → create program
// ===========================================

async function handleGenerate(
  session: any,
  type: string,
  prompt: string,
  durationWeeks: number,
  daysPerWeek: number,
  locale: string,
) {
  const tenantId = session.user.tenantId;
  const langInstruction = getAILanguageInstruction(locale);

  // For nutrition, daysPerWeek is mealsPerDay
  const mealsPerDay = type === "nutrition" ? daysPerWeek : undefined;

  const totalSlots = type === "workout"
    ? durationWeeks * daysPerWeek
    : durationWeeks * 7;

  // Cap unique plans to something sensible
  const maxPlans = type === "workout"
    ? Math.min(daysPerWeek, 5)
    : Math.min(5, 4);

  const planType = type === "workout" ? "workout" : "meal";
  const dayDesc = type === "workout"
    ? `${daysPerWeek} training days per week`
    : `7 days per week, ${mealsPerDay} meal(s) per day`;

  // ---- Step 1: Generate blueprint ----

  const { data: blueprint, usage: bpUsage } = await aiJSON<Blueprint & { error?: string }>({
    messages: [
      {
        role: "system",
        content: `You are an expert ${type === "workout" ? "fitness" : "nutrition"} coach. Design a ${planType} program blueprint.

SCOPE: You ONLY handle ${type === "workout" ? "fitness" : "nutrition"}-related requests. If unrelated, return: {"error": "off_topic"}.

You need to determine:
1. What unique ${planType} plans to create (maximum ${maxPlans} distinct plans)
2. How to schedule them across the program

PROGRAM: ${durationWeeks} weeks, ${dayDesc}.
${mealsPerDay ? `Each meal plan MUST contain exactly ${mealsPerDay} meal(s). This is critical — the user specified ${mealsPerDay} meal(s) per day.` : ""}

Rules:
- Create ${maxPlans} or fewer unique plans. Each plan will be fully generated with ${type === "workout" ? "exercises" : "meals and foods"}.
- The "prompt" field for each plan should be a detailed description of what that ${planType} plan should contain (target muscles, style, intensity, etc for workouts; calorie target, meal types, dietary focus for nutrition).${mealsPerDay ? ` Every plan prompt MUST specify: "This plan must have exactly ${mealsPerDay} meal(s)."` : ""}
- Schedule ALL ${totalSlots} day slots by referencing planIndex (0-based index into the plans array).
- Label days with weekday names in the user's language.
- ${type === "workout" ? "Arrange logically — avoid same muscle group on consecutive days." : "Vary plans across days for dietary balance."}
- CRITICAL: The "name" field for each plan must be a clean, standard name. No substitution phrases.
- Avoid duplicate or overly similar plans. Each plan should be distinct.
- ${langInstruction}

Return JSON:
{
  "name": "Program name",
  "description": "Brief program description",
  "plans": [
    { "name": "Plan Name", "prompt": "Detailed description for generating this plan..." }
  ],
  "schedule": [
    { "weekNumber": 1, "dayNumber": 1, "label": "Monday", "planIndex": 0 }
  ]
}`,
      },
      { role: "user", content: prompt },
    ],
    maxTokens: 3000,
    temperature: 0.3,
  });

  if (blueprint.error === "off_topic") {
    return NextResponse.json({ error: `Please provide a ${type === "workout" ? "fitness" : "nutrition"}-related request.` }, { status: 400 });
  }

  logAiUsage({ tenantId, endpoint: "generate-full-program-blueprint", tokensIn: bpUsage.tokensIn, tokensOut: bpUsage.tokensOut, provider: bpUsage.provider });

  // Cap plans
  const plans = blueprint.plans.slice(0, maxPlans);

  // ---- Step 2: Generate and save each plan ----

  // Pre-fetch exercise library once for workout type
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

  const planIds: string[] = [];

  for (let i = 0; i < plans.length; i++) {
    // Space out AI calls to avoid rate limits (provider rotation handles distribution)
    if (i > 0) await delay(5000);

    const planDef = plans[i];

    if (type === "workout") {
      const planId = await generateAndSaveWorkout(
        tenantId, planDef, locale, langInstruction, libraryContext, libraryLookup,
      );
      planIds.push(planId);
    } else {
      const planId = await generateAndSaveMealPlan(
        tenantId, planDef, locale, langInstruction, mealsPerDay,
      );
      planIds.push(planId);
    }
  }

  // ---- Step 3: Create program with day mappings ----

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
    const program = await prisma.workoutProgram.create({
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
    return NextResponse.json({ programId: program.id, programName: blueprint.name, plansCreated: planIds.length });
  } else {
    const program = await prisma.nutritionProgram.create({
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
    return NextResponse.json({ programId: program.id, programName: blueprint.name, plansCreated: planIds.length });
  }
}

// ===========================================
// Inline plan generators (no HTTP round-trips)
// ===========================================

async function generateAndSaveWorkout(
  tenantId: string,
  planDef: BlueprintPlan,
  locale: string,
  langInstruction: string,
  libraryContext: string,
  libraryLookup: Map<string, string>,
): Promise<string> {
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

  // Enrich with video URLs from library
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

  const created = await prisma.workoutPlan.create({
    data: {
      name: result.name || planDef.name,
      description: result.description || null,
      isTemplate: true,
      tenantId,
      exercises: { create: exercises },
    },
  });

  logAiUsage({ tenantId, endpoint: "generate-workout-plan", tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, provider: usage.provider });

  return created.id;
}

async function generateAndSaveMealPlan(
  tenantId: string,
  planDef: BlueprintPlan,
  locale: string,
  langInstruction: string,
  numMeals?: number,
): Promise<string> {
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

  const created = await prisma.mealPlan.create({
    data: {
      name: result.name || planDef.name,
      description: result.description || null,
      isTemplate: true,
      targetCalories: totalCalories,
      targetProtein: totalProtein,
      targetCarbs: totalCarbs,
      targetFat: totalFat,
      tenantId,
      meals: {
        create: result.meals.map((meal, idx) => ({
          name: meal.name,
          description: meal.description || null,
          time: meal.time || null,
          foods: (meal.foods || []) as any,
          orderIndex: idx,
        })),
      },
    },
  });

  logAiUsage({ tenantId, endpoint: "generate-meal-plan", tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, provider: usage.provider });

  return created.id;
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
