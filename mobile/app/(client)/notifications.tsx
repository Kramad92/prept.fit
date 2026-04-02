import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ArrowLeft,
  Bell,
  MessageCircle,
  Dumbbell,
  Calendar,
  ClipboardList,
  CheckCircle,
  CreditCard,
  Users,
} from "lucide-react-native";
import { api } from "@/lib/api-client";
import { useNotifications } from "@/hooks/use-client-data";
import { QueryError } from "@/components/query-error";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { AppNotification } from "@/types/api";

const ICON_MAP: Record<string, typeof Bell> = {
  new_message: MessageCircle,
  workout_assigned: Dumbbell,
  session_reminder: Calendar,
  check_in_due: ClipboardList,
  check_in_submitted: ClipboardList,
  habit_reminder: CheckCircle,
  payment_overdue: CreditCard,
  group_session: Users,
};

const COLOR_MAP: Record<string, string> = {
  new_message: "#059669",
  workout_assigned: "#3b82f6",
  session_reminder: "#f59e0b",
  check_in_due: "#8b5cf6",
  check_in_submitted: "#8b5cf6",
  habit_reminder: "#10b981",
  payment_overdue: "#ef4444",
  group_session: "#6366f1",
};

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading, isError, refetch } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const t = useT();
  const colors = useThemeColors();

  const sorted = useMemo(
    () =>
      [...(notifications || [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [notifications]
  );

  const unreadCount = useMemo(
    () => sorted.filter((n) => !n.isRead).length,
    [sorted]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    setRefreshing(false);
  }, [queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (ids: string[] | "all") =>
      api.put("/api/notifications", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleTap = useCallback(
    (notification: AppNotification) => {
      if (!notification.isRead) {
        markReadMutation.mutate([notification.id]);
      }
      switch (notification.type) {
        case "new_message":
          router.push("/(client)/messages");
          break;
        case "check_in_due":
        case "check_in_submitted":
          router.push("/(client)/check-ins");
          break;
        case "workout_assigned":
          router.push("/(client)/(tabs)/workouts");
          break;
        case "habit_reminder":
          router.push("/(client)/(tabs)/habits");
          break;
        case "session_reminder":
          router.push("/(client)/book");
          break;
        case "group_session":
          router.push("/(client)/group-training");
          break;
      }
    },
    [markReadMutation]
  );

  const formatTimeAgo = useCallback((dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
          {t.notifications.title}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={() => markReadMutation.mutate("all")}
            activeOpacity={0.7}
          >
            <Text className="text-sm text-brand-600 font-medium">
              {t.notifications.markAllRead}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
      >
        {isError ? (
          <QueryError onRetry={() => refetch()} />
        ) : isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : sorted.length === 0 ? (
          <View className="items-center py-16">
            <Bell size={48} color={colors.iconMuted} />
            <Text className="text-gray-400 dark:text-slate-500 mt-3 text-base">
              {t.notifications.noNotifications}
            </Text>
          </View>
        ) : (
          <View className="px-4 pt-2">
            {sorted.map((notification) => {
              const IconComponent = ICON_MAP[notification.type] || Bell;
              const iconColor = COLOR_MAP[notification.type] || colors.icon;
              return (
                <TouchableOpacity
                  key={notification.id}
                  className={`flex-row p-4 mb-2 rounded-xl border ${
                    notification.isRead
                      ? "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700/40"
                      : "bg-brand-50 dark:bg-brand-900/20 border-brand-100 dark:border-brand-800/30"
                  }`}
                  onPress={() => handleTap(notification)}
                  activeOpacity={0.7}
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: `${iconColor}15` }}
                  >
                    <IconComponent size={20} color={iconColor} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-base ${
                        notification.isRead
                          ? "text-gray-900 dark:text-slate-50"
                          : "text-gray-900 dark:text-slate-50 font-semibold"
                      }`}
                    >
                      {notification.title}
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-slate-400 mt-0.5" numberOfLines={2}>
                      {notification.body}
                    </Text>
                    <Text className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                      {formatTimeAgo(notification.createdAt)}
                    </Text>
                  </View>
                  {!notification.isRead && (
                    <View className="w-2.5 h-2.5 rounded-full bg-brand-500 mt-1.5" />
                  )}
                </TouchableOpacity>
              );
            })}
            <View className="h-8" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
