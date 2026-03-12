import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoach } from "@/lib/session";
import { validateBody } from "@/lib/validations";

const updateScheduleSchema = z.object({
  status: z.enum(["scheduled", "completed", "cancelled", "no-show"]).optional(),
  title: z.string().min(1).optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireCoach().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedule = await prisma.schedule.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { client: { select: { id: true, name: true, email: true } } },
  });

  if (!schedule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: schedule.id,
    title: schedule.title,
    date: schedule.date.toISOString(),
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    status: schedule.status,
    type: schedule.type,
    notes: schedule.notes,
    clientId: schedule.clientId,
    clientName: schedule.client.name,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireCoach().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validated = await validateBody(req, updateScheduleSchema);
  if ("error" in validated) return validated.error;
  const { data } = validated;

  // Verify schedule belongs to this tenant
  const existing = await prisma.schedule.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.schedule.update({
    where: { id: params.id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.endTime !== undefined && { endTime: data.endTime }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: { client: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    date: updated.date.toISOString(),
    startTime: updated.startTime,
    endTime: updated.endTime,
    status: updated.status,
    type: updated.type,
    notes: updated.notes,
    clientId: updated.clientId,
    clientName: updated.client.name,
  });
}
