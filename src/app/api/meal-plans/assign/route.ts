import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { deepCopyMealPlan } from "@/services/meal-plans";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, mealPlanId } = await req.json();

  const result = await prisma.$transaction(async (tx) => {
    return deepCopyMealPlan(tx, {
      originalPlanId: mealPlanId,
      clientId,
      tenantId: session.user.tenantId,
    });
  });

  if (!result) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  return NextResponse.json(result, { status: 201 });
}
