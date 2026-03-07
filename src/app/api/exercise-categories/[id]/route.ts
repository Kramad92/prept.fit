import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, exerciseCategorySchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, exerciseCategorySchema);
  if ("error" in parsed) return parsed.error;

  const existing = await prisma.exerciseCategory.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update the category and rename on all exercises that used the old name
  const [category] = await prisma.$transaction([
    prisma.exerciseCategory.update({
      where: { id: params.id },
      data: { name: parsed.data.name },
    }),
    prisma.exerciseLibrary.updateMany({
      where: { tenantId: session.user.tenantId, category: existing.name },
      data: { category: parsed.data.name },
    }),
  ]);

  return NextResponse.json(category);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.exerciseCategory.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Clear category from exercises that used this, then delete it
  await prisma.$transaction([
    prisma.exerciseLibrary.updateMany({
      where: { tenantId: session.user.tenantId, category: existing.name },
      data: { category: null },
    }),
    prisma.exerciseCategory.delete({ where: { id: params.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
