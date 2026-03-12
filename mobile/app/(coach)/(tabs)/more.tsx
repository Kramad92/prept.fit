import { useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useCoachNotifications } from "@/hooks/use-coach-data";
import {
  CreditCard,
  Users,
  Bell,
  LogOut,
  ChevronRight,
} from "lucide-react-native";

interface MenuItem {
  icon: typeof CreditCard;
  label: string;
  href: string;
  badge?: number;
}

export default function CoachMoreScreen() {
  const { logout } = useAuth();
  const { data: notifications } = useCoachNotifications();

  const unreadNotifications = useMemo(
    () => notifications?.filter((n) => !n.isRead).length || 0,
    [notifications]
  );

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        icon: CreditCard,
        label: "Payments",
        href: "/(coach)/payments",
      },
      {
        icon: Users,
        label: "Group Training",
        href: "/(coach)/group-training",
      },
      {
        icon: Bell,
        label: "Notifications",
        href: "/(coach)/notifications",
        badge: unreadNotifications,
      },
    ],
    [unreadNotifications]
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
          onPress={logout}
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
