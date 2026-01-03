import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Get unread message counts grouped by client
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const unread = await prisma.message.groupBy({
    by: ["clientId"],
    where: {
      tenantId: session.user.tenantId,
      isRead: false,
      senderId: { not: session.user.id },
    },
    _count: { id: true },
  });

  const result: Record<string, number> = {};
  for (const item of unread) {
    result[item.clientId] = item._count.id;
  }

  return NextResponse.json(result);
}
