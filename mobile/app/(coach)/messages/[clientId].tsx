import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { haptics } from "@/lib/haptics";
import { useCoachClients } from "@/hooks/use-coach-data";
import { useChatChannel } from "@/hooks/use-chat-channel";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { Message } from "@/types/api";

export default function CoachChatScreen() {
  const t = useT();
  const colors = useThemeColors();
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
  const { data: serverMessages, isLoading, error: messagesError, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["messages", clientId],
    queryFn: () => api.get<Message[]>(`/api/messages/${clientId}`),
    enabled: !!clientId,
  });

  // Sorted newest-first for inverted FlatList
  const messages = useMemo(() => {
    const base = serverMessages || [];
    const serverIds = new Set(base.map((m) => m.id));
    const extras = localMessages.filter((m) => !serverIds.has(m.id));
    return [...base, ...extras].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [serverMessages, localMessages]);

  // Real-time chat subscription
  useChatChannel(user?.tenantId, clientId, user?.id);

  // Mark messages as read
  const lastMarkedCount = useRef(0);
  const markReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (clientId && messages.length > lastMarkedCount.current) {
      if (markReadTimer.current) clearTimeout(markReadTimer.current);
      markReadTimer.current = setTimeout(() => {
        lastMarkedCount.current = messages.length;
        queryClient.invalidateQueries({ queryKey: ["coach-unread-counts"] });
        queryClient.invalidateQueries({ queryKey: ["coach-latest-messages"] });
      }, 2000);
    }
    return () => {
      if (markReadTimer.current) clearTimeout(markReadTimer.current);
    };
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
                : "bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/40 rounded-bl-sm"
            }`}
          >
            <Text
              className={`text-base ${
                isMine ? "text-white" : "text-gray-900 dark:text-slate-50"
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
            <Text className="text-xs text-gray-400 dark:text-slate-500">
              {isTemp ? t.common.saving : formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      );
    },
    [user?.id, formatTime, t]
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50">{clientName}</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (messagesError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50">{clientName}</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-gray-500 dark:text-slate-400 text-base text-center mb-3">{t.errors.failedToLoad}</Text>
          <TouchableOpacity className="bg-brand-600 rounded-lg px-4 py-2" onPress={() => refetchMessages()}>
            <Text className="text-white font-semibold text-sm">{t.common.retry}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50">{clientName}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-gray-400 dark:text-slate-500 text-base text-center">
              {t.messages.noMessages}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 16 }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />
        )}

        <View className="flex-row items-end px-3 py-2 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700/40">
          <TextInput
            className="flex-1 bg-gray-50 dark:bg-slate-950 rounded-2xl px-4 py-2.5 text-base text-gray-900 dark:text-slate-50 max-h-24 border border-gray-200 dark:border-slate-700"
            placeholder={t.messages.typeMessage}
            placeholderTextColor={colors.iconMuted}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            className={`ml-2 w-10 h-10 rounded-full items-center justify-center ${
              text.trim() ? "bg-brand-600" : "bg-gray-200 dark:bg-slate-700"
            }`}
            onPress={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            activeOpacity={0.7}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={18} color={text.trim() ? "#fff" : colors.iconMuted} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
