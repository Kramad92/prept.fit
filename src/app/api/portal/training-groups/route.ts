import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "CLIENT" || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.trainingGroupMember.findMany({
    where: { clientId: session.user.clientProfileId },
    include: {
      group: {
        include: {
          _count: { select: { members: true } },
          sessions: {
            where: {
              date: { gte: new Date() },
              status: "scheduled",
            },
            orderBy: { date: "asc" },
            take: 1,
            select: { date: true, startTime: true },
          },
        },
      },
    },
  });

  const groups = memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    description: m.group.description,
    memberCount: m.group._count.members,
    joinedAt: m.joinedAt.toISOString(),
    nextSession: m.group.sessions[0]
      ? {
          date: m.group.sessions[0].date.toISOString(),
          startTime: m.group.sessions[0].startTime,
        }
      : null,
  }));

  return NextResponse.json(groups);
}
