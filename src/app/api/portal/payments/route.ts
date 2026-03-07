import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/session";

export async function GET() {
  const session = await requireClient();

  const payments = await prisma.payment.findMany({
    where: {
      clientId: session.user.clientProfileId!,
      client: { tenantId: session.user.tenantId },
    },
    orderBy: { date: "desc" },
    select: {
      id: true,
      amount: true,
      currency: true,
      date: true,
      dueDate: true,
      method: true,
      status: true,
      period: true,
      description: true,
    },
  });

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalOverdue = payments
    .filter((p) => p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);

  return NextResponse.json({
    payments,
    summary: { totalPaid, totalPending, totalOverdue },
  });
}
