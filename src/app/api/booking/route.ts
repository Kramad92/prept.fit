import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, bookingCreateSchema } from "@/lib/validations";

// Client books a session
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, bookingCreateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  // Verify the slot isn't already booked
  const existing = await prisma.schedule.findFirst({
    where: {
      tenantId: session.user.tenantId,
      date: new Date(body.date),
      startTime: body.startTime,
      status: { not: "cancelled" },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "This slot is no longer available" },
      { status: 409 }
    );
  }

  const schedule = await prisma.schedule.create({
    data: {
      title: "Training Session",
      date: new Date(body.date),
      startTime: body.startTime,
      endTime: body.endTime,
      notes: body.notes || null,
      status: "scheduled",
      clientId: session.user.clientProfileId,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(schedule, { status: 201 });
}
