import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { haptics } from "@/lib/haptics";
import { CheckCircle, Circle, Flame } from "lucide-react-native";
import { QueryError } from "@/components/query-error";
import { AppHeader } from "@/components/app-header";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { AssignedHabit } from "@/types/api";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function logMatchesDate(logDate: string, targetDateStr: string): boolean {
  const d = new Date(logDate);
  return getDateStr(d) === targetDateStr;
}

function getLast7Days(): Date[] {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function computeStreak(habits: AssignedHabit[]): number {
  if (habits.length === 0) return 0;
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStr = getDateStr(today);
  const todayDone = habits.every((h) =>
    h.logs.some((l) => logMatchesDate(l.date, todayStr) && l.completed)
  );
  const startOffset = todayDone ? 0 : 1;

  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = getDateStr(d);
    const allDone = habits.every((h) =>
      h.logs.some((l) => logMatchesDate(l.date, dateStr) && l.completed)
    );
    if (allDone) streak++;
    else break;
  }
  return streak;
}

export default function HabitsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const t = useT();
  const colors = useThemeColors();

  const todayStr = getDateStr(new Date());
  const last7 = useMemo(() => getLast7Days(), []);

  const { data: habits, isLoading, isError, refetch } = useQuery<AssignedHabit[]>({
    queryKey: ["habits", user?.clientProfileId],
    queryFn: () => api.get<AssignedHabit[]>(`/api/habits/log?clientId=${user?.clientProfileId}&days=30`),
    enabled: !!user?.clientProfileId,
  });

  const activeHabits = useMemo(() => habits?.filter((h) => h.isActive) || [], [habits]);
  const todayDone = useMemo(
    () => activeHabits.filter((h) => h.logs.some((l) => logMatchesDate(l.date, todayStr) && l.completed)).length,
    [activeHabits, todayStr]
  );
  const streak = useMemo(() => computeStreak(activeHabits), [activeHabits]);

  const toggleMutation = useMutation({
    mutationFn: async ({ clientHabitId, completed }: { clientHabitId: string; completed: boolean }) => {
      return api.post("/api/habits/log", { clientHabitId, date: todayStr, completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits", user?.clientProfileId] });
    },
  });

  const toggleHabit = useCallback(
    (habit: AssignedHabit) => {
      const isDone = habit.logs.some((l) => logMatchesDate(l.date, todayStr) && l.completed);
      haptics.light();
      setTogglingId(habit.id);
      toggleMutation.mutate({ clientHabitId: habit.id, completed: !isDone }, { onSettled: () => setTogglingId(null) });
    },
    [todayStr, toggleMutation]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["habits", user?.clientProfileId] });
    setRefreshing(false);
  }, [queryClient, user]);

  const dateDisplay = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <View className="px-4 pt-4">
          <View className="h-7 w-32 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
          <View className="h-4 w-48 bg-gray-100 dark:bg-slate-700 rounded mb-6" />
          {[1, 2, 3].map((i) => <View key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-slate-700/40 h-16" />)}
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <QueryError onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <AppHeader title={t.nav.habits} subtitle={dateDisplay} />
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >

        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700/40 items-center">
            <Text className="text-xl font-bold text-brand-600">{todayDone}/{activeHabits.length}</Text>
            <Text className="text-xs text-gray-500 dark:text-slate-400">{t.common.today}</Text>
          </View>
          <View className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700/40 items-center flex-row justify-center">
            <Flame size={18} color="#f59e0b" />
            <Text className="text-xl font-bold text-gray-900 dark:text-slate-50 ml-1">{streak}</Text>
            <Text className="text-xs text-gray-500 dark:text-slate-400 ml-1">day streak</Text>
          </View>
        </View>

        <View className="flex-row justify-between mb-4 bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700/40">
          {last7.map((day) => {
            const ds = getDateStr(day);
            const isToday = ds === todayStr;
            const allDone = activeHabits.length > 0 && activeHabits.every((h) => h.logs.some((l) => logMatchesDate(l.date, ds) && l.completed));
            const someDone = !allDone && activeHabits.some((h) => h.logs.some((l) => logMatchesDate(l.date, ds) && l.completed));
            return (
              <View key={ds} className="items-center">
                <Text className={`text-xs mb-1 ${isToday ? "text-brand-600 font-bold" : "text-gray-400 dark:text-slate-500"}`}>{DAY_NAMES[day.getDay()]}</Text>
                <View className={`w-8 h-8 rounded-full items-center justify-center ${allDone ? "bg-brand-500" : someDone ? "bg-brand-200" : isToday ? "bg-gray-200 dark:bg-slate-700" : "bg-gray-100 dark:bg-slate-700"}`}>
                  <Text className={`text-xs font-medium ${allDone ? "text-white" : "text-gray-600 dark:text-slate-300"}`}>{day.getDate()}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {activeHabits.length === 0 ? (
          <View className="items-center justify-center py-16">
            <CheckCircle size={48} color={colors.iconMuted} />
            <Text className="text-gray-400 dark:text-slate-500 mt-3 text-base">{t.portalHabits.noHabits}</Text>
          </View>
        ) : (
          activeHabits.map((habit) => {
            const isDone = habit.logs.some((l) => logMatchesDate(l.date, todayStr) && l.completed);
            const isToggling = togglingId === habit.id;
            return (
              <TouchableOpacity
                key={habit.id}
                className={`flex-row items-center bg-white dark:bg-slate-800 rounded-xl p-4 mb-2 border ${isDone ? "border-brand-200 bg-brand-50" : "border-gray-100 dark:border-slate-700/40"}`}
                onPress={() => toggleHabit(habit)}
                activeOpacity={0.7}
                disabled={isToggling}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
              >
                {isToggling ? (
                  <ActivityIndicator size="small" color={colors.brand} />
                ) : isDone ? (
                  <CheckCircle size={24} color={colors.brand} />
                ) : (
                  <Circle size={24} color={colors.iconMuted} />
                )}
                <Text className="text-2xl ml-3">{habit.habit.icon || "✅"}</Text>
                <Text className={`flex-1 ml-2 text-base ${isDone ? "text-brand-800 line-through" : "text-gray-900 dark:text-slate-50"}`}>{habit.habit.name}</Text>
              </TouchableOpacity>
            );
          })
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
