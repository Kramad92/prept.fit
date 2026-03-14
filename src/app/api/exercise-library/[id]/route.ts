import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/session";
import { validateBody, exerciseLibrarySchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.exerciseLibrary.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = await validateBody(req, exerciseLibrarySchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const updated = await prisma.exerciseLibrary.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: {
      name: body.name,
      nameI18n: body.nameI18n ?? Prisma.JsonNull,
      category: body.category,
      muscleGroup: body.muscleGroup,
      equipment: body.equipment,
      videoUrl: body.videoUrl,
      instructions: body.instructions,
    },
  });

  if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const exercise = await prisma.exerciseLibrary.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json(exercise);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.exerciseLibrary.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json({ ok: true });
}
