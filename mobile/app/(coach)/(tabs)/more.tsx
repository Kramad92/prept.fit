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
  Settings,
  Dumbbell,
  UtensilsCrossed,
  Heart,
  ClipboardList,
  Layers,
  Library,
  Search,
} from "lucide-react-native";

interface MenuItem {
  icon: typeof CreditCard;
  label: string;
  href: string;
  badge?: number;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function CoachMoreScreen() {
  const { logout } = useAuth();
  const { data: notifications } = useCoachNotifications();

  const unreadNotifications = useMemo(
    () => notifications?.filter((n) => !n.isRead).length || 0,
    [notifications]
  );

  const sections: MenuSection[] = useMemo(
    () => [
      {
        title: "Content",
        items: [
          { icon: Dumbbell, label: "Workout Plans", href: "/(coach)/workout-builder" },
          { icon: UtensilsCrossed, label: "Meal Plans", href: "/(coach)/nutrition-builder" },
          { icon: Library, label: "Exercise Library", href: "/(coach)/exercises" },
          { icon: Layers, label: "Programs", href: "/(coach)/programs" },
          { icon: Heart, label: "Habits", href: "/(coach)/habit-builder" },
          { icon: ClipboardList, label: "Check-in Templates", href: "/(coach)/checkin-builder" },
        ],
      },
      {
        title: "Manage",
        items: [
          { icon: CreditCard, label: "Payments", href: "/(coach)/payments" },
          { icon: Users, label: "Group Training", href: "/(coach)/group-training" },
          { icon: Search, label: "Search", href: "/(coach)/search" },
          { icon: Bell, label: "Notifications", href: "/(coach)/notifications", badge: unreadNotifications },
          { icon: Settings, label: "Settings", href: "/(coach)/settings" },
        ],
      },
    ],
    [unreadNotifications]
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-2xl font-bold text-gray-900 mb-4">More</Text>

        {sections.map((section) => (
          <View key={section.title} className="mb-5">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">
              {section.title}
            </Text>
            <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  className={`flex-row items-center px-4 py-3.5 ${
                    index < section.items.length - 1 ? "border-b border-gray-100" : ""
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
          </View>
        ))}

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
