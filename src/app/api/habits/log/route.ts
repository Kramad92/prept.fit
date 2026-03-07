import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { startOfDay } from "date-fns";
import { validateBody, habitLogSchema } from "@/lib/validations";

// Client logs a habit completion
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, habitLogSchema);
  if ("error" in parsed) return parsed.error;
  const { clientHabitId, date, completed } = parsed.data;

  const logDate = startOfDay(date ? new Date(date) : new Date());

  const log = await prisma.habitLog.upsert({
    where: {
      clientHabitId_date: {
        clientHabitId,
        date: logDate,
      },
    },
    update: { completed },
    create: {
      clientHabitId,
      date: logDate,
      completed,
    },
  });

  return NextResponse.json(log);
}

// Get habit logs for a client
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = session.user.clientProfileId || searchParams.get("clientId");
  const days = parseInt(searchParams.get("days") || "30");

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const habits = await prisma.clientHabit.findMany({
    where: { clientId, isActive: true },
    include: {
      habit: true,
      logs: {
        where: { date: { gte: since } },
        orderBy: { date: "desc" },
      },
    },
  });

  return NextResponse.json(habits);
}
