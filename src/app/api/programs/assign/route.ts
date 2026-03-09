import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { deepCopyWorkoutPlan } from "@/services/workout-plans";
import { validateBody, workoutProgramAssignSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, workoutProgramAssignSchema);
  if ("error" in parsed) return parsed.error;
  const { clientId, programId, startDate, accessPolicy, notes } = parsed.data;

  // Verify program belongs to tenant
  const program = await prisma.workoutProgram.findFirst({
    where: { id: programId, tenantId: session.user.tenantId },
    include: {
      days: {
        orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
        where: { workoutPlanId: { not: null } },
      },
    },
  });

  if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });

  const programStartDate = new Date(startDate);
  // Calculate end date based on duration
  const endDate = new Date(programStartDate);
  endDate.setDate(endDate.getDate() + program.durationWeeks * 7);

  const result = await prisma.$transaction(async (tx) => {
    // Create the program assignment
    const assignment = await tx.clientWorkoutProgram.create({
      data: {
        clientId,
        programId,
        startDate: programStartDate,
        endDate: accessPolicy === "unlimited" ? null : endDate,
        accessPolicy,
        notes: notes || null,
        isActive: true,
      },
    });

    // Deep-copy each workout plan for each program day
    for (const day of program.days) {
      if (!day.workoutPlanId) continue;

      // Calculate the date for this specific day
      const dayDate = new Date(programStartDate);
      dayDate.setDate(dayDate.getDate() + (day.weekNumber - 1) * 7 + (day.dayNumber - 1));

      await deepCopyWorkoutPlan(tx, {
        originalPlanId: day.workoutPlanId,
        clientId,
        tenantId: session.user.tenantId,
        mode: "solo",
        accessPolicy,
        startDate: dayDate,
        endDate: accessPolicy === "unlimited" ? null : endDate,
        clientWorkoutProgramId: assignment.id,
      });
    }

    // Return the full assignment with relations
    return tx.clientWorkoutProgram.findUnique({
      where: { id: assignment.id },
      include: {
        program: {
          include: {
            days: {
              orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
              include: { workoutPlan: { select: { id: true, name: true } } },
            },
          },
        },
        client: { select: { id: true, name: true } },
        clientWorkoutPlans: {
          include: {
            workoutPlan: { select: { id: true, name: true } },
          },
        },
      },
    });
  });

  return NextResponse.json(result, { status: 201 });
}
