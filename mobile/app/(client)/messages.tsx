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
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { ArrowLeft, Send } from "lucide-react-native";
import Pusher from "pusher-js/react-native";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { haptics } from "@/lib/haptics";
import { useMessages } from "@/hooks/use-client-data";
import { QueryError } from "@/components/query-error";
import type { Message } from "@/types/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER || "mt1";

export default function MessagesScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const isAtBottom = useRef(true);
  const [text, setText] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  const clientId = user?.clientProfileId;
  const { data: serverMessages, isLoading, isError, refetch } = useMessages(clientId ?? undefined);

  // Merge server + local optimistic messages
  const messages = useMemo(() => {
    const base = serverMessages || [];
    const serverIds = new Set(base.map((m) => m.id));
    const extras = localMessages.filter((m) => !serverIds.has(m.id));
    return [...base, ...extras].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [serverMessages, localMessages]);

  // Pusher real-time subscription
  useEffect(() => {
    if (!PUSHER_KEY || !user?.tenantId || !clientId) return;

    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
    const channel = pusher.subscribe(`chat-${user.tenantId}-${clientId}`);

    channel.bind("new-message", (msg: Message) => {
      // Skip own messages (handled optimistically)
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

  // Polling fallback if no Pusher
  useEffect(() => {
    if (PUSHER_KEY) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["messages", clientId] });
    }, 5000);
    return () => clearInterval(interval);
  }, [clientId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post<Message>(`/api/messages/${clientId}`, { content }),
    onSuccess: (msg) => {
      // Replace optimistic with real
      setLocalMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
      queryClient.setQueryData<Message[]>(
        ["messages", clientId],
        (old) => (old ? [...old, msg] : [msg])
      );
      queryClient.invalidateQueries({ queryKey: ["messages-unread"] });
    },
    onError: () => {
      setLocalMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
    },
  });

  const handleSend = useCallback(() => {
    const content = text.trim();
    if (!content || !user) return;
    haptics.light();

    // Optimistic add
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

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    isAtBottom.current = distanceFromBottom < 50;
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
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <ArrowLeft size={22} color="#111827" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Messages</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <ArrowLeft size={22} color="#111827" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Messages</Text>
        </View>
        <QueryError onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Messages</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-gray-400 text-base text-center">
              No messages yet. Send a message to your coach!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: "flex-end" }}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            onContentSizeChange={() => {
              if (isAtBottom.current) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
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
