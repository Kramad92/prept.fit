import { useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useUnreadCount, useNotifications } from "@/hooks/use-client-data";
import {
  MessageCircle,
  ClipboardList,
  TrendingUp,
  Calendar,
  Users,
  CreditCard,
  Bell,
  LogOut,
  ChevronRight,
} from "lucide-react-native";

interface MenuItem {
  icon: typeof MessageCircle;
  label: string;
  href: string;
  badge?: number;
}

export default function MoreScreen() {
  const { logout } = useAuth();
  const { data: unreadMap } = useUnreadCount();
  const { data: notifications } = useNotifications();

  const totalUnread = useMemo(() => {
    if (!unreadMap) return 0;
    return Object.values(unreadMap).reduce((sum, n) => sum + n, 0);
  }, [unreadMap]);

  const unreadNotifications = useMemo(
    () => notifications?.filter((n) => !n.isRead).length || 0,
    [notifications]
  );

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        icon: MessageCircle,
        label: "Messages",
        href: "/(client)/messages",
        badge: totalUnread,
      },
      {
        icon: Bell,
        label: "Notifications",
        href: "/(client)/notifications",
        badge: unreadNotifications,
      },
      { icon: ClipboardList, label: "Check-ins", href: "/(client)/check-ins" },
      { icon: TrendingUp, label: "Progress", href: "/(client)/progress" },
      { icon: Calendar, label: "Book Session", href: "/(client)/book" },
      {
        icon: Users,
        label: "Group Training",
        href: "/(client)/group-training",
      },
      { icon: CreditCard, label: "Payments", href: "/(client)/payments" },
    ],
    [totalUnread, unreadNotifications]
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">More</Text>

        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              className={`flex-row items-center px-4 py-3.5 ${
                index < menuItems.length - 1 ? "border-b border-gray-100" : ""
              }`}
              activeOpacity={0.6}
              onPress={() => router.push(item.href as never)}
            >
              <item.icon size={20} color="#6b7280" />
              <Text className="flex-1 ml-3 text-base text-gray-900">
                {item.label}
              </Text>
              {item.badge != null && item.badge > 0 && (
                <View className="bg-red-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1.5 mr-2">
                  <Text className="text-white text-xs font-bold">
                    {item.badge > 99 ? "99+" : item.badge}
                  </Text>
                </View>
              )}
              <ChevronRight size={18} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          className="flex-row items-center bg-white rounded-xl border border-gray-100 px-4 py-3.5"
          onPress={() =>
            Alert.alert("Sign Out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: logout },
            ])
          }
          activeOpacity={0.6}
        >
          <LogOut size={20} color="#ef4444" />
          <Text className="ml-3 text-base text-red-600 font-medium">
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
