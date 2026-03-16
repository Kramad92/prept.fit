import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aiJSON } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { getAILanguageInstruction, getAIExerciseNameInstruction } from "@/lib/ai-locale";
import { logAiUsage } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  type: z.enum(["workout", "nutrition"]),
  prompt: z.string().min(3).max(1000),
  source: z.enum(["existing", "generate"]),
  durationWeeks: z.number().min(1).max(12),
  daysPerWeek: z.number().min(1).max(7),
  locale: z.enum(["bs", "sr", "hr", "en"]).optional().default("en"),
});

// --- Types for AI responses ---

interface BlueprintPlan {
  name: string;
  prompt: string; // description for generating the plan
}

interface BlueprintDay {
  weekNumber: number;
  dayNumber: number;
  label: string;
  planIndex: number; // index into the plans array
}

interface Blueprint {
  name: string;
  description: string;
  plans: BlueprintPlan[];
  schedule: BlueprintDay[];
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

// --- Existing-plan selection (reuse from generate-program routes) ---

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
    return NextResponse.json({ error: "Failed to generate program" }, { status: 502 });
  }
}

// ===========================================
// SOURCE: "existing" — select from existing plans
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
        mealsPerDay: daysPerWeek, // reuse field for nutrition
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
// SOURCE: "generate" — AI creates new plans + program
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

  // Step 1: Generate the blueprint — what plans to create and how to schedule them
  const blueprint = await generateBlueprint(type, prompt, durationWeeks, daysPerWeek, langInstruction);

  if (type === "workout") {
    return await generateWorkoutProgram(session, tenantId, blueprint, durationWeeks, daysPerWeek, locale, langInstruction);
  } else {
    return await generateNutritionProgram(session, tenantId, blueprint, durationWeeks, daysPerWeek, locale, langInstruction);
  }
}

