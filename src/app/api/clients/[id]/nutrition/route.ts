import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { deepCopyMealPlan, createCustomMealPlan } from "@/services/meal-plans";
import { adjustMealPlanForClient } from "@/lib/ai-adjust";
import type { Food } from "@/types";

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

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: session.user.tenantId },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const body = await req.json();
  const aiAdjust = body.aiAdjust === true;
  const locale = body.locale || "bs";

  if (body.mealPlanId) {
    const result = await prisma.$transaction(async (tx) => {
      return deepCopyMealPlan(tx, {
        originalPlanId: body.mealPlanId,
        clientId,
        tenantId: session.user.tenantId,
      });
    });

    if (!result) return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });

    // AI adjustment after deep copy
    if (aiAdjust && result.mealPlan) {
      try {
        const meals = result.mealPlan.meals.map((m) => ({
          name: m.name,
          time: m.time,
          foods: (m.foods as unknown as Food[]) || [],
        }));

        const adjusted = await adjustMealPlanForClient(clientId, {
          name: result.mealPlan.name,
          targetCalories: result.mealPlan.targetCalories,
          targetProtein: result.mealPlan.targetProtein,
          targetCarbs: result.mealPlan.targetCarbs,
          targetFat: result.mealPlan.targetFat,
          meals,
        }, locale);

        // Update the cloned plan with adjusted targets
        await prisma.mealPlan.update({
          where: { id: result.mealPlan.id },
          data: {
            targetCalories: adjusted.targetCalories,
            targetProtein: adjusted.targetProtein,
            targetCarbs: adjusted.targetCarbs,
            targetFat: adjusted.targetFat,
          },
        });

        // Update meals and client meals with adjusted data
        const existingMeals = await prisma.meal.findMany({
          where: { mealPlanId: result.mealPlan.id },
          orderBy: { orderIndex: "asc" },
        });

        const clientMeals = await prisma.clientMeal.findMany({
          where: { clientMealPlanId: result.id },
          orderBy: { orderIndex: "asc" },
        });

        for (let i = 0; i < adjusted.meals.length && i < existingMeals.length; i++) {
          const am = adjusted.meals[i];
          await prisma.meal.update({
            where: { id: existingMeals[i].id },
            data: { name: am.name, time: am.time, foods: am.foods as unknown as Prisma.InputJsonValue },
          });
          if (clientMeals[i]) {
            await prisma.clientMeal.update({
              where: { id: clientMeals[i].id },
              data: { name: am.name, time: am.time, foods: am.foods as unknown as Prisma.InputJsonValue },
            });
          }
        }

        // Re-fetch to return updated data
        const updated = await prisma.clientMealPlan.findUnique({
          where: { id: result.id },
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
        return NextResponse.json(updated, { status: 201 });
      } catch (e) {
        console.warn("AI adjustment failed, returning unadjusted plan:", e);
      }
    }

    return NextResponse.json(result, { status: 201 });
  }

  if (body.name) {
    const result = await prisma.$transaction(async (tx) => {
      return createCustomMealPlan(tx, {
        name: body.name,
        description: body.description,
        clientId,
        tenantId: session.user.tenantId,
        targetCalories: body.targetCalories ? parseInt(body.targetCalories) : null,
        targetProtein: body.targetProtein ? parseInt(body.targetProtein) : null,
        targetCarbs: body.targetCarbs ? parseInt(body.targetCarbs) : null,
        targetFat: body.targetFat ? parseInt(body.targetFat) : null,
        meals: body.meals || [],
      });
    });

    return NextResponse.json(result, { status: 201 });
  }

  return NextResponse.json(
    { error: "Provide either mealPlanId or name with meals" },
    { status: 400 }
  );
}
