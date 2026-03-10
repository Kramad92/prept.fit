import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/session";
import { validateBody, measurementCreateSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireClient();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = session.user.clientProfileId!;

  const parsed = await validateBody(req, measurementCreateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const measurement = await prisma.measurement.create({
    data: {
      clientId,
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
