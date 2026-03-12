import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react-native";
import Pusher from "pusher-js/react-native";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { haptics } from "@/lib/haptics";
import { useCoachClients } from "@/hooks/use-coach-data";
import type { Message } from "@/types/api";

const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER || "mt1";

export default function CoachChatScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [text, setText] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  // Get client name
  const { data: clients } = useCoachClients();
  const clientName = useMemo(
    () => clients?.find((c) => c.id === clientId)?.name || "Client",
    [clients, clientId]
  );

  // Fetch messages
  const { data: serverMessages, isLoading } = useQuery<Message[]>({
    queryKey: ["messages", clientId],
    queryFn: () => api.get<Message[]>(`/api/messages/${clientId}`),
    enabled: !!clientId,
  });

  const messages = useMemo(() => {
    const base = serverMessages || [];
    const serverIds = new Set(base.map((m) => m.id));
    const extras = localMessages.filter((m) => !serverIds.has(m.id));
    return [...base, ...extras].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [serverMessages, localMessages]);

  // Pusher
  useEffect(() => {
    if (!PUSHER_KEY || !user?.tenantId || !clientId) return;
    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
    const channel = pusher.subscribe(`chat-${user.tenantId}-${clientId}`);

    channel.bind("new-message", (msg: Message) => {
      if (msg.senderId === user.id) return;
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
      pusher.unsubscribe(`chat-${user.tenantId}-${clientId}`);
      pusher.disconnect();
    };
  }, [PUSHER_KEY, user?.tenantId, clientId, user?.id, queryClient]);

  // Polling fallback
  useEffect(() => {
    if (PUSHER_KEY) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["messages", clientId] });
    }, 5000);
    return () => clearInterval(interval);
  }, [clientId, queryClient]);

  // Mark messages as read
  useEffect(() => {
    if (clientId) {
      api.put("/api/messages/read", { clientId }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["coach-unread-counts"] });
      queryClient.invalidateQueries({ queryKey: ["coach-latest-messages"] });
    }
  }, [clientId, messages.length, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post<Message>(`/api/messages/${clientId}`, { content }),
    onSuccess: (msg) => {
      setLocalMessages((prev) =>
        prev.filter((m) => !m.id.startsWith("temp-"))
      );
      queryClient.setQueryData<Message[]>(
        ["messages", clientId],
        (old) => (old ? [...old, msg] : [msg])
      );
      queryClient.invalidateQueries({ queryKey: ["coach-unread-counts"] });
      queryClient.invalidateQueries({ queryKey: ["coach-latest-messages"] });
    },
    onError: () => {
      setLocalMessages((prev) =>
        prev.filter((m) => !m.id.startsWith("temp-"))
      );
    },
  });

  const handleSend = useCallback(() => {
    const content = text.trim();
    if (!content || !user) return;
    haptics.light();

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      isRead: false,
      attachmentUrl: null,
      attachmentType: null,
      attachmentName: null,
      senderId: user.id,
      clientId: clientId || "",
      tenantId: user.tenantId,
      sender: { id: user.id, name: user.name, role: user.role, avatar: null },
    };
    setLocalMessages((prev) => [...prev, tempMsg]);
    setText("");
    sendMutation.mutate(content);
  }, [text, user, clientId, sendMutation]);

  const formatTime = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    if (isToday) return time;
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${time}`;
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMine = item.senderId === user?.id;
      const isTemp = item.id.startsWith("temp-");
      return (
        <View
          className={`mb-2 max-w-[80%] ${isMine ? "self-end" : "self-start"}`}
        >
          <View
            className={`rounded-2xl px-4 py-2.5 ${
              isMine
                ? "bg-brand-600 rounded-br-sm"
                : "bg-white border border-gray-100 rounded-bl-sm"
            }`}
          >
            <Text
              className={`text-base ${
                isMine ? "text-white" : "text-gray-900"
              }`}
            >
              {item.content}
            </Text>
          </View>
          <View
            className={`flex-row items-center mt-0.5 ${
              isMine ? "justify-end" : "justify-start"
            }`}
          >
            <Text className="text-xs text-gray-400">
              {isTemp ? "Sending..." : formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      );
    },
    [user?.id, formatTime]
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-1"
          >
            <ArrowLeft size={22} color="#111827" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            {clientName}
          </Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">
          {clientName}
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-gray-400 text-base text-center">
              No messages yet. Start the conversation!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{
              padding: 16,
              flexGrow: 1,
              justifyContent: "flex-end",
            }}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        <View className="flex-row items-end px-3 py-2 bg-white border-t border-gray-100">
          <TextInput
            className="flex-1 bg-gray-50 rounded-2xl px-4 py-2.5 text-base text-gray-900 max-h-24 border border-gray-200"
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            className={`ml-2 w-10 h-10 rounded-full items-center justify-center ${
              text.trim() ? "bg-brand-600" : "bg-gray-200"
            }`}
            onPress={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            activeOpacity={0.7}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={18} color={text.trim() ? "#fff" : "#9ca3af"} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
