import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Get chart data for a client's measurements over time
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId =
    session.user.role === "CLIENT" && session.user.clientProfileId
      ? session.user.clientProfileId
      : params.id;

  // Verify client belongs to current tenant
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: session.user.tenantId },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  // Also get workout log stats
  const workoutLogs = await prisma.workoutLog.findMany({
    where: { clientId, completed: true },
    orderBy: { date: "asc" },
    select: { date: true, duration: true },
  });

  // Calculate weekly workout counts
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
