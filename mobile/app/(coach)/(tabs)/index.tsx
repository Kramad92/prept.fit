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
} from "lucide-react-native";
import { useCoachDashboard } from "@/hooks/use-coach-data";
import { useAuth } from "@/lib/auth-context";
import { QueryError } from "@/components/query-error";

export default function CoachDashboardScreen() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch, isRefetching } =
    useCoachDashboard();

  const firstName = user?.name?.split(" ")[0] || "Coach";

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <QueryError message="Failed to load dashboard" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (!data) return null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#059669"
          />
        }
      >
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          Hi, {firstName}
        </Text>
        <Text className="text-sm text-gray-500 mb-5">Here's your overview</Text>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap -mx-1.5 mb-5">
          <StatCard
            icon={Users}
            label="Active Clients"
            value={data.clientCount}
            sub={`of ${data.totalClients}`}
            onPress={() => router.push("/(coach)/(tabs)/clients")}
          />
          <StatCard
            icon={Dumbbell}
            label="Workout Plans"
            value={data.planCount}
          />
          <StatCard
            icon={UtensilsCrossed}
            label="Meal Plans"
            value={data.mealPlanCount}
          />
          <StatCard
            icon={TrendingUp}
            label="Workouts Logged"
            value={data.weeklyWorkoutCompletion.logged}
            sub="this week"
          />
        </View>

        {/* Today's Sessions */}
        <SectionHeader
          title="Today's Sessions"
          count={data.todaySessions.length}
          onPress={() => router.push("/(coach)/(tabs)/schedule")}
        />
        {data.todaySessions.length === 0 ? (
          <EmptyCard text="No sessions scheduled today" />
        ) : (
          <View className="bg-white rounded-xl border border-gray-100 mb-5 overflow-hidden">
            {data.todaySessions.map((s, i) => (
              <View
                key={s.id}
                className={`flex-row items-center px-4 py-3 ${
                  i < data.todaySessions.length - 1
                    ? "border-b border-gray-50"
                    : ""
                }`}
              >
                <View className="w-9 h-9 rounded-full bg-brand-50 items-center justify-center mr-3">
                  <Calendar size={16} color="#059669" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900">
                    {s.clientName}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {s.startTime} – {s.endTime}
                  </Text>
                </View>
                <View
                  className={`px-2 py-0.5 rounded-full ${
                    s.status === "completed"
                      ? "bg-green-50"
                      : s.status === "cancelled"
                      ? "bg-red-50"
                      : "bg-blue-50"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      s.status === "completed"
                        ? "text-green-700"
                        : s.status === "cancelled"
                        ? "text-red-700"
                        : "text-blue-700"
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
              title="Unread Messages"
              count={data.unreadMessages.total}
              onPress={() => router.push("/(coach)/(tabs)/messages")}
            />
            <View className="bg-white rounded-xl border border-gray-100 mb-5 overflow-hidden">
              {data.unreadMessages.byClient.slice(0, 5).map((m, i) => (
                <TouchableOpacity
                  key={m.clientId}
                  className={`flex-row items-center px-4 py-3 ${
                    i < Math.min(data.unreadMessages.byClient.length, 5) - 1
                      ? "border-b border-gray-50"
                      : ""
                  }`}
                  onPress={() =>
                    router.push(
                      `/(coach)/messages/${m.clientId}` as never
                    )
                  }
                  activeOpacity={0.6}
                >
                  <View className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center mr-3">
                    <MessageCircle size={16} color="#3b82f6" />
                  </View>
                  <Text className="flex-1 text-sm text-gray-900">
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
              title="Payments"
              onPress={() => router.push("/(coach)/payments" as never)}
            />
            <View className="bg-white rounded-xl border border-gray-100 mb-5 overflow-hidden">
              {data.payments.overdueCount > 0 && (
                <TouchableOpacity
                  className="flex-row items-center px-4 py-3 border-b border-gray-50"
                  onPress={() => router.push("/(coach)/payments" as never)}
                  activeOpacity={0.6}
                >
                  <View className="w-9 h-9 rounded-full bg-red-50 items-center justify-center mr-3">
                    <AlertTriangle size={16} color="#ef4444" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-red-700">
                      {data.payments.overdueCount} overdue
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {data.payments.overdueTotal.toFixed(2)} total
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#d1d5db" />
                </TouchableOpacity>
              )}
              {data.payments.pendingCount > 0 && (
                <TouchableOpacity
                  className="flex-row items-center px-4 py-3"
                  onPress={() => router.push("/(coach)/payments" as never)}
                  activeOpacity={0.6}
                >
                  <View className="w-9 h-9 rounded-full bg-amber-50 items-center justify-center mr-3">
                    <CreditCard size={16} color="#f59e0b" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-amber-700">
                      {data.payments.pendingCount} pending
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {data.payments.pendingTotal.toFixed(2)} total
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#d1d5db" />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Recent Activity */}
        {data.activityFeed.length > 0 && (
          <>
            <SectionHeader title="Recent Activity" />
            <View className="bg-white rounded-xl border border-gray-100 mb-5 overflow-hidden">
              {data.activityFeed.slice(0, 8).map((a, i) => (
                <View
                  key={`${a.type}-${a.date}-${i}`}
                  className={`flex-row items-center px-4 py-3 ${
                    i < Math.min(data.activityFeed.length, 8) - 1
                      ? "border-b border-gray-50"
                      : ""
                  }`}
                >
                  <View
                    className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                      a.type === "payment"
                        ? "bg-green-50"
                        : a.type === "workout"
                        ? "bg-purple-50"
                        : a.type === "checkin"
                        ? "bg-blue-50"
                        : "bg-gray-50"
                    }`}
                  >
                    <ActivityIcon type={a.type} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm text-gray-900"
                      numberOfLines={1}
                    >
                      {a.text}
                    </Text>
                    {a.detail && (
                      <Text
                        className="text-xs text-gray-500 mt-0.5"
                        numberOfLines={1}
                      >
                        {a.detail}
                      </Text>
                    )}
                  </View>
                  <Text className="text-xs text-gray-400 ml-2">
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
}: {
  icon: typeof Users;
  label: string;
  value: number;
  sub?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className="w-1/2 px-1.5 mb-3"
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View className="bg-white rounded-xl border border-gray-100 p-4">
        <Icon size={18} color="#059669" />
        <Text className="text-2xl font-bold text-gray-900 mt-2">{value}</Text>
        <Text className="text-xs text-gray-500">
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
}: {
  title: string;
  count?: number;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between mb-2"
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
    >
      <Text className="text-base font-semibold text-gray-900">
        {title}
        {count != null ? ` (${count})` : ""}
      </Text>
      {onPress && <ChevronRight size={16} color="#9ca3af" />}
    </TouchableOpacity>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View className="bg-white rounded-xl border border-gray-100 p-6 mb-5 items-center">
      <Text className="text-sm text-gray-400">{text}</Text>
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
