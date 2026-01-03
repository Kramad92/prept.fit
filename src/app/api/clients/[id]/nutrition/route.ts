import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await prisma.clientMealPlan.findMany({
    where: { clientId: params.id, client: { tenantId: session.user.tenantId } },
    include: {
      mealPlan: {
        include: {
          meals: { orderBy: { orderIndex: "asc" } },
          sourceTemplate: { select: { id: true, name: true } },
        },
      },
      clientMeals: { orderBy: { orderIndex: "asc" } },
    },
    orderBy: { assignedAt: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = params.id;

  // Verify the client belongs to this tenant
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: session.user.tenantId },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const body = await req.json();

  // Mode 1: Deep copy from existing meal plan template
  if (body.mealPlanId) {
    const original = await prisma.mealPlan.findFirst({
      where: { id: body.mealPlanId, tenantId: session.user.tenantId },
      include: { meals: { orderBy: { orderIndex: "asc" } } },
    });

    if (!original) {
      return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Clone the meal plan
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

      // Create the assignment
      const assignment = await tx.clientMealPlan.create({
        data: {
          clientId,
          mealPlanId: clone.id,
          isActive: true,
        },
      });

      // Create ClientMeal records mirroring the cloned meals
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

      return tx.clientMealPlan.findUnique({
        where: { id: assignment.id },
        include: {
          mealPlan: {
            include: {
              meals: { orderBy: { orderIndex: "asc" } },
              sourceTemplate: { select: { id: true, name: true } },
            },
          },
          clientMeals: { orderBy: { orderIndex: "asc" } },
        },
      });
    });

    return NextResponse.json(result, { status: 201 });
  }

  // Mode 2: Create custom meal plan from scratch
  if (body.name) {
    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.mealPlan.create({
        data: {
          name: body.name,
          description: body.description || null,
          isTemplate: false,
          targetCalories: body.targetCalories ? parseInt(body.targetCalories) : null,
          targetProtein: body.targetProtein ? parseInt(body.targetProtein) : null,
          targetCarbs: body.targetCarbs ? parseInt(body.targetCarbs) : null,
          targetFat: body.targetFat ? parseInt(body.targetFat) : null,
          tenantId: session.user.tenantId,
          meals: {
            create: (body.meals || []).map((m: any, i: number) => ({
              name: m.name,
              time: m.time || null,
              foods: m.foods || [],
              orderIndex: i,
            })),
          },
        },
        include: { meals: { orderBy: { orderIndex: "asc" } } },
      });

      const assignment = await tx.clientMealPlan.create({
        data: {
          clientId,
          mealPlanId: plan.id,
          isActive: true,
        },
      });

      // Create ClientMeal records
      for (const meal of plan.meals) {
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

      return tx.clientMealPlan.findUnique({
        where: { id: assignment.id },
        include: {
          mealPlan: {
            include: {
              meals: { orderBy: { orderIndex: "asc" } },
              sourceTemplate: { select: { id: true, name: true } },
            },
          },
          clientMeals: { orderBy: { orderIndex: "asc" } },
        },
      });
    });

    return NextResponse.json(result, { status: 201 });
  }

  return NextResponse.json(
    { error: "Provide either mealPlanId or name with meals" },
    { status: 400 }
  );
}
