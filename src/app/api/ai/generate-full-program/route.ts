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
  type: z.enum(["workout", "nutrition"]),
  prompt: z.string().min(3).max(1000),
  source: z.enum(["existing", "generate"]),
  durationWeeks: z.number().min(1).max(12),
  daysPerWeek: z.number().min(1).max(7),
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
      return await handleBlueprint(session, type, prompt, durationWeeks, daysPerWeek, locale);
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
// SOURCE: "generate" — returns blueprint only (client orchestrates the rest)
// ===========================================

async function handleBlueprint(
  session: any,
  type: string,
  prompt: string,
  durationWeeks: number,
  daysPerWeek: number,
  locale: string,
) {
  const tenantId = session.user.tenantId;
  const langInstruction = getAILanguageInstruction(locale);

  const totalSlots = type === "workout"
    ? durationWeeks * daysPerWeek
    : durationWeeks * 7;

  const planType = type === "workout" ? "workout" : "meal";
  const dayDesc = type === "workout"
    ? `${daysPerWeek} training days per week`
    : `7 days per week`;

  const { data, usage } = await aiJSON<Blueprint & { error?: string }>({
    messages: [
      {
        role: "system",
        content: `You are an expert ${type === "workout" ? "fitness" : "nutrition"} coach. Design a ${planType} program blueprint.

SCOPE: You ONLY handle ${type === "workout" ? "fitness" : "nutrition"}-related requests. If unrelated, return: {"error": "off_topic"}.

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

  if (data.error === "off_topic") {
    return NextResponse.json({ error: `Please provide a ${type === "workout" ? "fitness" : "nutrition"}-related request.` }, { status: 400 });
  }

  logAiUsage({ tenantId, endpoint: "generate-full-program-blueprint", tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, provider: usage.provider });

  // Return the blueprint — the client will orchestrate individual plan generation
  return NextResponse.json({
    blueprint: {
      name: data.name,
      description: data.description,
      plans: data.plans,
      schedule: data.schedule,
    },
  });
}
