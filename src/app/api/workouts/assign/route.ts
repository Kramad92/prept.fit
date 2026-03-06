import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { deepCopyWorkoutPlan } from "@/services/workout-plans";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, workoutPlanId, mode } = await req.json();

  const result = await prisma.$transaction(async (tx) => {
    return deepCopyWorkoutPlan(tx, {
      originalPlanId: workoutPlanId,
      clientId,
      tenantId: session.user.tenantId,
      mode,
    });
  });

  if (!result) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  return NextResponse.json(result, { status: 201 });
}
