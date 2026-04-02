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
  ClipboardCheck,
  Layers,
  Library,
  Search,
} from "lucide-react-native";
import { AppHeader } from "@/components/app-header";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";

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
  const t = useT();
  const colors = useThemeColors();

  const unreadNotifications = useMemo(
    () => notifications?.filter((n) => !n.isRead).length || 0,
    [notifications]
  );

  const sections: MenuSection[] = useMemo(
    () => [
      {
        title: "Content",
        items: [
          { icon: Dumbbell, label: t.dashboard.workoutPlans, href: "/(coach)/workout-builder" },
          { icon: UtensilsCrossed, label: t.dashboard.mealPlans, href: "/(coach)/nutrition-builder" },
          { icon: Library, label: t.exerciseLibrary.title, href: "/(coach)/exercises" },
          { icon: Layers, label: t.programs.title, href: "/(coach)/programs" },
          { icon: Heart, label: t.habits.title, href: "/(coach)/habit-builder" },
          { icon: ClipboardList, label: t.checkIns.title, href: "/(coach)/checkin-builder" },
          { icon: ClipboardCheck, label: "Client Check-ins", href: "/(coach)/check-in-submissions" },
        ],
      },
      {
        title: "Manage",
        items: [
          { icon: CreditCard, label: t.nav.payments, href: "/(coach)/payments" },
          { icon: Users, label: t.groupTraining.title, href: "/(coach)/group-training" },
          { icon: Search, label: t.common.search, href: "/(coach)/search" },
          { icon: Bell, label: t.notifications.title, href: "/(coach)/notifications", badge: unreadNotifications },
          { icon: Settings, label: t.settings.title, href: "/(coach)/settings" },
        ],
      },
    ],
    [unreadNotifications, t]
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <AppHeader title={t.nav.more} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>

        {sections.map((section) => (
          <View key={section.title} className="mb-5">
            <Text className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
              {section.title}
            </Text>
            <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 overflow-hidden">
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  className={`flex-row items-center px-4 py-3.5 ${
                    index < section.items.length - 1 ? "border-b border-gray-100 dark:border-slate-700/40" : ""
                  }`}
                  activeOpacity={0.6}
                  onPress={() => router.push(item.href as any)}
                >
                  <item.icon size={20} color={colors.icon} />
                  <Text className="flex-1 ml-3 text-base text-gray-900 dark:text-slate-50">
                    {item.label}
                  </Text>
                  {item.badge != null && item.badge > 0 && (
                    <View className="bg-red-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1.5 mr-2">
                      <Text className="text-white text-xs font-bold">
                        {item.badge > 99 ? "99+" : item.badge}
                      </Text>
                    </View>
                  )}
                  <ChevronRight size={18} color={colors.iconMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity
          className="flex-row items-center bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 px-4 py-3.5"
          onPress={logout}
          activeOpacity={0.6}
        >
          <LogOut size={20} color={colors.destructive} />
          <Text className="ml-3 text-base text-red-600 dark:text-red-400 font-medium">
            {t.common.signOut}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
