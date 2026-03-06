import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, workoutPlanId, mode } = await req.json();

  const original = await prisma.workoutPlan.findFirst({
    where: { id: workoutPlanId, tenantId: session.user.tenantId },
    include: { exercises: { orderBy: { orderIndex: "asc" } } },
  });

  if (!original) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Deep copy: clone the plan + exercises for this client
  const result = await prisma.$transaction(async (tx) => {
    const clone = await tx.workoutPlan.create({
      data: {
        name: original.name,
        description: original.description,
        isTemplate: false,
        sourceTemplateId: original.id,
        tenantId: session.user.tenantId,
        exercises: {
          create: original.exercises.map((ex) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            restSeconds: ex.restSeconds,
            notes: ex.notes,
            videoUrl: ex.videoUrl,
            orderIndex: ex.orderIndex,
            superset: ex.superset,
          })),
        },
      },
      include: { exercises: { orderBy: { orderIndex: "asc" } } },
    });

    const assignment = await tx.clientWorkoutPlan.create({
      data: {
        clientId,
        workoutPlanId: clone.id,
        isActive: true,
        mode: mode || "solo",
      },
    });

    // Create client exercises mirroring the cloned exercises
    for (const ex of clone.exercises) {
      await tx.clientExercise.create({
        data: {
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          videoUrl: ex.videoUrl,
          orderIndex: ex.orderIndex,
          clientId,
          clientWorkoutPlanId: assignment.id,
        },
      });
    }

    return assignment;
  });

  return NextResponse.json(result, { status: 201 });
}
