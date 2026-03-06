import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM format

  const where: any = { tenantId: session.user.tenantId };

  if (month) {
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    where.date = { gte: start, lt: end };
  }

  const schedules = await prisma.schedule.findMany({
    where,
    include: { client: { select: { id: true, name: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const events = schedules.map((s) => ({
    id: s.id,
    title: s.title,
    date: s.date.toISOString(),
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    type: s.type,
    notes: s.notes,
    clientId: s.clientId,
    clientName: s.client.name,
  }));

  return NextResponse.json(events, {
    headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=30" },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const schedule = await prisma.schedule.create({
    data: {
      title: body.title,
      date: new Date(body.date),
      startTime: body.startTime,
      endTime: body.endTime,
      type: body.type || "session",
      notes: body.notes || null,
      clientId: body.clientId,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(schedule, { status: 201 });
}
