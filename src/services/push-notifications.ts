import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { prisma } from "@/lib/prisma";

const expo = new Expo();

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send push notifications to all devices registered for a user.
 * Automatically removes invalid tokens (DeviceNotRegistered).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  const tokens = await prisma.pushToken.findMany({
    where: { userId },
    select: { id: true, token: true },
  });

  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens
    .filter((t) => Expo.isExpoPushToken(t.token))
    .map((t) => ({
      to: t.token,
      sound: "default" as const,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    }));

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  const invalidTokenIds: string[] = [];

  for (const chunk of chunks) {
    try {
      const tickets: ExpoPushTicket[] =
        await expo.sendPushNotificationsAsync(chunk);

      // Check for errors and collect invalid tokens
      tickets.forEach((ticket, i) => {
        if (ticket.status === "error") {
          if (
            ticket.details?.error === "DeviceNotRegistered" ||
            ticket.details?.error === "InvalidCredentials"
          ) {
            const matchingToken = tokens.find(
              (t) => t.token === (chunk[i] as any).to
            );
            if (matchingToken) invalidTokenIds.push(matchingToken.id);
          }
          console.error(
            `[push] Error sending to ${(chunk[i] as any).to}:`,
            ticket.message
          );
        }
      });
    } catch (error) {
      console.error("[push] Failed to send chunk:", error);
    }
  }

  // Clean up invalid tokens
  if (invalidTokenIds.length > 0) {
    await prisma.pushToken.deleteMany({
      where: { id: { in: invalidTokenIds } },
    });
    console.log(
      `[push] Removed ${invalidTokenIds.length} invalid token(s)`
    );
  }
}

/**
 * Send push notifications to multiple users (e.g. group notifications).
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  // Batch all in parallel
  await Promise.allSettled(
    userIds.map((userId) => sendPushToUser(userId, payload))
  );
}
