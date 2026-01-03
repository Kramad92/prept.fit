import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify client belongs to this coach's tenant
  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const measurement = await prisma.measurement.create({
    data: {
      clientId: params.id,
      date: body.date ? new Date(body.date) : new Date(),
      weight: body.weight ? parseFloat(body.weight) : null,
      bodyFat: body.bodyFat ? parseFloat(body.bodyFat) : null,
      chest: body.chest ? parseFloat(body.chest) : null,
      waist: body.waist ? parseFloat(body.waist) : null,
      hips: body.hips ? parseFloat(body.hips) : null,
      arms: body.arms ? parseFloat(body.arms) : null,
      thighs: body.thighs ? parseFloat(body.thighs) : null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(measurement, { status: 201 });
}
