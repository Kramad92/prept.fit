import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Get habits assigned to a client
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const clientHabits = await prisma.clientHabit.findMany({
    where: {
      clientId,
      client: { tenantId: session.user.tenantId },
    },
    include: {
      habit: true,
      logs: {
        orderBy: { date: "desc" },
        take: 14,
      },
    },
    orderBy: { assignedAt: "asc" },
  });

  return NextResponse.json(clientHabits);
}

// Coach assigns habits to a client
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clientId, habitIds } = await req.json();

  const results = [];
  for (const habitId of habitIds) {
    try {
      const assignment = await prisma.clientHabit.create({
        data: { clientId, habitId },
      });
      results.push(assignment);
    } catch {
      // Unique constraint — already assigned, skip
    }
  }

  return NextResponse.json(results, { status: 201 });
}

// Coach removes a habit from a client
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientHabitId = req.nextUrl.searchParams.get("id");
  if (!clientHabitId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await prisma.clientHabit.deleteMany({
    where: {
      id: clientHabitId,
      client: { tenantId: session.user.tenantId },
    },
  });

  return NextResponse.json({ success: true });
}
