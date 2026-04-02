import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Pusher from "pusher-js/react-native";
import type { Message } from "@/types/api";

const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER || "mt1";

/**
 * Subscribe to real-time chat events via Pusher for a given tenant+client pair.
 * Falls back to polling if Pusher is not configured.
 */
export function useChatChannel(
  tenantId: string | undefined,
  clientId: string | undefined,
  userId: string | undefined
) {
  const queryClient = useQueryClient();

  // Pusher real-time subscription
  useEffect(() => {
    if (!PUSHER_KEY || !tenantId || !clientId) return;

    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
    const channel = pusher.subscribe(`chat-${tenantId}-${clientId}`);

    channel.bind("new-message", (msg: Message) => {
      if (msg.senderId === userId) return;
      queryClient.setQueryData<Message[]>(
        ["messages", clientId],
        (old) => (old ? [...old, msg] : [msg])
      );
    });

    channel.bind("message-read", () => {
      queryClient.invalidateQueries({ queryKey: ["messages", clientId] });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`chat-${tenantId}-${clientId}`);
      pusher.disconnect();
    };
  }, [PUSHER_KEY, tenantId, clientId, userId, queryClient]);

  // Polling fallback if no Pusher
  useEffect(() => {
    if (PUSHER_KEY) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["messages", clientId] });
    }, 5000);
    return () => clearInterval(interval);
  }, [clientId, queryClient]);
}
