import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, groupWorkoutAssignSchema } from "@/lib/validations";
import { assignWorkoutToGroupSession } from "@/services/group-sessions";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, groupWorkoutAssignSchema);
  if ("error" in parsed) return parsed.error;

  // Verify workout plan belongs to tenant
  const plan = await prisma.workoutPlan.findFirst({
    where: { id: parsed.data.workoutPlanId, tenantId: session.user.tenantId },
  });

  if (!plan) return NextResponse.json({ error: "Workout plan not found" }, { status: 404 });

  const result = await prisma.$transaction(async (tx) => {
    return assignWorkoutToGroupSession(tx, {
      sessionId: params.id,
      workoutPlanId: parsed.data.workoutPlanId,
      tenantId: session.user.tenantId,
    });
  });

  if (!result) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  return NextResponse.json(result);
}
