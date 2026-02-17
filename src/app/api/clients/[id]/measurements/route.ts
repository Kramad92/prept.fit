import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, measurementCreateSchema } from "@/lib/validations";

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

  const parsed = await validateBody(req, measurementCreateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const measurement = await prisma.measurement.create({
    data: {
      clientId: params.id,
      date: body.date ? new Date(body.date) : new Date(),
      weight: body.weight ? parseFloat(String(body.weight)) : null,
      bodyFat: body.bodyFat ? parseFloat(String(body.bodyFat)) : null,
      chest: body.chest ? parseFloat(String(body.chest)) : null,
      waist: body.waist ? parseFloat(String(body.waist)) : null,
      hips: body.hips ? parseFloat(String(body.hips)) : null,
      arms: body.arms ? parseFloat(String(body.arms)) : null,
      thighs: body.thighs ? parseFloat(String(body.thighs)) : null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(measurement, { status: 201 });
}
