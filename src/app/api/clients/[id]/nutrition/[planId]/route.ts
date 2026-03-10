import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignment = await prisma.clientMealPlan.findFirst({
    where: {
      id: params.planId,
      clientId: params.id,
      client: { tenantId: session.user.tenantId },
    },
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

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(assignment);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignment = await prisma.clientMealPlan.findFirst({
    where: {
      id: params.planId,
      clientId: params.id,
      client: { tenantId: session.user.tenantId },
    },
    include: { mealPlan: true },
  });

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const result = await prisma.$transaction(async (tx) => {
    // Update the underlying meal plan and its meals (delete old, create new)
    if (body.meals) {
      await tx.meal.deleteMany({ where: { mealPlanId: assignment.mealPlanId } });

      await tx.mealPlan.update({
        where: { id: assignment.mealPlanId },
        data: {
          name: body.name || assignment.mealPlan.name,
          description: body.description !== undefined ? body.description : assignment.mealPlan.description,
          targetCalories: body.targetCalories !== undefined
            ? (body.targetCalories ? parseInt(body.targetCalories) : null)
            : assignment.mealPlan.targetCalories,
          targetProtein: body.targetProtein !== undefined
            ? (body.targetProtein ? parseInt(body.targetProtein) : null)
            : assignment.mealPlan.targetProtein,
          targetCarbs: body.targetCarbs !== undefined
            ? (body.targetCarbs ? parseInt(body.targetCarbs) : null)
            : assignment.mealPlan.targetCarbs,
          targetFat: body.targetFat !== undefined
            ? (body.targetFat ? parseInt(body.targetFat) : null)
            : assignment.mealPlan.targetFat,
          meals: {
            create: body.meals.map((m: any, i: number) => ({
              name: m.name,
              description: m.description || null,
              time: m.time || null,
              foods: m.foods || [],
              orderIndex: i,
            })),
          },
        },
      });

      // Recreate ClientMeal records
      await tx.clientMeal.deleteMany({ where: { clientMealPlanId: params.planId } });

      for (let i = 0; i < body.meals.length; i++) {
        const m = body.meals[i];
        await tx.clientMeal.create({
          data: {
            name: m.name,
            description: m.description || null,
            time: m.time || null,
            foods: m.foods || [],
            orderIndex: i,
            clientId: params.id,
            clientMealPlanId: params.planId,
          },
        });
      }
    } else {
      // Update only meal plan macro targets if provided (no meals array)
      const mealPlanUpdates: any = {};
      if (body.name) mealPlanUpdates.name = body.name;
      if (body.description !== undefined) mealPlanUpdates.description = body.description;
      if (body.targetCalories !== undefined) mealPlanUpdates.targetCalories = body.targetCalories ? parseInt(body.targetCalories) : null;
      if (body.targetProtein !== undefined) mealPlanUpdates.targetProtein = body.targetProtein ? parseInt(body.targetProtein) : null;
      if (body.targetCarbs !== undefined) mealPlanUpdates.targetCarbs = body.targetCarbs ? parseInt(body.targetCarbs) : null;
      if (body.targetFat !== undefined) mealPlanUpdates.targetFat = body.targetFat ? parseInt(body.targetFat) : null;

      if (Object.keys(mealPlanUpdates).length > 0) {
        await tx.mealPlan.update({
          where: { id: assignment.mealPlanId },
          data: mealPlanUpdates,
        });
      }
    }

    // Update the ClientMealPlan metadata
    const mealPlanMeta: any = {};
    if (body.customName !== undefined) mealPlanMeta.customName = body.customName;
    if (body.notes !== undefined) mealPlanMeta.notes = body.notes;
    if (body.isActive !== undefined) mealPlanMeta.isActive = body.isActive;
    if (body.allowDownload !== undefined) mealPlanMeta.allowDownload = body.allowDownload;

    return tx.clientMealPlan.update({
      where: { id: params.planId },
      data: mealPlanMeta,
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

  return NextResponse.json(result);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignment = await prisma.clientMealPlan.findFirst({
    where: {
      id: params.planId,
      clientId: params.id,
      client: { tenantId: session.user.tenantId },
    },
    include: { mealPlan: { select: { id: true, sourceTemplateId: true } } },
  });

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Delete the assignment (cascades to clientMeals)
    await tx.clientMealPlan.delete({ where: { id: params.planId } });

    // If the meal plan is a client copy (has sourceTemplateId), delete it too
    if (assignment.mealPlan.sourceTemplateId) {
      await tx.mealPlan.delete({ where: { id: assignment.mealPlan.id } });
    }
  });

  return NextResponse.json({ ok: true });
}
