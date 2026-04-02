import { Worker, Job } from "bullmq";
import type { AiJobData } from "../lib/queue.js";
import { enqueueNutritionVerification, enqueueNotification } from "../lib/queue.js";
import { aiJSON } from "../lib/ai-client.js";
import { prisma } from "../lib/prisma.js";

// ─── Nutrition Verification Types ───────────────────────────

interface ExpectedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  reasoning: string;
}

// ─── verify-nutrition-log handler ───────────────────────────

async function verifyNutritionLog(payload: Record<string, unknown>) {
  const { nutritionLogId } = payload as { nutritionLogId: string };

  const log = await prisma.nutritionLog.findUnique({
    where: { id: nutritionLogId },
    include: { client: { select: { tenantId: true } } },
  });

  if (!log) {
    console.log(`[ai] Nutrition log ${nutritionLogId} not found, skipping`);
    return;
  }

  // Skip if already verified within last 24h
  if (log.verifiedAt && Date.now() - log.verifiedAt.getTime() < 24 * 60 * 60 * 1000) {
    return;
  }

  // Skip if no macros were logged (nothing to verify)
  if (!log.calories && !log.protein && !log.carbs && !log.fat) {
    return;
  }

  // Ask AI to estimate expected macros for the food description
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

  // Compare logged vs expected — flag if any macro deviates > 25%
  const deviations: string[] = [];

  function checkDeviation(name: string, logged: number | null, expected: number) {
    if (logged === null || expected === 0) return;
    const pct = Math.abs(logged - expected) / expected;
    if (pct > 0.25) {
      deviations.push(
        `${name}: logged ${logged}, expected ~${expected} (${Math.round(pct * 100)}% off)`
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

  // Update the nutrition log with verification results
  await prisma.nutritionLog.update({
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

  // Notify coach if flagged
  if (flagged) {
    // Find the coach (tenant owner) to notify
    const tenant = await prisma.tenant.findUnique({
      where: { id: log.client.tenantId },
      select: { ownerId: true },
    });

    if (tenant?.ownerId) {
      await enqueueNotification({
        userId: tenant.ownerId,
        tenantId: log.client.tenantId,
        type: "nutrition_flag",
        title: "Nutrition log needs review",
        body: `A client's ${log.mealName} entry may have incorrect macros: ${deviations[0]}`,
        data: { nutritionLogId, clientId: log.clientId },
      });
    }
  }

  console.log(
    `[ai] Verified nutrition log ${nutritionLogId}: ${flagged ? "FLAGGED" : "OK"}`
  );
}

// ─── batch-verify-nutrition handler ─────────────────────────

async function batchVerifyNutrition() {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  // Find unverified logs from the last 6 hours
  const logs = await prisma.nutritionLog.findMany({
    where: {
      verifiedAt: null,
      createdAt: { gte: sixHoursAgo },
      // Only verify logs that have at least one macro value
      OR: [
        { calories: { not: null } },
        { protein: { not: null } },
        { carbs: { not: null } },
        { fat: { not: null } },
      ],
    },
    select: {
      id: true,
      clientId: true,
      client: { select: { tenantId: true } },
    },
    take: 50, // Rate limit: max 50 per batch to avoid token burn
  });

  console.log(`[ai] Batch verify: found ${logs.length} unverified nutrition logs`);

  for (const log of logs) {
    await enqueueNutritionVerification(log.id, log.client.tenantId, log.clientId);
  }
}

// ─── Worker ─────────────────────────────────────────────────

export function startAiWorker(redisUrl: string) {
  const worker = new Worker<AiJobData>(
    "ai",
    async (job: Job<AiJobData>) => {
      console.log(`[ai] Processing ${job.data.type} for user ${job.data.userId}`);

      switch (job.data.type) {
        case "verify-nutrition-log":
          await verifyNutritionLog(job.data.payload);
          break;
        case "batch-verify-nutrition":
          await batchVerifyNutrition();
          break;
        case "verify-workout-log":
          // TODO: Implement workout log verification
          console.log(`[ai] verify-workout-log not yet implemented`);
          break;
        case "generate-feedback":
          // TODO: Implement feedback generation
          console.log(`[ai] generate-feedback not yet implemented`);
          break;
        default:
          console.warn(`[ai] Unknown job type: ${job.data.type}`);
      }
    },
    { connection: { url: redisUrl }, concurrency: 2 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[ai] Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
