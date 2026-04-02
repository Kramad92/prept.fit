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
  Sun,
  Moon,
  Smartphone,
} from "lucide-react-native";
import { AppHeader } from "@/components/app-header";
import { useT, useLocale, type Locale } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useTheme, type ThemeMode } from "@/lib/theme-context";

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
  const t = useT();
  const colors = useThemeColors();
  const { setLocale: setAppLocale, locale: appLocale } = useLocale();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();

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
        label: t.nav.messages,
        href: "/(client)/messages",
        badge: totalUnread,
      },
      {
        icon: Bell,
        label: t.notifications.title,
        href: "/(client)/notifications",
        badge: unreadNotifications,
      },
      { icon: ClipboardList, label: t.nav.checkIns, href: "/(client)/check-ins" },
      { icon: TrendingUp, label: t.nav.progress, href: "/(client)/progress" },
      { icon: Calendar, label: t.nav.book, href: "/(client)/book" },
      {
        icon: Users,
        label: t.nav.groupTraining,
        href: "/(client)/group-training",
      },
      { icon: CreditCard, label: t.nav.payments, href: "/(client)/payments" },
    ],
    [totalUnread, unreadNotifications, t]
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <AppHeader title={t.nav.more} />
      <ScrollView className="flex-1 px-4">

        <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 overflow-hidden mb-6">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              className={`flex-row items-center px-4 py-3.5 ${
                index < menuItems.length - 1 ? "border-b border-gray-100 dark:border-slate-700/40" : ""
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

        {/* Appearance & Language */}
        <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 px-4 py-3 mb-6">
          <Text className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">{t.settings.appearance}</Text>
          <View className="flex-row mb-3">
            {([
              { value: "light" as ThemeMode, icon: Sun },
              { value: "dark" as ThemeMode, icon: Moon },
              { value: "system" as ThemeMode, icon: Smartphone },
            ]).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                className={`mr-2 px-3 py-1.5 rounded-full flex-row items-center ${themeMode === opt.value ? "bg-brand-600" : "bg-gray-100 dark:bg-slate-700"}`}
                onPress={() => setThemeMode(opt.value)}
              >
                <opt.icon size={12} color={themeMode === opt.value ? "#fff" : colors.icon} />
                <Text className={`text-xs font-medium ml-1 ${themeMode === opt.value ? "text-white" : "text-gray-700 dark:text-slate-200"}`}>
                  {opt.value === "light" ? t.settings.lightMode : opt.value === "dark" ? t.settings.darkMode : t.settings.systemMode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">{t.common.language}</Text>
          <View className="flex-row flex-wrap">
            {([
              { value: "en" as Locale, label: t.settings.english },
              { value: "bs" as Locale, label: t.settings.bosnian },
              { value: "sr" as Locale, label: t.settings.serbian },
              { value: "hr" as Locale, label: t.settings.croatian },
            ]).map((l) => (
              <TouchableOpacity
                key={l.value}
                className={`mr-2 mb-1 px-3 py-1.5 rounded-full ${appLocale === l.value ? "bg-brand-600" : "bg-gray-100 dark:bg-slate-700"}`}
                onPress={() => setAppLocale(l.value)}
              >
                <Text className={`text-xs font-medium ${appLocale === l.value ? "text-white" : "text-gray-700 dark:text-slate-200"}`}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          className="flex-row items-center bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 px-4 py-3.5"
          onPress={() =>
            Alert.alert(t.common.signOut, "Are you sure you want to sign out?", [
              { text: t.common.cancel, style: "cancel" },
              { text: t.common.signOut, style: "destructive", onPress: logout },
            ])
          }
          activeOpacity={0.6}
        >
          <LogOut size={20} color={colors.destructive} />
          <Text className="ml-3 text-base text-red-600 font-medium">
            {t.common.signOut}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
