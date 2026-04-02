import { prisma } from "../../lib/prisma.js";
import { enqueueNutritionVerification } from "../../lib/queue.js";
import type { NutritionLogCreateInput } from "./nutrition-log.schema.js";

export async function getLogs(
  tenantId: string,
  userId: string,
  role: string,
  clientProfileId: string | null,
  queryClientId?: string,
  days?: number
) {
  let clientId: string;

  if (role === "CLIENT") {
    if (!clientProfileId) {
      throw new NutritionLogError(403, "No client profile associated");
    }
    clientId = clientProfileId;
  } else {
    // Coach must specify a clientId
    if (!queryClientId) {
      throw new NutritionLogError(400, "clientId query parameter is required");
    }
    // Verify client belongs to tenant
    const client = await prisma.client.findFirst({
      where: { id: queryClientId, tenantId },
    });
    if (!client) throw new NutritionLogError(404, "Client not found");
    clientId = queryClientId;
  }

  const where: { clientId: string; date?: { gte: Date } } = { clientId };

  if (days && days > 0) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    where.date = { gte: since };
  }

  return prisma.nutritionLog.findMany({
    where,
    orderBy: { date: "desc" },
  });
}

export async function createLog(
  data: NutritionLogCreateInput,
  userId: string,
  role: string,
  clientProfileId: string | null,
  tenantId: string
) {
  let clientId: string;

  if (role === "CLIENT") {
    if (!clientProfileId) {
      throw new NutritionLogError(403, "No client profile associated");
    }
    clientId = clientProfileId;
  } else {
    // Coach logging on behalf of a client
    if (!data.clientId) {
      throw new NutritionLogError(
        400,
        "clientId is required when coach creates a log"
      );
    }
    clientId = data.clientId;
  }

  const log = await prisma.nutritionLog.create({
    data: {
      mealName: data.mealName,
      foods: data.foods,
      calories: data.calories ?? null,
      protein: data.protein ?? null,
      carbs: data.carbs ?? null,
      fat: data.fat ?? null,
      notes: data.notes ?? null,
      clientId,
    },
  });

  // Enqueue background macro verification (30s debounce)
  if (data.calories || data.protein || data.carbs || data.fat) {
    enqueueNutritionVerification(log.id, tenantId, clientId).catch((err) => {
      console.error("[nutrition] Failed to enqueue verification:", err);
    });
  }

  return log;
}

export class NutritionLogError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "NutritionLogError";
  }
}
