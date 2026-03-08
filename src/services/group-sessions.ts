import { PrismaClient } from "@prisma/client";
import { deepCopyWorkoutPlan } from "./workout-plans";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function assignWorkoutToGroupSession(
  tx: Tx,
  opts: {
    sessionId: string;
    workoutPlanId: string;
    tenantId: string;
  }
) {
  const session = await tx.groupSession.findFirst({
    where: { id: opts.sessionId, tenantId: opts.tenantId },
    include: {
      participants: {
        where: { status: { in: ["enrolled", "attended"] } },
      },
    },
  });

  if (!session) return null;

  // Update session with workout plan reference
  await tx.groupSession.update({
    where: { id: opts.sessionId },
    data: { workoutPlanId: opts.workoutPlanId },
  });

  // Deep-copy workout plan to each enrolled participant
  for (const participant of session.participants) {
    // Skip if participant already has a workout plan assigned
    if (participant.clientWorkoutPlanId) continue;

    const result = await deepCopyWorkoutPlan(tx, {
      originalPlanId: opts.workoutPlanId,
      clientId: participant.clientId,
      tenantId: opts.tenantId,
      mode: "live",
    });

    if (result) {
      await tx.groupSessionParticipant.update({
        where: { id: participant.id },
        data: { clientWorkoutPlanId: result.id },
      });
    }
  }

  return tx.groupSession.findUnique({
    where: { id: opts.sessionId },
    include: {
      participants: {
        include: { client: { select: { id: true, name: true, email: true } } },
      },
      workoutPlan: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
    },
  });
}

export async function autoEnrollGroupMembers(
  tx: Tx,
  opts: {
    sessionId: string;
    groupId: string;
  }
) {
  const members = await tx.trainingGroupMember.findMany({
    where: { groupId: opts.groupId },
  });

  for (const member of members) {
    await tx.groupSessionParticipant.upsert({
      where: {
        sessionId_clientId: {
          sessionId: opts.sessionId,
          clientId: member.clientId,
        },
      },
      create: {
        sessionId: opts.sessionId,
        clientId: member.clientId,
        status: "enrolled",
      },
      update: {},
    });
  }
}

export async function enrollClientInSession(
  tx: Tx,
  opts: {
    sessionId: string;
    clientId: string;
    tenantId: string;
  }
) {
  const session = await tx.groupSession.findFirst({
    where: { id: opts.sessionId, tenantId: opts.tenantId },
    include: { _count: { select: { participants: true } } },
  });

  if (!session) return { error: "Session not found" };

  // Check capacity
  if (session._count.participants >= session.maxParticipants) {
    return { error: "Session is full" };
  }

  const participant = await tx.groupSessionParticipant.upsert({
    where: {
      sessionId_clientId: {
        sessionId: opts.sessionId,
        clientId: opts.clientId,
      },
    },
    create: {
      sessionId: opts.sessionId,
      clientId: opts.clientId,
      status: "enrolled",
    },
    update: { status: "enrolled" },
  });

  // If session already has a workout plan assigned, deep-copy it for this participant
  if (session.workoutPlanId && !participant.clientWorkoutPlanId) {
    const result = await deepCopyWorkoutPlan(tx, {
      originalPlanId: session.workoutPlanId,
      clientId: opts.clientId,
      tenantId: opts.tenantId,
      mode: "live",
    });

    if (result) {
      await tx.groupSessionParticipant.update({
        where: { id: participant.id },
        data: { clientWorkoutPlanId: result.id },
      });
    }
  }

  return { participant };
}
