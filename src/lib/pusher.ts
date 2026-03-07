import Pusher from "pusher";

let pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.PUSHER_KEY ||
    !process.env.PUSHER_SECRET ||
    !process.env.PUSHER_CLUSTER
  ) {
    return null;
  }

  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    });
  }

  return pusherServer;
}

export function getChatChannel(tenantId: string, clientId: string): string {
  return `chat-${tenantId}-${clientId}`;
}
