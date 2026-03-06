import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { deepCopyMealPlan, createCustomMealPlan } from "@/services/meal-plans";

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

  if (body.mealPlanId) {
    const result = await prisma.$transaction(async (tx) => {
      return deepCopyMealPlan(tx, {
        originalPlanId: body.mealPlanId,
        clientId,
        tenantId: session.user.tenantId,
      });
    });

    if (!result) return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
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
