import PusherClient from "pusher-js";

let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) return null;

  if (!pusherClient) {
    pusherClient = new PusherClient(key, { cluster });
  }

  return pusherClient;
}

export function getChatChannel(tenantId: string, clientId: string): string {
  return `chat-${tenantId}-${clientId}`;
}
