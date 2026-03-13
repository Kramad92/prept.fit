import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, inquiryUpdateSchema } from "@/lib/validations";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, inquiryUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const existing = await prisma.inquiry.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.inquiry.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: { status: parsed.data.status },
  });

  const inquiry = await prisma.inquiry.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json(inquiry);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.inquiry.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.inquiry.deleteMany({ where: { id: params.id, tenantId: session.user.tenantId } });
  return NextResponse.json({ ok: true });
}
