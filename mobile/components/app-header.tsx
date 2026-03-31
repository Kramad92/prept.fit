import { useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Bell, MessageCircle, Search } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { useCoachUnreadCounts, useCoachNotifications } from "@/hooks/use-coach-data";
import { useUnreadCount, useNotifications } from "@/hooks/use-client-data";

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
      <Text className="text-white text-[10px] font-bold">
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}

function CoachIcons() {
  const { data: unreadMap } = useCoachUnreadCounts();
  const { data: notifications } = useCoachNotifications();

  const totalUnread = useMemo(() => {
    if (!unreadMap) return 0;
    return Object.values(unreadMap).reduce((sum, n) => sum + n, 0);
  }, [unreadMap]);

  const unreadNotifs = useMemo(
    () => notifications?.filter((n) => !n.isRead).length || 0,
    [notifications]
  );

  return (
    <View className="flex-row items-center">
      <TouchableOpacity
        onPress={() => router.push("/(coach)/search" as never)}
        className="p-2 relative"
        activeOpacity={0.6}
      >
        <Search size={21} color="#6b7280" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push("/(coach)/(tabs)/messages" as never)}
        className="p-2 relative"
        activeOpacity={0.6}
      >
        <MessageCircle size={21} color="#6b7280" />
        <Badge count={totalUnread} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push("/(coach)/notifications" as never)}
        className="p-2 relative"
        activeOpacity={0.6}
      >
        <Bell size={21} color="#6b7280" />
        <Badge count={unreadNotifs} />
      </TouchableOpacity>
    </View>
  );
}

function ClientIcons() {
  const { data: unreadMap } = useUnreadCount();
  const { data: notifications } = useNotifications();

  const totalUnread = useMemo(() => {
    if (!unreadMap) return 0;
    return Object.values(unreadMap).reduce((sum, n) => sum + n, 0);
  }, [unreadMap]);

  const unreadNotifs = useMemo(
    () => notifications?.filter((n) => !n.isRead).length || 0,
    [notifications]
  );

  return (
    <View className="flex-row items-center">
      <TouchableOpacity
        onPress={() => router.push("/(client)/messages" as never)}
        className="p-2 relative"
        activeOpacity={0.6}
      >
        <MessageCircle size={21} color="#6b7280" />
        <Badge count={totalUnread} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push("/(client)/notifications" as never)}
        className="p-2 relative"
        activeOpacity={0.6}
      >
        <Bell size={21} color="#6b7280" />
        <Badge count={unreadNotifs} />
      </TouchableOpacity>
    </View>
  );
}

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
}

export function AppHeader({ title, subtitle, rightContent }: AppHeaderProps) {
  const { user } = useAuth();
  const isCoach = user?.role === "COACH";

  return (
    <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
      <View className="flex-1 mr-2">
        <Text className="text-2xl font-bold text-gray-900" numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text className="text-sm text-gray-500">{subtitle}</Text>
        )}
      </View>
      <View className="flex-row items-center">
        {isCoach ? <CoachIcons /> : <ClientIcons />}
        {rightContent}
      </View>
    </View>
  );
}
