import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { deepCopyWorkoutPlan } from "@/services/workout-plans";
import { validateBody, workoutAssignSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, workoutAssignSchema);
  if ("error" in parsed) return parsed.error;
  const { clientId, workoutPlanId, mode, accessPolicy, startDate, endDate } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    return deepCopyWorkoutPlan(tx, {
      originalPlanId: workoutPlanId,
      clientId,
      tenantId: session.user.tenantId,
      mode,
      accessPolicy,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    });
  });

  if (!result) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  return NextResponse.json(result, { status: 201 });
}
