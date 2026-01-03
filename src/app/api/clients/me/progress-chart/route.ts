import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Client-facing route to get their own progress chart data
export async function GET() {
  const session = await getSession();
  if (!session || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = session.user.clientProfileId;

  const measurements = await prisma.measurement.findMany({
    where: { clientId },
    orderBy: { date: "asc" },
    select: {
      date: true,
      weight: true,
      bodyFat: true,
      chest: true,
      waist: true,
      hips: true,
      arms: true,
      thighs: true,
    },
  });

  const workoutLogs = await prisma.workoutLog.findMany({
    where: { clientId, completed: true },
    orderBy: { date: "asc" },
    select: { date: true, duration: true },
  });

  const weeklyWorkouts: Record<string, number> = {};
  for (const log of workoutLogs) {
    const weekStart = new Date(log.date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toISOString().split("T")[0];
    weeklyWorkouts[key] = (weeklyWorkouts[key] || 0) + 1;
  }

  return NextResponse.json({
    measurements,
    workoutLogs: Object.entries(weeklyWorkouts).map(([week, count]) => ({
      week,
      count,
    })),
    totalWorkouts: workoutLogs.length,
  });
}
