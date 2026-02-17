import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, mealPlanSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.mealPlan.findMany({
    where: { tenantId: session.user.tenantId, sourceTemplateId: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { meals: true, assignedTo: true } },
    },
  });

  const result = plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    isTemplate: p.isTemplate,
    targetCalories: p.targetCalories,
    targetProtein: p.targetProtein,
    targetCarbs: p.targetCarbs,
    targetFat: p.targetFat,
    mealCount: p._count.meals,
    assignedCount: p._count.assignedTo,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, mealPlanSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const plan = await prisma.mealPlan.create({
    data: {
      name: body.name,
      description: body.description || null,
      isTemplate: body.isTemplate || false,
      targetCalories: body.targetCalories ? parseInt(body.targetCalories) : null,
      targetProtein: body.targetProtein ? parseInt(body.targetProtein) : null,
      targetCarbs: body.targetCarbs ? parseInt(body.targetCarbs) : null,
      targetFat: body.targetFat ? parseInt(body.targetFat) : null,
      tenantId: session.user.tenantId,
      meals: {
        create: (body.meals || []).map(
          (meal: any, i: number) => ({
            name: meal.name,
            time: meal.time || null,
            foods: meal.foods || [],
            orderIndex: meal.orderIndex ?? i,
          })
        ),
      },
    },
    include: { meals: true },
  });

  return NextResponse.json(plan, { status: 201 });
}
