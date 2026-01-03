import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Get workout logs for a client
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = session.user.clientProfileId || searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const logs = await prisma.workoutLog.findMany({
    where: { clientId },
    include: {
      workoutPlan: { select: { id: true, name: true } },
      entries: {
        include: { exercise: { select: { id: true, name: true } } },
        orderBy: { setNumber: "asc" },
      },
    },
    orderBy: { date: "desc" },
    take: 30,
  });

  return NextResponse.json(logs);
}

// Client starts/saves a workout log
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const log = await prisma.workoutLog.create({
    data: {
      clientId: session.user.clientProfileId,
      workoutPlanId: body.workoutPlanId,
      notes: body.notes || null,
      completed: body.completed || false,
      duration: body.duration || null,
      entries: {
        create: (body.entries || []).map((entry: any) => ({
          exerciseId: entry.exerciseId,
          setNumber: entry.setNumber,
          repsCompleted: entry.repsCompleted || null,
          weightUsed: entry.weightUsed || null,
          notes: entry.notes || null,
          completed: entry.completed ?? true,
        })),
      },
    },
    include: {
      entries: {
        include: { exercise: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(log, { status: 201 });
}
