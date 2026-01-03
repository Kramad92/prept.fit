import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [clientCount, planCount, weekSessions, todaySessions, recentClients] =
    await Promise.all([
      prisma.client.count({ where: { tenantId } }),
      prisma.workoutPlan.count({ where: { tenantId } }),
      prisma.schedule.count({
        where: {
          tenantId,
          date: { gte: weekStart, lte: weekEnd },
        },
      }),
      prisma.schedule.findMany({
        where: {
          tenantId,
          date: { gte: todayStart, lte: todayEnd },
        },
        include: { client: { select: { name: true } } },
        orderBy: { startTime: "asc" },
      }),
      prisma.client.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, status: true, goals: true },
      }),
    ]);

  return NextResponse.json({
    clientCount,
    planCount,
    weekSessions,
    todaySessions: todaySessions.map((s) => ({
      id: s.id,
      title: s.title,
      date: s.date.toISOString(),
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      clientName: s.client.name,
    })),
    recentClients,
  });
}
