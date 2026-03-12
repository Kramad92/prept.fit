import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireCoach } from "@/lib/session";
import { validateBody } from "@/lib/validations";

const createPaymentSchema = z.object({
  clientId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  date: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  status: z.enum(["paid", "pending", "overdue", "cancelled"]).default("paid"),
  period: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");

  const payments = await prisma.payment.findMany({
    where: {
      client: { tenantId: session.user.tenantId },
      ...(status ? { status } : {}),
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
    },
    orderBy: { date: "desc" },
  });

  // Summary stats
  const allPayments = await prisma.payment.findMany({
    where: { client: { tenantId: session.user.tenantId } },
    select: { amount: true, status: true, currency: true },
  });

  const totalCollected = allPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = allPayments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalOverdue = allPayments
    .filter((p) => p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);

  return NextResponse.json({
    payments,
    summary: {
      totalCollected,
      totalPending,
      totalOverdue,
      totalPayments: allPayments.length,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await requireCoach().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validated = await validateBody(req, createPaymentSchema);
  if ("error" in validated) return validated.error;
  const { data } = validated;

  // Verify client belongs to this tenant
  const client = await prisma.client.findFirst({
    where: { id: data.clientId, tenantId: session.user.tenantId },
    select: { id: true, name: true, email: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const payment = await prisma.payment.create({
    data: {
      clientId: data.clientId,
      amount: data.amount,
      currency: data.currency,
      date: data.date ? new Date(data.date) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      method: data.method ?? null,
      status: data.status,
      period: data.period ?? null,
      description: data.description ?? null,
      notes: data.notes ?? null,
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
