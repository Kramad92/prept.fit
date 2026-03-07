import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Get the latest message for each client thread (for conversation list preview)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all clients for this tenant
  const clients = await prisma.client.findMany({
    where: { tenantId: session.user.tenantId },
    select: { id: true },
  });

  if (clients.length === 0) return NextResponse.json({});

  // Get latest message per client
  const latestMessages = await prisma.message.findMany({
    where: {
      tenantId: session.user.tenantId,
      clientId: { in: clients.map((c) => c.id) },
    },
    orderBy: { createdAt: "desc" },
    distinct: ["clientId"],
    select: {
      clientId: true,
      content: true,
      createdAt: true,
      attachmentType: true,
    },
  });

  const result: Record<string, { content: string; createdAt: string }> = {};
  for (const msg of latestMessages) {
    result[msg.clientId] = {
      content: msg.content || (msg.attachmentType === "image" ? "Sent an image" : "Sent a file"),
      createdAt: msg.createdAt.toISOString(),
    };
  }

  return NextResponse.json(result);
}
