import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await prisma.mealPlan.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      meals: { orderBy: { orderIndex: "asc" } },
      assignedTo: {
        include: { client: { select: { id: true, name: true, status: true } } },
      },
    },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(plan);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const plan = await prisma.$transaction(async (tx) => {
    await tx.meal.deleteMany({ where: { mealPlanId: params.id } });

    return tx.mealPlan.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        isTemplate: body.isTemplate,
        targetCalories: body.targetCalories ? parseInt(body.targetCalories) : null,
        targetProtein: body.targetProtein ? parseInt(body.targetProtein) : null,
        targetCarbs: body.targetCarbs ? parseInt(body.targetCarbs) : null,
        targetFat: body.targetFat ? parseInt(body.targetFat) : null,
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
  });

  return NextResponse.json(plan);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.mealPlan.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json({ ok: true });
}
