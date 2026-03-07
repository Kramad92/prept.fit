import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const original = await prisma.mealPlan.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { meals: { orderBy: { orderIndex: "asc" } } },
  });

  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const copy = await prisma.mealPlan.create({
    data: {
      name: `${original.name} (Copy)`,
      description: original.description,
      isTemplate: original.isTemplate,
      targetCalories: original.targetCalories,
      targetProtein: original.targetProtein,
      targetCarbs: original.targetCarbs,
      targetFat: original.targetFat,
      tenantId: session.user.tenantId,
      meals: {
        create: original.meals.map((m) => ({
          name: m.name,
          time: m.time,
          foods: m.foods as Prisma.InputJsonValue,
          orderIndex: m.orderIndex,
        })),
      },
    },
    include: { meals: true },
  });

  return NextResponse.json(copy, { status: 201 });
}
