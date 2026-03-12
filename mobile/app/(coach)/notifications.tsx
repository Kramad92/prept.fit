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
  new_message: { bg: "bg-blue-50", fg: "#3b82f6" },
  check_in_submitted: { bg: "bg-purple-50", fg: "#8b5cf6" },
  session_reminder: { bg: "bg-brand-50", fg: "#059669" },
  booking_request: { bg: "bg-brand-50", fg: "#059669" },
  payment_overdue: { bg: "bg-red-50", fg: "#ef4444" },
  group_session: { bg: "bg-amber-50", fg: "#f59e0b" },
  default: { bg: "bg-gray-50", fg: "#6b7280" },
};

export default function CoachNotificationsScreen() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading, error, refetch, isRefetching } =
    useCoachNotifications();

  const markReadMutation = useMutation({
    mutationFn: () => api.put("/api/notifications", { markAll: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-notifications"] });
    },
  });

  const handlePress = useCallback((notif: AppNotification) => {
    // Mark single as read
    api.put("/api/notifications", { ids: [notif.id] }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["coach-notifications"] });

    // Navigate
    const t = notif.type;
    if (t === "new_message") {
      const clientId = notif.data?.clientId;
      if (clientId) router.push(`/(coach)/messages/${clientId}` as never);
      else router.push("/(coach)/(tabs)/messages");
    } else if (t === "check_in_submitted") {
      const clientId = notif.data?.clientId;
      if (clientId) router.push(`/(coach)/clients/${clientId}` as never);
    } else if (t === "booking_request" || t === "session_reminder") {
      router.push("/(coach)/(tabs)/schedule");
    } else if (t === "payment_overdue") {
      router.push("/(coach)/payments" as never);
    } else if (t === "group_session") {
      router.push("/(coach)/group-training" as never);
    }
  }, [queryClient]);

  const renderNotification = useCallback(
    ({ item }: { item: AppNotification }) => {
      const Icon = ICON_MAP[item.type] || Bell;
      const colors = COLOR_MAP[item.type] || COLOR_MAP.default;

      return (
        <TouchableOpacity
          className={`flex-row items-start px-4 py-3.5 border-b border-gray-50 ${
            item.isRead ? "bg-white" : "bg-blue-50/30"
          }`}
          onPress={() => handlePress(item)}
          activeOpacity={0.6}
        >
          <View
            className={`w-9 h-9 rounded-full items-center justify-center mr-3 mt-0.5 ${colors.bg}`}
          >
            <Icon size={16} color={colors.fg} />
          </View>
          <View className="flex-1">
            <Text
              className={`text-sm ${
                item.isRead
                  ? "text-gray-900"
                  : "text-gray-900 font-semibold"
              }`}
            >
              {item.title}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={2}>
              {item.body}
            </Text>
            <Text className="text-[10px] text-gray-400 mt-1">
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
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <Header onMarkAll={() => {}} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <Header onMarkAll={() => {}} />
        <QueryError
          message="Failed to load notifications"
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const hasUnread = notifications?.some((n) => !n.isRead);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
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
            tintColor="#059669"
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Bell size={40} color="#d1d5db" />
            <Text className="text-gray-400 text-sm mt-3">
              No notifications
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function Header({ onMarkAll }: { onMarkAll?: () => void }) {
  return (
    <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
      <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
        <ArrowLeft size={22} color="#111827" />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-gray-900 flex-1">
        Notifications
      </Text>
      {onMarkAll && (
        <TouchableOpacity onPress={onMarkAll} activeOpacity={0.6}>
          <Text className="text-sm text-brand-600 font-medium">
            Mark all read
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
