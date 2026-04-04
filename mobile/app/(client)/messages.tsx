import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { ArrowLeft, Send, User as UserIcon } from "lucide-react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { haptics } from "@/lib/haptics";
import { useMessages, useClientProfile } from "@/hooks/use-client-data";
import { useChatChannel } from "@/hooks/use-chat-channel";
import { addNotificationReceivedListener } from "@/lib/notifications";
import { QueryError } from "@/components/query-error";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { Message } from "@/types/api";

export default function MessagesScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [text, setText] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const t = useT();
  const colors = useThemeColors();

  const clientId = user?.clientProfileId;
  const { data: serverMessages, isLoading, isError, refetch } = useMessages(clientId ?? undefined);

  // Sorted newest-first for inverted FlatList
  const messages = useMemo(() => {
    const base = serverMessages || [];
    const serverIds = new Set(base.map((m) => m.id));
    const extras = localMessages.filter((m) => !serverIds.has(m.id));
    return [...base, ...extras].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [serverMessages, localMessages]);

  const { data: profile } = useClientProfile();
  const coachName = profile?.tenant?.name ?? t.nav.messages;
  const coachPhoto = profile?.tenant?.coachPhoto ?? profile?.tenant?.logo;

  // Real-time chat subscription
  useChatChannel(user?.tenantId ?? undefined, clientId ?? undefined, user?.id ?? undefined);

  // Refresh messages when a foreground push notification arrives
  useEffect(() => {
    const sub = addNotificationReceivedListener((notification) => {
      const data = notification.request?.content?.data as Record<string, string> | undefined;
      if (data?.type === "new_message") {
        queryClient.invalidateQueries({ queryKey: ["messages", clientId] });
      }
    });
    return () => sub.remove();
  }, [clientId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post<Message>(`/api/messages/${clientId}`, { content }),
    onSuccess: (msg) => {
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
          {!isMine && item.sender?.name && (
            <Text className="text-xs text-gray-500 dark:text-slate-400 mb-0.5 ml-1">
              {item.sender.name}
            </Text>
          )}
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
              {isTemp ? "Sending..." : formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      );
    },
    [user?.id, formatTime]
  );

  const chatHeader = (
    <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
      <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
        <ArrowLeft size={22} color={colors.text} />
      </TouchableOpacity>
      {coachPhoto ? (
        <Image
          source={{ uri: coachPhoto }}
          className="w-9 h-9 rounded-full mr-2.5"
        />
      ) : (
        <View className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/30 items-center justify-center mr-2.5">
          <UserIcon size={18} color={colors.brand} />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900 dark:text-slate-50" numberOfLines={1}>
          {coachName}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-slate-400">
          {t.portalMessages.chatWithCoach}
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        {chatHeader}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        {chatHeader}
        <QueryError onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      {chatHeader}

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
