import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Dumbbell,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar,
  Layers,
  Clock,
  Video,
} from "lucide-react-native";
import { QueryError } from "@/components/query-error";
import { AppHeader } from "@/components/app-header";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useClientProfile } from "@/hooks/use-client-data";
import type { AssignedWorkoutProgram, AssignedWorkoutPlan, WorkoutProgramDay, ClientExercise, Exercise } from "@/types/api";

function StandalonePlanCard({ plan }: { plan: AssignedWorkoutPlan }) {
  const colors = useThemeColors();
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const exercises: (ClientExercise | Exercise)[] =
    plan.clientExercises.length > 0
      ? [...plan.clientExercises].sort((a, b) => a.orderIndex - b.orderIndex)
      : [...plan.workoutPlan.exercises].sort((a, b) => a.orderIndex - b.orderIndex);

  const daysLeft = plan.endDate
    ? Math.ceil((new Date(plan.endDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl mb-3 border border-gray-100 dark:border-slate-700/40 overflow-hidden">
      <TouchableOpacity
        className="p-4 flex-row items-center"
        activeOpacity={0.7}
        onPress={() => setExpanded(!expanded)}
      >
        <View className="w-10 h-10 rounded-full bg-brand-50 items-center justify-center mr-3">
          <Dumbbell size={20} color={colors.brand} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-base font-semibold text-gray-900 dark:text-slate-50 flex-1" numberOfLines={1}>
              {plan.customName || plan.workoutPlan.name}
            </Text>
            {!plan.isActive && (
              <View className="bg-gray-100 dark:bg-slate-700 rounded-full px-2 py-0.5 ml-2">
                <Text className="text-xs text-gray-500 dark:text-slate-400">{t.clients.inactive}</Text>
              </View>
            )}
            {plan.mode === "live" && (
              <View className="bg-purple-50 dark:bg-purple-900/25 rounded-full px-2 py-0.5 ml-2">
                <Text className="text-xs text-purple-700 dark:text-purple-300 font-medium">Live</Text>
              </View>
            )}
          </View>
          <Text className="text-sm text-gray-500 dark:text-slate-400">
            {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
            {daysLeft != null && daysLeft > 0 && daysLeft <= 14 ? ` · ${daysLeft}d left` : ""}
          </Text>
        </View>
        {expanded ? <ChevronUp size={18} color={colors.iconMuted} /> : <ChevronDown size={18} color={colors.iconMuted} />}
      </TouchableOpacity>

      {expanded && (
        <View className="px-4 pb-3 border-t border-gray-50 dark:border-slate-700/40 pt-2">
          {exercises.map((ex, i) => (
            <View key={ex.id} className="flex-row items-start py-2">
              <Text className="text-xs font-bold text-gray-400 dark:text-slate-500 w-5 mt-0.5">{i + 1}</Text>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">{ex.name}</Text>
                <View className="flex-row flex-wrap gap-x-3 mt-0.5">
                  {ex.sets != null && <Text className="text-xs text-gray-500 dark:text-slate-400">{ex.sets} sets</Text>}
                  {ex.reps && <Text className="text-xs text-gray-500 dark:text-slate-400">{ex.reps} reps</Text>}
                  {ex.weight && <Text className="text-xs text-gray-500 dark:text-slate-400">{ex.weight}</Text>}
                  {ex.restSeconds != null && ex.restSeconds > 0 && (
                    <View className="flex-row items-center">
                      <Clock size={10} color={colors.iconMuted} />
                      <Text className="text-xs text-gray-500 dark:text-slate-400 ml-0.5">{ex.restSeconds}s</Text>
                    </View>
                  )}
                </View>
                {ex.notes && <Text className="text-xs text-gray-400 dark:text-slate-500 mt-0.5" numberOfLines={2}>{ex.notes}</Text>}
                {ex.videoUrl && (
                  <TouchableOpacity
                    className="flex-row items-center mt-1"
                    onPress={() => Linking.openURL(ex.videoUrl!).catch(() => {})}
                  >
                    <Video size={12} color={colors.brand} />
                    <Text className="text-xs text-brand-600 ml-1">Watch Video</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          <TouchableOpacity
            className="bg-brand-600 rounded-lg py-2.5 items-center mt-2"
            onPress={() => router.push(`/(client)/workouts/${plan.id}`)}
            activeOpacity={0.7}
          >
            <Text className="text-white font-semibold text-sm">View & Start Workout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ProgramCard({ program }: { program: AssignedWorkoutProgram }) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState<number>(program.currentWeek);

  const weeks = useMemo(() => {
    const map = new Map<number, WorkoutProgramDay[]>();
    for (const day of program.program.days) {
      const arr = map.get(day.weekNumber) || [];
      arr.push(day);
      map.set(day.weekNumber, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([week, days]) => ({
        week,
        days: days.sort((a, b) => a.dayNumber - b.dayNumber),
      }));
  }, [program.program.days]);

  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 mb-3 overflow-hidden">
      <TouchableOpacity
        className="p-4 flex-row items-center"
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View className="w-10 h-10 rounded-full bg-brand-50 items-center justify-center mr-3">
          <Layers size={20} color={colors.brand} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900 dark:text-slate-50">
            {program.program.name}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-slate-400">
            {program.program.durationWeeks} weeks · Week {program.currentWeek}
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={18} color={colors.iconMuted} />
        ) : (
          <ChevronDown size={18} color={colors.iconMuted} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View className="px-4 pb-4">
          {weeks.map(({ week, days }) => {
            const isCurrent = week === program.currentWeek;
            const isWeekExpanded = expandedWeek === week;
            return (
              <View key={week} className="mb-1">
                <TouchableOpacity
                  className={`flex-row items-center py-2.5 px-3 rounded-lg ${
                    isCurrent
                      ? "bg-brand-50 dark:bg-brand-900/20"
                      : "bg-gray-50 dark:bg-slate-900/50"
                  }`}
                  onPress={() => setExpandedWeek(isWeekExpanded ? -1 : week)}
                  activeOpacity={0.7}
                >
                  <Calendar size={14} color={isCurrent ? colors.brand : colors.iconMuted} />
                  <Text
                    className={`flex-1 text-sm font-medium ml-2 ${
                      isCurrent
                        ? "text-brand-700 dark:text-brand-300"
                        : "text-gray-700 dark:text-slate-300"
                    }`}
                  >
                    Week {week}
                    {isCurrent ? " (Current)" : ""}
                  </Text>
                  {isWeekExpanded ? (
                    <ChevronUp size={14} color={colors.iconMuted} />
                  ) : (
                    <ChevronDown size={14} color={colors.iconMuted} />
                  )}
                </TouchableOpacity>

                {isWeekExpanded &&
                  days.map((day) => (
                    <TouchableOpacity
                      key={day.id}
                      className="flex-row items-center py-2.5 px-3 ml-5 border-l border-gray-200 dark:border-slate-700"
                      activeOpacity={0.7}
                      onPress={() => {
                        // Find the matching client workout plan for this day
                        // Deep-copied plans have sourceTemplate.id pointing to the original template plan
                        const cwp = program.clientWorkoutPlans.find(
                          (p) =>
                            p.workoutPlan.sourceTemplate?.id === day.workoutPlanId ||
                            p.workoutPlan.id === day.workoutPlanId
                        );
                        if (cwp) router.push(`/(client)/workouts/${cwp.id}`);
                      }}
                      disabled={!day.workoutPlanId}
                    >
                      <View className="flex-1">
                        <Text className="text-sm text-gray-900 dark:text-slate-50">
                          Day {day.dayNumber}
                          {day.label ? ` — ${day.label}` : ""}
                        </Text>
                        {day.workoutPlan ? (
                          <Text className="text-xs text-gray-500 dark:text-slate-400">
                            {day.workoutPlan.name}
                          </Text>
                        ) : (
                          <Text className="text-xs text-gray-400 dark:text-slate-500">
                            Rest day
                          </Text>
                        )}
                      </View>
                      {day.workoutPlanId && (
                        <ChevronRight size={14} color={colors.iconMuted} />
                      )}
                    </TouchableOpacity>
                  ))}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function WorkoutsScreen() {
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const t = useT();
  const colors = useThemeColors();

  const { data: profile, isLoading, isError, refetch } = useClientProfile();

  const programs = useMemo(() => profile?.assignedPrograms || [], [profile]);

  // Filter standalone plans (not part of a program)
  const plans = useMemo(() => {
    const all = (profile?.assignedPlans || []).filter(
      (p) => !p.clientWorkoutProgramId
    );
    return showAll ? all : all.filter((p) => p.isActive);
  }, [profile, showAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["client-profile"] });
    setRefreshing(false);
  }, [queryClient]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <View className="px-4 pt-4">
          <View className="h-7 w-32 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
          {[1, 2, 3].map((i) => (
            <View key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-slate-700/40">
              <View className="h-5 w-40 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
              <View className="h-4 w-24 bg-gray-100 dark:bg-slate-700 rounded" />
            </View>
          ))}
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

  const hasContent = programs.length > 0 || plans.length > 0;
  const allStandalone = profile?.assignedPlans?.filter((p) => !p.clientWorkoutProgramId) || [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <AppHeader
        title={t.nav.workouts}
        rightContent={
          <TouchableOpacity
            onPress={() => setShowAll(!showAll)}
            className="flex-row items-center px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-700 ml-1"
          >
            <Filter size={14} color={colors.icon} />
            <Text className="text-xs text-gray-600 dark:text-slate-300 ml-1.5 font-medium">
              {showAll ? t.common.all : t.clients.active}
            </Text>
          </TouchableOpacity>
        }
      />
      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      >
        {!hasContent ? (
          <View className="items-center justify-center py-16">
            <Dumbbell size={48} color={colors.iconMuted} />
            <Text className="text-gray-400 dark:text-slate-500 mt-3 text-base">
              {showAll ? t.portalWorkouts.noPlans : "No active plans"}
            </Text>
            {!showAll && allStandalone.length > 0 && (
              <TouchableOpacity onPress={() => setShowAll(true)} className="mt-2">
                <Text className="text-brand-600 text-sm font-medium">Show all plans</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {/* Workout Programs */}
            {programs.length > 0 && (
              <>
                <Text className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-1">
                  Programs
                </Text>
                {programs.map((prog) => (
                  <ProgramCard key={prog.id} program={prog} />
                ))}
              </>
            )}

            {/* Standalone Plans */}
            {plans.length > 0 && (
              <>
                {programs.length > 0 && (
                  <Text className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-3">
                    Standalone Plans
                  </Text>
                )}
                {plans.map((plan) => (
                  <StandalonePlanCard key={plan.id} plan={plan} />
                ))}
              </>
            )}

            {/* Show all toggle */}
            {!showAll && allStandalone.some((p) => !p.isActive) && (
              <TouchableOpacity
                onPress={() => setShowAll(true)}
                className="items-center py-3"
              >
                <Text className="text-brand-600 text-sm font-medium">
                  Show inactive plans
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
