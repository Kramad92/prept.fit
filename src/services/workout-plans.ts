import { PrismaClient, Prisma } from "@prisma/client";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

const WORKOUT_PLAN_INCLUDE = {
  workoutPlan: {
    include: {
      exercises: { orderBy: { orderIndex: "asc" as const } },
      sourceTemplate: { select: { id: true, name: true } },
    },
  },
  clientExercises: { orderBy: { orderIndex: "asc" as const } },
} satisfies Prisma.ClientWorkoutPlanInclude;

export async function deepCopyWorkoutPlan(
  tx: Tx,
  opts: {
    originalPlanId: string;
    clientId: string;
    tenantId: string;
    mode?: string;
  }
) {
  const original = await tx.workoutPlan.findFirst({
    where: { id: opts.originalPlanId, tenantId: opts.tenantId },
    include: { exercises: { orderBy: { orderIndex: "asc" } } },
  });

  if (!original) return null;

  const clone = await tx.workoutPlan.create({
    data: {
      name: original.name,
      description: original.description,
      isTemplate: false,
      sourceTemplateId: original.id,
      tenantId: opts.tenantId,
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
      clientId: opts.clientId,
      workoutPlanId: clone.id,
      isActive: true,
      mode: opts.mode || "solo",
    },
  });

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
        clientId: opts.clientId,
        clientWorkoutPlanId: assignment.id,
      },
    });
  }

  return tx.clientWorkoutPlan.findUnique({
    where: { id: assignment.id },
    include: WORKOUT_PLAN_INCLUDE,
  });
}

export async function createCustomWorkoutPlan(
  tx: Tx,
  opts: {
    name: string;
    description?: string | null;
    clientId: string;
    tenantId: string;
    mode?: string;
    exercises: Array<{
      name: string;
      sets?: number | null;
      reps?: string | null;
      weight?: string | null;
      restSeconds?: number | null;
      notes?: string | null;
      videoUrl?: string | null;
      orderIndex?: number;
      superset?: string | null;
    }>;
  }
) {
  const plan = await tx.workoutPlan.create({
    data: {
      name: opts.name,
      description: opts.description || null,
      isTemplate: false,
      tenantId: opts.tenantId,
      exercises: {
        create: opts.exercises.map((ex, i) => ({
          name: ex.name,
          sets: ex.sets ?? null,
          reps: ex.reps || null,
          weight: ex.weight || null,
          restSeconds: ex.restSeconds ?? null,
          notes: ex.notes || null,
          videoUrl: ex.videoUrl || null,
          orderIndex: ex.orderIndex ?? i,
          superset: ex.superset || null,
        })),
      },
    },
    include: { exercises: { orderBy: { orderIndex: "asc" } } },
  });

  const assignment = await tx.clientWorkoutPlan.create({
    data: {
      clientId: opts.clientId,
      workoutPlanId: plan.id,
      isActive: true,
      mode: opts.mode || "solo",
    },
  });

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
        clientId: opts.clientId,
        clientWorkoutPlanId: assignment.id,
      },
    });
  }

  return tx.clientWorkoutPlan.findUnique({
    where: { id: assignment.id },
    include: WORKOUT_PLAN_INCLUDE,
  });
}
