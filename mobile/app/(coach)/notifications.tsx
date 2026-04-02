import { useCallback } from "react";
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
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  MessageCircle,
  ClipboardList,
  Calendar,
  CreditCard,
  Users,
  CheckCircle,
} from "lucide-react-native";
import { useCoachNotifications } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { QueryError } from "@/components/query-error";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { formatRelative } from "@/lib/format";
import type { AppNotification } from "@/types/api";

const ICON_MAP: Record<string, typeof Bell> = {
  new_message: MessageCircle,
  check_in_submitted: ClipboardList,
  session_reminder: Calendar,
  booking_request: Calendar,
  payment_overdue: CreditCard,
  group_session: Users,
  habit_reminder: CheckCircle,
};

const COLOR_MAP: Record<string, { bg: string; fg: string }> = {
  new_message: { bg: "bg-blue-50 dark:bg-blue-900/25", fg: "#3b82f6" },
  check_in_submitted: { bg: "bg-purple-50 dark:bg-purple-900/20", fg: "#8b5cf6" },
  session_reminder: { bg: "bg-brand-50 dark:bg-brand-900/20", fg: "#059669" },
  booking_request: { bg: "bg-brand-50 dark:bg-brand-900/20", fg: "#059669" },
  payment_overdue: { bg: "bg-red-50 dark:bg-red-900/25", fg: "#ef4444" },
  group_session: { bg: "bg-amber-50 dark:bg-amber-900/25", fg: "#f59e0b" },
  default: { bg: "bg-gray-50 dark:bg-slate-700", fg: "#6b7280" },
};

export default function CoachNotificationsScreen() {
  const t = useT();
  const themeColors = useThemeColors();
  const queryClient = useQueryClient();
  const { data: notifications, isLoading, error, refetch, isRefetching } =
    useCoachNotifications();

  const markReadMutation = useMutation({
    mutationFn: () => api.put("/api/notifications", { ids: "all" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-notifications"] });
    },
  });

  const handlePress = useCallback((notif: AppNotification) => {
    // Mark single as read
    api.put("/api/notifications", { ids: [notif.id] }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["coach-notifications"] });

    // Navigate
    const tp = notif.type;
    if (tp === "new_message") {
      const clientId = notif.data?.clientId;
      if (clientId) router.push({ pathname: "/(coach)/messages/[clientId]", params: { clientId } } as any);
      else router.push("/(coach)/(tabs)/messages");
    } else if (tp === "check_in_submitted") {
      const clientId = notif.data?.clientId;
      if (clientId) router.push({ pathname: "/(coach)/clients/[id]", params: { id: clientId } } as any);
    } else if (tp === "booking_request" || tp === "session_reminder") {
      router.push("/(coach)/(tabs)/schedule");
    } else if (tp === "payment_overdue") {
      router.push("/(coach)/payments");
    } else if (tp === "group_session") {
      router.push("/(coach)/group-training");
    }
  }, [queryClient]);

  const renderNotification = useCallback(
    ({ item }: { item: AppNotification }) => {
      const Icon = ICON_MAP[item.type] || Bell;
      const iconColors = COLOR_MAP[item.type] || COLOR_MAP.default;

      return (
        <TouchableOpacity
          className={`flex-row items-start px-4 py-3.5 border-b border-gray-50 dark:border-slate-700/40 ${
            item.isRead ? "bg-white dark:bg-slate-800" : "bg-blue-50/30 dark:bg-blue-900/10"
          }`}
          onPress={() => handlePress(item)}
          activeOpacity={0.6}
        >
          <View
            className={`w-9 h-9 rounded-full items-center justify-center mr-3 mt-0.5 ${iconColors.bg}`}
          >
            <Icon size={16} color={iconColors.fg} />
          </View>
          <View className="flex-1">
            <Text
              className={`text-sm ${
                item.isRead
                  ? "text-gray-900 dark:text-slate-50"
                  : "text-gray-900 dark:text-slate-50 font-semibold"
              }`}
            >
              {item.title}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-slate-400 mt-0.5" numberOfLines={2}>
              {item.body}
            </Text>
            <Text className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
              {formatRelative(item.createdAt)}
            </Text>
          </View>
          {!item.isRead && (
            <View className="w-2 h-2 rounded-full bg-brand-600 mt-2 ml-2" />
          )}
        </TouchableOpacity>
      );
    },
    [handlePress]
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Header onMarkAll={() => {}} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={themeColors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Header onMarkAll={() => {}} />
        <QueryError
          message={t.errors.failedToLoad}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const hasUnread = notifications?.some((n) => !n.isRead);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <Header
        onMarkAll={
          hasUnread ? () => markReadMutation.mutate() : undefined
        }
      />

      <FlatList
        data={notifications || []}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={themeColors.brand}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Bell size={48} color={themeColors.iconMuted} />
            <Text className="text-gray-400 dark:text-slate-500 text-sm mt-3">
              {t.notifications.noNotifications}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function Header({ onMarkAll }: { onMarkAll?: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
      <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
        <ArrowLeft size={22} color={colors.text} />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50 flex-1">
        {t.notifications.title}
      </Text>
      {onMarkAll && (
        <TouchableOpacity onPress={onMarkAll} activeOpacity={0.6}>
          <Text className="text-sm text-brand-600 font-medium">
            {t.notifications.markAllRead}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

