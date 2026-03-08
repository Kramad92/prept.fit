import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, groupSessionCreateSchema } from "@/lib/validations";
import { autoEnrollGroupMembers } from "@/services/group-sessions";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const status = searchParams.get("status");

  const where: any = { tenantId: session.user.tenantId };
  if (groupId) where.groupId = groupId;
  if (status) where.status = status;

  const sessions = await prisma.groupSession.findMany({
    where,
    include: {
      group: { select: { id: true, name: true } },
      workoutPlan: { select: { id: true, name: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, groupSessionCreateSchema);
  if ("error" in parsed) return parsed.error;

  const result = await prisma.$transaction(async (tx) => {
    const groupSession = await tx.groupSession.create({
      data: {
        title: parsed.data.title,
        date: new Date(parsed.data.date),
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        location: parsed.data.location || null,
        notes: parsed.data.notes || null,
        maxParticipants: parsed.data.maxParticipants,
        isOpen: parsed.data.isOpen,
        groupId: parsed.data.groupId || null,
        workoutPlanId: parsed.data.workoutPlanId || null,
        tenantId: session.user.tenantId,
      },
    });

    // Auto-enroll group members if linked to a group
    if (parsed.data.groupId) {
      await autoEnrollGroupMembers(tx, {
        sessionId: groupSession.id,
        groupId: parsed.data.groupId,
      });
    }

    return tx.groupSession.findUnique({
      where: { id: groupSession.id },
      include: {
        group: { select: { id: true, name: true } },
        workoutPlan: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
    });
  });

  return NextResponse.json(result, { status: 201 });
}
