import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, equipmentTypeSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, equipmentTypeSchema);
  if ("error" in parsed) return parsed.error;

  const existing = await prisma.equipmentType.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update the type and rename on all exercises that used the old name
  const [type] = await prisma.$transaction([
    prisma.equipmentType.update({
      where: { id: params.id },
      data: { name: parsed.data.name },
    }),
    prisma.exerciseLibrary.updateMany({
      where: { tenantId: session.user.tenantId, equipment: existing.name },
      data: { equipment: parsed.data.name },
    }),
  ]);

  return NextResponse.json(type);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.equipmentType.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Clear equipment from exercises that used this type, then delete the type
  await prisma.$transaction([
    prisma.exerciseLibrary.updateMany({
      where: { tenantId: session.user.tenantId, equipment: existing.name },
      data: { equipment: null },
    }),
    prisma.equipmentType.delete({ where: { id: params.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
