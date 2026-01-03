import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, mealPlanId } = await req.json();

  const original = await prisma.mealPlan.findFirst({
    where: { id: mealPlanId, tenantId: session.user.tenantId },
    include: { meals: { orderBy: { orderIndex: "asc" } } },
  });

  if (!original) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Deep copy: clone the meal plan + meals for this client
  const result = await prisma.$transaction(async (tx) => {
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
        tenantId: session.user.tenantId,
        meals: {
          create: original.meals.map((meal) => ({
            name: meal.name,
            time: meal.time,
            foods: meal.foods as any,
            orderIndex: meal.orderIndex,
          })),
        },
      },
      include: { meals: { orderBy: { orderIndex: "asc" } } },
    });

    const assignment = await tx.clientMealPlan.create({
      data: {
        clientId,
        mealPlanId: clone.id,
        isActive: true,
      },
    });

    // Create client meals mirroring the cloned meals
    for (const meal of clone.meals) {
      await tx.clientMeal.create({
        data: {
          name: meal.name,
          time: meal.time,
          foods: meal.foods as any,
          orderIndex: meal.orderIndex,
          clientId,
          clientMealPlanId: assignment.id,
        },
      });
    }

    return assignment;
  });

  return NextResponse.json(result, { status: 201 });
}
