import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "CLIENT" || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = session.user.clientProfileId;
  const tenantId = session.user.tenantId;

  // Enrolled sessions (upcoming)
  const enrolled = await prisma.groupSession.findMany({
    where: {
      tenantId,
      date: { gte: new Date() },
      status: "scheduled",
      participants: {
        some: { clientId, status: { in: ["enrolled", "attended"] } },
      },
    },
    include: {
      group: { select: { id: true, name: true } },
      workoutPlan: { select: { id: true, name: true } },
      _count: { select: { participants: true } },
      participants: {
        where: { clientId },
        select: { status: true, clientWorkoutPlanId: true },
      },
    },
    orderBy: { date: "asc" },
  });

  // Open sessions the client hasn't enrolled in
  const open = await prisma.groupSession.findMany({
    where: {
      tenantId,
      date: { gte: new Date() },
      status: "scheduled",
      isOpen: true,
      participants: {
        none: { clientId },
      },
    },
    include: {
      group: { select: { id: true, name: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ enrolled, open });
}
