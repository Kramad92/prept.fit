import { useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import {
  useCoachClients,
  useLatestMessages,
  useCoachUnreadCounts,
} from "@/hooks/use-coach-data";
import { QueryError } from "@/components/query-error";
import { AppHeader } from "@/components/app-header";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { formatRelative } from "@/lib/format";

interface ConversationItem {
  clientId: string;
  clientName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export default function CoachMessagesScreen() {
  const { data: clients, isLoading: loadingClients, error, refetch, isRefetching } =
    useCoachClients();
  const { data: latestMap } = useLatestMessages();
  const { data: unreadMap } = useCoachUnreadCounts();
  const t = useT();
  const colors = useThemeColors();

  const conversations = useMemo(() => {
    if (!clients) return [];
    const items: ConversationItem[] = clients.map((c) => ({
      clientId: c.id,
      clientName: c.name,
      lastMessage: latestMap?.[c.id]?.content || null,
      lastMessageAt: latestMap?.[c.id]?.createdAt || null,
      unreadCount: unreadMap?.[c.id] || 0,
    }));
    // Sort: unread first, then by last message time
    return items.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      if (a.lastMessageAt && b.lastMessageAt)
        return (
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
        );
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return a.clientName.localeCompare(b.clientName);
    });
  }, [clients, latestMap, unreadMap]);

  const renderItem = useCallback(
    ({ item }: { item: ConversationItem }) => (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 mb-2"
        onPress={() =>
          router.push({ pathname: "/(coach)/messages/[clientId]", params: { clientId: item.clientId } } as any)
        }
        activeOpacity={0.6}
      >
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            item.unreadCount > 0 ? "bg-brand-100" : "bg-gray-100 dark:bg-slate-700"
          }`}
        >
          <Text
            className={`font-semibold text-base ${
              item.unreadCount > 0 ? "text-brand-700" : "text-gray-500 dark:text-slate-400"
            }`}
          >
            {item.clientName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text
              className={`text-base ${
                item.unreadCount > 0
                  ? "font-semibold text-gray-900 dark:text-slate-50"
                  : "font-medium text-gray-900 dark:text-slate-50"
              }`}
            >
              {item.clientName}
            </Text>
            {item.lastMessageAt && (
              <Text className="text-xs text-gray-400 dark:text-slate-500">
                {formatRelative(item.lastMessageAt)}
              </Text>
            )}
          </View>
          {item.lastMessage && (
            <Text
              className={`text-sm mt-0.5 ${
                item.unreadCount > 0 ? "text-gray-700 dark:text-slate-200" : "text-gray-500 dark:text-slate-400"
              }`}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
          )}
        </View>
        {item.unreadCount > 0 && (
          <View className="bg-brand-600 rounded-full min-w-[20px] h-5 items-center justify-center px-1.5 ml-2">
            <Text className="text-white text-xs font-bold">
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    ),
    []
  );

  if (loadingClients) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <QueryError message={t.errors.failedToLoad} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <AppHeader title={t.messages.title} />

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.clientId}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <MessageCircle size={48} color={colors.iconMuted} />
            <Text className="text-gray-400 dark:text-slate-500 text-sm mt-3">
              {t.messages.noConversations}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
