import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, paymentCreateSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payments = await prisma.payment.findMany({
    where: { clientId: params.id },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(payments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = await validateBody(req, paymentCreateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { currency: true },
  });

  const payment = await prisma.payment.create({
    data: {
      amount: parseFloat(String(body.amount)),
      currency: body.currency || tenant?.currency || "BAM",
      date: body.date ? new Date(body.date) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      method: body.method || null,
      status: body.status || "paid",
      period: body.period || null,
      description: body.description || null,
      notes: body.notes || null,
      clientId: params.id,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
