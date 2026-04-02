import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Users,
  Dumbbell,
  UtensilsCrossed,
  Calendar,
  MessageCircle,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Clock,
  ChevronRight,
  Cake,
  AlertCircle,
  UserX,
  ClipboardCheck,
} from "lucide-react-native";
import { useCoachDashboard } from "@/hooks/use-coach-data";
import { useAuth } from "@/lib/auth-context";
import { QueryError } from "@/components/query-error";
import { AppHeader } from "@/components/app-header";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";

export default function CoachDashboardScreen() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch, isRefetching } =
    useCoachDashboard();
  const t = useT();
  const colors = useThemeColors();

  const firstName = user?.name?.split(" ")[0] || "Coach";

  if (isLoading) {
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

  if (!data) return null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <AppHeader title={`Hi, ${firstName}`} subtitle={t.dashboard.welcome} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand}
          />
        }
      >

        {/* Stats Grid */}
        <View className="flex-row flex-wrap -mx-1.5 mb-5">
          <StatCard
            icon={Users}
            label={t.dashboard.activeClients}
            value={data.clientCount}
            sub={`of ${data.totalClients}`}
            colors={colors}
            onPress={() => router.push("/(coach)/(tabs)/clients")}
          />
          <StatCard
            icon={Dumbbell}
            label={t.dashboard.workoutPlans}
            value={data.planCount}
            colors={colors}
          />
          <StatCard
            icon={UtensilsCrossed}
            label={t.dashboard.mealPlans}
            value={data.mealPlanCount}
            colors={colors}
          />
          <StatCard
            icon={TrendingUp}
            label={t.dashboard.thisWeek}
            value={data.weeklyWorkoutCompletion.logged}
            sub={t.dashboard.thisWeek}
            colors={colors}
          />
        </View>

        {/* Today's Sessions */}
        <SectionHeader
          title={t.dashboard.todaysSchedule}
          count={data.todaySessions.length}
          onPress={() => router.push("/(coach)/(tabs)/schedule")}
          colors={colors}
        />
        {data.todaySessions.length === 0 ? (
          <EmptyCard text={t.dashboard.noSessionsToday} />
        ) : (
          <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 mb-5 overflow-hidden">
            {data.todaySessions.map((s, i) => (
              <View
                key={s.id}
                className={`flex-row items-center px-4 py-3 ${
                  i < data.todaySessions.length - 1
                    ? "border-b border-gray-50 dark:border-slate-700/40"
                    : ""
                }`}
              >
                <View className="w-9 h-9 rounded-full bg-brand-50 items-center justify-center mr-3">
                  <Calendar size={16} color={colors.brand} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">
                    {s.clientName}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-slate-400">
                    {s.startTime} – {s.endTime}
                  </Text>
                </View>
                <View
                  className={`px-2 py-0.5 rounded-full ${
                    s.status === "completed"
                      ? "bg-green-50 dark:bg-green-900/25"
                      : s.status === "cancelled"
                      ? "bg-red-50 dark:bg-red-900/25"
                      : "bg-blue-50 dark:bg-blue-900/25"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      s.status === "completed"
                        ? "text-green-700 dark:text-green-300"
                        : s.status === "cancelled"
                        ? "text-red-700 dark:text-red-400"
                        : "text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    {s.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Unread Messages */}
        {data.unreadMessages.total > 0 && (
          <>
            <SectionHeader
              title={t.messages.title}
              count={data.unreadMessages.total}
              onPress={() => router.push("/(coach)/(tabs)/messages")}
              colors={colors}
            />
            <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 mb-5 overflow-hidden">
              {data.unreadMessages.byClient.slice(0, 5).map((m, i) => (
                <TouchableOpacity
                  key={m.clientId}
                  className={`flex-row items-center px-4 py-3 ${
                    i < Math.min(data.unreadMessages.byClient.length, 5) - 1
                      ? "border-b border-gray-50 dark:border-slate-700/40"
                      : ""
                  }`}
                  onPress={() =>
                    router.push(
                      `/(coach)/messages/${m.clientId}` as never
                    )
                  }
                  activeOpacity={0.6}
                >
                  <View className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/25 items-center justify-center mr-3">
                    <MessageCircle size={16} color="#3b82f6" />
                  </View>
                  <Text className="flex-1 text-sm text-gray-900 dark:text-slate-50">
                    {m.clientName}
                  </Text>
                  <View className="bg-red-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1.5">
                    <Text className="text-white text-xs font-bold">
                      {m.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Payments Alert */}
        {(data.payments.overdueCount > 0 ||
          data.payments.pendingCount > 0) && (
          <>
            <SectionHeader
              title={t.dashboard.paymentsOverview}
              onPress={() => router.push("/(coach)/payments" as never)}
              colors={colors}
            />
            <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 mb-5 overflow-hidden">
              {data.payments.overdueCount > 0 && (
                <TouchableOpacity
                  className="flex-row items-center px-4 py-3 border-b border-gray-50 dark:border-slate-700/40"
                  onPress={() => router.push("/(coach)/payments" as never)}
                  activeOpacity={0.6}
                >
                  <View className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/25 items-center justify-center mr-3">
                    <AlertTriangle size={16} color={colors.destructive} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-red-700 dark:text-red-400">
                      {data.payments.overdueCount} {t.dashboard.overdue.toLowerCase()}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-slate-400">
                      {data.payments.overdueTotal.toFixed(2)} total
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.iconMuted} />
                </TouchableOpacity>
              )}
              {data.payments.pendingCount > 0 && (
                <TouchableOpacity
                  className="flex-row items-center px-4 py-3"
                  onPress={() => router.push("/(coach)/payments" as never)}
                  activeOpacity={0.6}
                >
                  <View className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-900/25 items-center justify-center mr-3">
                    <CreditCard size={16} color="#f59e0b" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      {data.payments.pendingCount} {t.dashboard.pending.toLowerCase()}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-slate-400">
                      {data.payments.pendingTotal.toFixed(2)} total
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.iconMuted} />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Birthdays */}
        {data.birthdays && data.birthdays.length > 0 && (
          <>
            <SectionHeader title={t.dashboard.upcomingBirthdays} colors={colors} />
            <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 mb-5 overflow-hidden">
              {data.birthdays.slice(0, 5).map((b, i) => (
                <TouchableOpacity
                  key={b.id}
                  className={`flex-row items-center px-4 py-3 ${i < Math.min(data.birthdays.length, 5) - 1 ? "border-b border-gray-50 dark:border-slate-700/40" : ""}`}
                  onPress={() => router.push(`/(coach)/clients/${b.id}` as never)}
                  activeOpacity={0.6}
                >
                  <View className="w-9 h-9 rounded-full bg-pink-50 dark:bg-pink-900/20 items-center justify-center mr-3">
                    <Cake size={16} color="#ec4899" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">{b.name}</Text>
                    <Text className="text-xs text-gray-500 dark:text-slate-400">
                      {t.dashboard.turning} {b.turningAge} · {new Date(b.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Text>
                  </View>
                  <View className="bg-pink-50 dark:bg-pink-900/20 rounded-full px-2 py-0.5">
                    <Text className="text-xs font-medium text-pink-700 dark:text-pink-300">
                      {b.daysUntil === 0 ? `${t.dashboard.today}!` : `${b.daysUntil}d`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Expiring Plans */}
        {data.expiringPlans && data.expiringPlans.length > 0 && (
          <>
            <SectionHeader title={t.dashboard.expiringPlans} colors={colors} />
            <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 mb-5 overflow-hidden">
              {data.expiringPlans.slice(0, 5).map((p, i) => (
                <TouchableOpacity
                  key={p.id}
                  className={`flex-row items-center px-4 py-3 ${i < Math.min(data.expiringPlans.length, 5) - 1 ? "border-b border-gray-50 dark:border-slate-700/40" : ""}`}
                  onPress={() => router.push(`/(coach)/clients/${p.clientId}` as never)}
                  activeOpacity={0.6}
                >
                  <View className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-900/25 items-center justify-center mr-3">
                    <AlertCircle size={16} color="#f59e0b" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">{p.clientName}</Text>
                    <Text className="text-xs text-gray-500 dark:text-slate-400">{p.planName}</Text>
                  </View>
                  {p.endDate && (
                    <Text className="text-xs text-amber-600 dark:text-amber-300">
                      {new Date(p.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Recent Check-ins */}
        {data.checkIns && data.checkIns.length > 0 && (
          <>
            <SectionHeader title={t.dashboard.recentCheckIns} colors={colors} />
            <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 mb-5 overflow-hidden">
              {data.checkIns.slice(0, 5).map((c, i) => (
                <TouchableOpacity
                  key={c.id}
                  className={`flex-row items-center px-4 py-3 ${i < Math.min(data.checkIns.length, 5) - 1 ? "border-b border-gray-50 dark:border-slate-700/40" : ""}`}
                  onPress={() => router.push(`/(coach)/clients/${c.clientId}` as never)}
                  activeOpacity={0.6}
                >
                  <View className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-900/25 items-center justify-center mr-3">
                    <ClipboardCheck size={16} color="#6366f1" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">{c.clientName}</Text>
                  </View>
                  <Text className="text-xs text-gray-400 dark:text-slate-500">{formatRelative(c.submittedAt)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Profile Stats */}
        {data.profileStats && data.profileStats.incompleteCount > 0 && (
          <>
            <SectionHeader title="Incomplete Profiles" colors={colors} />
            <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 mb-5 overflow-hidden">
              {data.profileStats.incomplete.slice(0, 5).map((p, i) => (
                <TouchableOpacity
                  key={p.id}
                  className={`flex-row items-center px-4 py-3 ${i < Math.min(data.profileStats.incomplete.length, 5) - 1 ? "border-b border-gray-50 dark:border-slate-700/40" : ""}`}
                  onPress={() => router.push(`/(coach)/clients/${p.id}` as never)}
                  activeOpacity={0.6}
                >
                  <View className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-700 items-center justify-center mr-3">
                    <UserX size={16} color={colors.icon} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-900 dark:text-slate-50">{p.name}</Text>
                    <Text className="text-xs text-gray-500 dark:text-slate-400">{p.filled}/{p.total} fields{!p.hasPortalAccess ? " · No portal" : ""}</Text>
                  </View>
                  <View className="bg-gray-100 dark:bg-slate-700 rounded-full w-8 h-8 items-center justify-center">
                    <Text className="text-xs font-bold text-gray-600 dark:text-slate-300">{Math.round((p.filled / p.total) * 100)}%</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Recent Activity */}
        {data.activityFeed.length > 0 && (
          <>
            <SectionHeader title={t.dashboard.recentActivity} colors={colors} />
            <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 mb-5 overflow-hidden">
              {data.activityFeed.slice(0, 8).map((a, i) => (
                <View
                  key={`${a.type}-${a.date}-${i}`}
                  className={`flex-row items-center px-4 py-3 ${
                    i < Math.min(data.activityFeed.length, 8) - 1
                      ? "border-b border-gray-50 dark:border-slate-700/40"
                      : ""
                  }`}
                >
                  <View
                    className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                      a.type === "payment"
                        ? "bg-green-50 dark:bg-green-900/25"
                        : a.type === "workout"
                        ? "bg-purple-50 dark:bg-purple-900/20"
                        : a.type === "checkin"
                        ? "bg-blue-50 dark:bg-blue-900/25"
                        : "bg-gray-50 dark:bg-slate-700"
                    }`}
                  >
                    <ActivityIcon type={a.type} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm text-gray-900 dark:text-slate-50"
                      numberOfLines={1}
                    >
                      {a.text}
                    </Text>
                    {a.detail && (
                      <Text
                        className="text-xs text-gray-500 dark:text-slate-400 mt-0.5"
                        numberOfLines={1}
                      >
                        {a.detail}
                      </Text>
                    )}
                  </View>
                  <Text className="text-xs text-gray-400 dark:text-slate-500 ml-2">
                    {formatRelative(a.date)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  onPress,
  colors,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  sub?: string;
  onPress?: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <TouchableOpacity
      className="w-1/2 px-1.5 mb-3"
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-4">
        <Icon size={18} color={colors.brand} />
        <Text className="text-2xl font-bold text-gray-900 dark:text-slate-50 mt-2">{value}</Text>
        <Text className="text-xs text-gray-500 dark:text-slate-400">
          {label}
          {sub ? ` ${sub}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({
  title,
  count,
  onPress,
  colors,
}: {
  title: string;
  count?: number;
  onPress?: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between mb-2"
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
    >
      <Text className="text-base font-semibold text-gray-900 dark:text-slate-50">
        {title}
        {count != null ? ` (${count})` : ""}
      </Text>
      {onPress && <ChevronRight size={16} color={colors.iconMuted} />}
    </TouchableOpacity>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-6 mb-5 items-center">
      <Text className="text-sm text-gray-400 dark:text-slate-500">{text}</Text>
    </View>
  );
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "payment":
      return <CreditCard size={16} color="#10b981" />;
    case "workout":
      return <Dumbbell size={16} color="#8b5cf6" />;
    case "checkin":
      return <Clock size={16} color="#3b82f6" />;
    default:
      return <MessageCircle size={16} color="#6b7280" />;
  }
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
