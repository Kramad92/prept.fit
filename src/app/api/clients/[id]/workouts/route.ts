import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await prisma.clientWorkoutPlan.findMany({
    where: { clientId: params.id, client: { tenantId: session.user.tenantId } },
    include: {
      workoutPlan: {
        include: {
          exercises: { orderBy: { orderIndex: "asc" } },
          sourceTemplate: { select: { id: true, name: true } },
        },
      },
      clientExercises: { orderBy: { orderIndex: "asc" } },
    },
    orderBy: { assignedAt: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = params.id;

  // Verify the client belongs to this tenant
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: session.user.tenantId },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const body = await req.json();

  // Mode 1: Deep copy from existing template
  if (body.workoutPlanId) {
    const original = await prisma.workoutPlan.findFirst({
      where: { id: body.workoutPlanId, tenantId: session.user.tenantId },
      include: { exercises: { orderBy: { orderIndex: "asc" } } },
    });

    if (!original) {
      return NextResponse.json({ error: "Workout plan not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Clone the workout plan
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

      // Create the assignment
      const assignment = await tx.clientWorkoutPlan.create({
        data: {
          clientId,
          workoutPlanId: clone.id,
          isActive: true,
        },
      });

      // Create ClientExercise records mirroring the cloned exercises
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

      return tx.clientWorkoutPlan.findUnique({
        where: { id: assignment.id },
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

    return NextResponse.json(result, { status: 201 });
  }

  // Mode 2: Create custom plan from scratch
  if (body.name) {
    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.workoutPlan.create({
        data: {
          name: body.name,
          description: body.description || null,
          isTemplate: false,
          tenantId: session.user.tenantId,
          exercises: {
            create: (body.exercises || []).map((ex: any, i: number) => ({
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
        include: { exercises: { orderBy: { orderIndex: "asc" } } },
      });

      const assignment = await tx.clientWorkoutPlan.create({
        data: {
          clientId,
          workoutPlanId: plan.id,
          isActive: true,
        },
      });

      // Create ClientExercise records
      for (const ex of plan.exercises) {
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

      return tx.clientWorkoutPlan.findUnique({
        where: { id: assignment.id },
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

    return NextResponse.json(result, { status: 201 });
  }

  return NextResponse.json(
    { error: "Provide either workoutPlanId or name with exercises" },
    { status: 400 }
  );
}
