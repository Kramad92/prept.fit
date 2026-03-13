import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, certificateSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, certificateSchema);
  if ("error" in parsed) return parsed.error;

  const existing = await prisma.certificate.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.certificate.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: parsed.data,
  });

  const certificate = await prisma.certificate.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json(certificate);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.certificate.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.certificate.deleteMany({ where: { id: params.id, tenantId: session.user.tenantId } });
  return NextResponse.json({ ok: true });
}
