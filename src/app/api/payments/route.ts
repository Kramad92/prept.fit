import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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
