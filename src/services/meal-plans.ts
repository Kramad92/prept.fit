import { PrismaClient, Prisma } from "@prisma/client";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

const MEAL_PLAN_INCLUDE = {
  mealPlan: {
    include: {
      meals: { orderBy: { orderIndex: "asc" as const } },
      sourceTemplate: { select: { id: true, name: true } },
    },
  },
  clientMeals: { orderBy: { orderIndex: "asc" as const } },
} satisfies Prisma.ClientMealPlanInclude;

export async function deepCopyMealPlan(
  tx: Tx,
  opts: {
    originalPlanId: string;
    clientId: string;
    tenantId: string;
  }
) {
  const original = await tx.mealPlan.findFirst({
    where: { id: opts.originalPlanId, tenantId: opts.tenantId },
    include: { meals: { orderBy: { orderIndex: "asc" } } },
  });

  if (!original) return null;

  const clone = await tx.mealPlan.create({
    data: {
      name: original.name,
      description: original.description,
      isTemplate: false,
      targetCalories: original.targetCalories,
      targetProtein: original.targetProtein,
      targetCarbs: original.targetCarbs,
      targetFat: original.targetFat,
      sourceTemplateId: original.id,
      tenantId: opts.tenantId,
      meals: {
        create: original.meals.map((meal) => ({
          name: meal.name,
          description: meal.description,
          time: meal.time,
          foods: meal.foods as Prisma.InputJsonValue,
          orderIndex: meal.orderIndex,
        })),
      },
    },
    include: { meals: { orderBy: { orderIndex: "asc" } } },
  });

  const assignment = await tx.clientMealPlan.create({
    data: {
      clientId: opts.clientId,
      mealPlanId: clone.id,
      isActive: true,
    },
  });

  for (const meal of clone.meals) {
    await tx.clientMeal.create({
      data: {
        name: meal.name,
        description: meal.description,
        time: meal.time,
        foods: meal.foods as Prisma.InputJsonValue,
        orderIndex: meal.orderIndex,
        clientId: opts.clientId,
        clientMealPlanId: assignment.id,
      },
    });
  }

  return tx.clientMealPlan.findUnique({
    where: { id: assignment.id },
    include: MEAL_PLAN_INCLUDE,
  });
}

export async function createCustomMealPlan(
  tx: Tx,
  opts: {
    name: string;
    description?: string | null;
    clientId: string;
    tenantId: string;
    targetCalories?: number | null;
    targetProtein?: number | null;
    targetCarbs?: number | null;
    targetFat?: number | null;
    meals: Array<{
      name: string;
      description?: string | null;
      time?: string | null;
      foods?: Prisma.InputJsonValue[];
      orderIndex?: number;
    }>;
  }
) {
  const plan = await tx.mealPlan.create({
    data: {
      name: opts.name,
      description: opts.description || null,
      isTemplate: false,
      targetCalories: opts.targetCalories ?? null,
      targetProtein: opts.targetProtein ?? null,
      targetCarbs: opts.targetCarbs ?? null,
      targetFat: opts.targetFat ?? null,
      tenantId: opts.tenantId,
      meals: {
        create: (opts.meals || []).map((m, i) => ({
          name: m.name,
          description: m.description || null,
          time: m.time || null,
          foods: m.foods || [],
          orderIndex: m.orderIndex ?? i,
        })),
      },
    },
    include: { meals: { orderBy: { orderIndex: "asc" } } },
  });

  const assignment = await tx.clientMealPlan.create({
    data: {
      clientId: opts.clientId,
      mealPlanId: plan.id,
      isActive: true,
    },
  });

  for (const meal of plan.meals) {
    await tx.clientMeal.create({
      data: {
        name: meal.name,
        description: meal.description,
        time: meal.time,
        foods: meal.foods as Prisma.InputJsonValue,
        orderIndex: meal.orderIndex,
        clientId: opts.clientId,
        clientMealPlanId: assignment.id,
      },
    });
  }

  return tx.clientMealPlan.findUnique({
    where: { id: assignment.id },
    include: MEAL_PLAN_INCLUDE,
  });
}
