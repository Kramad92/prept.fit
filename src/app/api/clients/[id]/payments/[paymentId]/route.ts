import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, paymentUpdateSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; paymentId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = await validateBody(req, paymentUpdateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const payment = await prisma.payment.update({
    where: { id: params.paymentId },
    data: {
      amount: body.amount !== undefined ? parseFloat(String(body.amount)) : undefined,
      currency: body.currency,
      date: body.date ? new Date(body.date) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      method: body.method ?? undefined,
      status: body.status ?? undefined,
      period: body.period ?? undefined,
      description: body.description ?? undefined,
      notes: body.notes ?? undefined,
    },
  });

  return NextResponse.json(payment);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; paymentId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.payment.delete({ where: { id: params.paymentId } });

  return NextResponse.json({ success: true });
}
