import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, packageSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, packageSchema);
  if ("error" in parsed) return parsed.error;

  const existing = await prisma.package.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.package.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: parsed.data,
  });

  const pkg = await prisma.package.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json(pkg);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.package.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.package.deleteMany({ where: { id: params.id, tenantId: session.user.tenantId } });
  return NextResponse.json({ ok: true });
}
