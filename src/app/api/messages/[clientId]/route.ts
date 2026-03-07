import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, messageCreateSchema } from "@/lib/validations";
import { getPusherServer, getChatChannel } from "@/lib/pusher";

// Get messages for a specific client thread
export async function GET(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = 50;

  const messages = await prisma.message.findMany({
    where: {
      clientId: params.clientId,
      tenantId: session.user.tenantId,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      sender: { select: { id: true, name: true, role: true, avatar: true } },
    },
  });

  // Mark unread messages as read for the current user
  const unreadIds = messages
    .filter((m) => !m.isRead && m.senderId !== session.user.id)
    .map((m) => m.id);

  if (unreadIds.length > 0) {
    await prisma.message.updateMany({
      where: { id: { in: unreadIds } },
      data: { isRead: true },
    });

    // Notify the other side that messages were read
    const pusher = getPusherServer();
    if (pusher) {
      const channel = getChatChannel(session.user.tenantId, params.clientId);
      pusher.trigger(channel, "message-read", { readBy: session.user.id }).catch(() => {});
    }
  }

  return NextResponse.json(messages.reverse());
}

// Send a message
export async function POST(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, messageCreateSchema);
  if ("error" in parsed) return parsed.error;
  const { content, attachmentUrl, attachmentType, attachmentName } = parsed.data;

  // Must have either content or attachment
  if (!content?.trim() && !attachmentUrl) {
    return NextResponse.json({ error: "Message content or attachment required" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      content: (content || "").trim(),
      attachmentUrl: attachmentUrl || null,
      attachmentType: attachmentType || null,
      attachmentName: attachmentName || null,
      senderId: session.user.id,
      clientId: params.clientId,
      tenantId: session.user.tenantId,
    },
    include: {
      sender: { select: { id: true, name: true, role: true, avatar: true } },
    },
  });

  // Trigger real-time event
  const pusher = getPusherServer();
  if (pusher) {
    const channel = getChatChannel(session.user.tenantId, params.clientId);
    pusher.trigger(channel, "new-message", message).catch(() => {});
  }

  // Create notification for the recipient
  const client = await prisma.client.findUnique({
    where: { id: params.clientId },
    select: { userId: true, name: true },
  });

  if (session.user.role === "COACH" && client?.userId) {
    await prisma.notification.create({
      data: {
        type: "new_message",
        title: "New message",
        body: `${session.user.name}: ${(content || "").trim().slice(0, 100) || "Sent an attachment"}`,
        userId: client.userId,
        tenantId: session.user.tenantId,
        data: { clientId: params.clientId },
      },
    });
  }

  return NextResponse.json(message, { status: 201 });
}