async function generateBlueprint(
  type: string,
  prompt: string,
  durationWeeks: number,
  daysPerWeek: number,
  langInstruction: string,
): Promise<Blueprint> {
  const totalSlots = type === "workout"
    ? durationWeeks * daysPerWeek
    : durationWeeks * 7;

  const planType = type === "workout" ? "workout" : "meal";
  const dayDesc = type === "workout"
    ? `${daysPerWeek} training days per week`
    : `7 days per week`;

  const { data } = await aiJSON<Blueprint>({
    messages: [
      {
        role: "system",
        content: `You are an expert ${type === "workout" ? "fitness" : "nutrition"} coach. Design a ${planType} program blueprint.

You need to determine:
1. What unique ${planType} plans to create (typically 3-6 distinct plans)
2. How to schedule them across the program

PROGRAM: ${durationWeeks} weeks, ${dayDesc}.

Rules:
- Create a sensible number of unique plans (3-6 is typical). Each plan will be fully generated with ${type === "workout" ? "exercises" : "meals and foods"}.
- The "prompt" field for each plan should be a detailed description of what that ${planType} plan should contain (target muscles, style, intensity, etc for workouts; calorie target, meal types, dietary focus for nutrition).
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

  return data;
}

async function generateWorkoutProgram(
  session: any,
  tenantId: string,
  blueprint: Blueprint,
  durationWeeks: number,
  daysPerWeek: number,
  locale: string,
  langInstruction: string,
) {
  const exerciseNameInstruction = getAIExerciseNameInstruction(locale);

  // Fetch exercise library for context
  const libraryExercises = await prisma.exerciseLibrary.findMany({
    where: { tenantId },
    select: { name: true, nameI18n: true, videoUrl: true, category: true },
    take: 200,
  });

  const libraryContext = libraryExercises.length > 0
    ? `\nExercise library (use exact names when matching):\n${libraryExercises.map((e) => {
        const i18n = e.nameI18n as Record<string, string> | null;
        const altName = i18n ? Object.values(i18n)[0] : null;
        return `- ${e.name}${altName ? ` / ${altName}` : ""}${e.category ? ` (${e.category})` : ""}`;
      }).join("\n")}\n`
    : "";

  // Step 2: Generate each unique workout plan
  const planIds: string[] = [];
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let provider = "";

  for (const plan of blueprint.plans) {
    const { data: workoutData, usage } = await aiJSON<GeneratedWorkoutPlan>({
      messages: [
        {
          role: "system",
          content: `You are an expert fitness coach. Generate a complete workout plan.
${libraryContext}
Rules:
- Each exercise: name, nameEn, sets (number), reps (string), weight (string or ""), restSeconds (number), notes (2-3 sentence form cues)
- CRITICAL: Exercise "name" and "nameEn" must be clean standard names only. No "replaced with" or substitution phrases.
- Avoid duplicate or overly similar exercises. Each should target from a distinct angle.
- Include 4-8 exercises, ordered logically (compounds first)
- Use appropriate set/rep schemes for the goal
- ${exerciseNameInstruction}
- ${langInstruction}

Return JSON: { "name": "...", "description": "...", "exercises": [{ "name": "...", "nameEn": "...", "sets": 4, "reps": "8-12", "weight": "", "restSeconds": 90, "notes": "..." }] }`,
        },
        { role: "user", content: `Create a workout plan: ${plan.name}. ${plan.prompt}` },
      ],
      maxTokens: 2500,
      temperature: 0.3,
    });

    totalTokensIn += usage.tokensIn;
    totalTokensOut += usage.tokensOut;
    provider = usage.provider;

    // Save as template
    const saved = await prisma.workoutPlan.create({
      data: {
        name: workoutData.name || plan.name,
        description: workoutData.description || null,
        isTemplate: true,
        tenantId,
        exercises: {
          create: (workoutData.exercises || []).map((ex, i) => ({
            name: ex.name,
            sets: ex.sets || null,
            reps: ex.reps || null,
            weight: ex.weight || null,
            restSeconds: ex.restSeconds || null,
            notes: ex.notes || null,
            orderIndex: i,
          })),
        },
      },
    });

    planIds.push(saved.id);
  }

  // Step 3: Create the program with day mappings
  const days = blueprint.schedule
    .filter((d) => d.planIndex >= 0 && d.planIndex < planIds.length)
    .map((d) => ({
      weekNumber: d.weekNumber,
      dayNumber: d.dayNumber,
      label: d.label || null,
      workoutPlanId: planIds[d.planIndex],
    }));

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

  logAiUsage({ tenantId, endpoint: "generate-full-program", tokensIn: totalTokensIn, tokensOut: totalTokensOut, provider });

  return NextResponse.json({
    programId: program.id,
    programName: blueprint.name,
    plansCreated: planIds.length,
  });
}

async function generateNutritionProgram(
  session: any,
  tenantId: string,
  blueprint: Blueprint,
  durationWeeks: number,
  daysPerWeek: number, // mealsPerDay for nutrition
  locale: string,
  langInstruction: string,
) {
  // Step 2: Generate each unique meal plan
  const planIds: string[] = [];
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let provider = "";

  for (const plan of blueprint.plans) {
    const { data: mealData, usage } = await aiJSON<GeneratedMealPlan>({
      messages: [
        {
          role: "system",
          content: `You are an expert nutrition coach. Generate a complete daily meal plan.

Rules:
- Each meal: name, description (1-2 sentences), time (HH:MM), foods array
- Each food: name, portion (grams or count), calories, protein, carbs, fat (integers)
- Meal and food names must be clean standard names. No substitution phrases.
- Avoid duplicate or overly similar meals. Each should be distinct.
- Include 3-6 meals with 3-8 food items each
- Use accurate macros for stated portions
- Portions in grams (e.g. "150g") or counts (e.g. "2 eggs")
- All macro values must be integers
- ${langInstruction}

Return JSON: { "name": "...", "description": "...", "targetCalories": N, "targetProtein": N, "targetCarbs": N, "targetFat": N, "meals": [{ "name": "...", "description": "...", "time": "07:00", "foods": [{ "name": "...", "portion": "150g", "calories": 200, "protein": 30, "carbs": 0, "fat": 8 }] }] }`,
        },
        { role: "user", content: `Create a meal plan: ${plan.name}. ${plan.prompt}` },
      ],
      maxTokens: 3000,
      temperature: 0.3,
    });

    totalTokensIn += usage.tokensIn;
    totalTokensOut += usage.tokensOut;
    provider = usage.provider;

    // Recalculate totals from actual foods
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
    for (const meal of mealData.meals || []) {
      for (const food of meal.foods || []) {
        totalCalories += food.calories || 0;
        totalProtein += food.protein || 0;
        totalCarbs += food.carbs || 0;
        totalFat += food.fat || 0;
      }
    }

    const saved = await prisma.mealPlan.create({
      data: {
        name: mealData.name || plan.name,
        description: mealData.description || null,
        isTemplate: true,
        targetCalories: totalCalories || mealData.targetCalories || null,
        targetProtein: totalProtein || mealData.targetProtein || null,
        targetCarbs: totalCarbs || mealData.targetCarbs || null,
        targetFat: totalFat || mealData.targetFat || null,
        tenantId,
        meals: {
          create: (mealData.meals || []).map((meal, i) => ({
            name: meal.name,
            description: meal.description || null,
            time: meal.time || null,
            foods: (meal.foods || []) as unknown as import("@prisma/client").Prisma.InputJsonValue,
            orderIndex: i,
          })),
        },
      },
    });

    planIds.push(saved.id);
  }

  // Step 3: Create the program with day mappings
  const days = blueprint.schedule
    .filter((d) => d.planIndex >= 0 && d.planIndex < planIds.length)
    .map((d) => ({
      weekNumber: d.weekNumber,
      dayNumber: d.dayNumber,
      label: d.label || null,
      mealPlanId: planIds[d.planIndex],
    }));

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

  logAiUsage({ tenantId, endpoint: "generate-full-program", tokensIn: totalTokensIn, tokensOut: totalTokensOut, provider });

  return NextResponse.json({
    programId: program.id,
    programName: blueprint.name,
    plansCreated: planIds.length,
  });
}
