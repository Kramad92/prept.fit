import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignment = await prisma.clientWorkoutPlan.findFirst({
    where: {
      id: params.planId,
      clientId: params.id,
      client: { tenantId: session.user.tenantId },
    },
    include: {
      workoutPlan: {
        include: {
          exercises: { orderBy: { orderIndex: "asc" } },
          sourceTemplate: { select: { id: true, name: true } },
        },
      },
      clientExercises: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(assignment);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignment = await prisma.clientWorkoutPlan.findFirst({
    where: {
      id: params.planId,
      clientId: params.id,
      client: { tenantId: session.user.tenantId },
    },
    include: { workoutPlan: true },
  });

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Validate pause request before entering transaction
  if (body.paused === true && !assignment.pausedAt) {
    if (assignment.endDate && new Date(assignment.endDate) < new Date()) {
      return NextResponse.json({ error: "Cannot pause an expired plan" }, { status: 400 });
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update the underlying workout plan exercises (delete old, create new)
    if (body.exercises) {
      await tx.exercise.deleteMany({ where: { workoutPlanId: assignment.workoutPlanId } });

      await tx.workoutPlan.update({
        where: { id: assignment.workoutPlanId },
        data: {
          name: body.name || assignment.workoutPlan.name,
          description: body.description !== undefined ? body.description : assignment.workoutPlan.description,
          exercises: {
            create: body.exercises.map((ex: any, i: number) => ({
              name: ex.name,
              sets: ex.sets ? parseInt(ex.sets) : null,
              reps: ex.reps || null,
              weight: ex.weight || null,
              restSeconds: ex.restSeconds ? parseInt(ex.restSeconds) : null,
              notes: ex.notes || null,
              videoUrl: ex.videoUrl || null,
              orderIndex: i,
              superset: ex.superset || null,
            })),
          },
        },
      });

      // Recreate ClientExercise records
      await tx.clientExercise.deleteMany({ where: { clientWorkoutPlanId: params.planId } });

      for (let i = 0; i < body.exercises.length; i++) {
        const ex = body.exercises[i];
        await tx.clientExercise.create({
          data: {
            name: ex.name,
            sets: ex.sets ? parseInt(ex.sets) : null,
            reps: ex.reps || null,
            weight: ex.weight || null,
            restSeconds: ex.restSeconds ? parseInt(ex.restSeconds) : null,
            notes: ex.notes || null,
            videoUrl: ex.videoUrl || null,
            orderIndex: i,
            clientId: params.id,
            clientWorkoutPlanId: params.planId,
          },
        });
      }
    }

    // Update the ClientWorkoutPlan metadata
    const updateData: any = {};
    if (body.customName !== undefined) updateData.customName = body.customName;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.allowDownload !== undefined) updateData.allowDownload = body.allowDownload;
    if (body.accessPolicy !== undefined) updateData.accessPolicy = body.accessPolicy;
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;

    // Pause/resume logic (plan stays visible but time is frozen)
    if (body.paused === true && !assignment.pausedAt) {
      updateData.pausedAt = new Date();
    } else if (body.paused === false && assignment.pausedAt) {
      // Extend endDate by the number of days paused, but only if the plan
      // hadn't already expired before it was paused
      if (assignment.endDate) {
        const endDate = new Date(assignment.endDate);
        const pausedAt = new Date(assignment.pausedAt);
        if (endDate >= pausedAt) {
          // Plan was still active when paused — extend by pause duration
          const pausedMs = Date.now() - pausedAt.getTime();
          const pausedDays = Math.ceil(pausedMs / (24 * 60 * 60 * 1000));
          const newEnd = new Date(endDate);
          newEnd.setDate(newEnd.getDate() + pausedDays);
          updateData.endDate = newEnd;
        }
        // If endDate < pausedAt, the plan was already expired — don't extend
      }
      updateData.pausedAt = null;
    }

    return tx.clientWorkoutPlan.update({
      where: { id: params.planId },
      data: updateData,
      include: {
        workoutPlan: {
          include: {
            exercises: { orderBy: { orderIndex: "asc" } },
            sourceTemplate: { select: { id: true, name: true } },
          },
        },
        clientExercises: { orderBy: { orderIndex: "asc" } },
      },
    });
  });

  return NextResponse.json(result);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignment = await prisma.clientWorkoutPlan.findFirst({
    where: {
      id: params.planId,
      clientId: params.id,
      client: { tenantId: session.user.tenantId },
    },
    include: { workoutPlan: { select: { id: true, sourceTemplateId: true } } },
  });

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // Delete the assignment (cascades to clientExercises)
    await tx.clientWorkoutPlan.delete({ where: { id: params.planId } });

    // If the workout plan is a client copy (has sourceTemplateId), delete it too
    if (assignment.workoutPlan.sourceTemplateId) {
      await tx.workoutPlan.delete({ where: { id: assignment.workoutPlan.id } });
    }
  });

  return NextResponse.json({ ok: true });
}
