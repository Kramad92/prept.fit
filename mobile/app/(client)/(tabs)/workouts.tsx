import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { api } from "@/lib/api-client";
import { Dumbbell, ChevronRight, Filter } from "lucide-react-native";
import { QueryError } from "@/components/query-error";
import { AppHeader } from "@/components/app-header";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { ClientProfile } from "@/types/api";

export default function WorkoutsScreen() {
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const t = useT();
  const colors = useThemeColors();

  const { data: profile, isLoading, isError, refetch } = useQuery<ClientProfile>({
    queryKey: ["client-profile"],
    queryFn: () => api.get<ClientProfile>("/api/portal/me"),
  });

  const plans = useMemo(() => {
    const all = profile?.assignedPlans || [];
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

        {plans.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Dumbbell size={48} color={colors.iconMuted} />
            <Text className="text-gray-400 dark:text-slate-500 mt-3 text-base">
              {showAll ? t.portalWorkouts.noPlans : "No active plans"}
            </Text>
            {!showAll && (profile?.assignedPlans?.length || 0) > 0 && (
              <TouchableOpacity onPress={() => setShowAll(true)} className="mt-2">
                <Text className="text-brand-600 text-sm font-medium">Show all plans</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          plans.map((plan) => {
            const exercises = plan.clientExercises.length > 0
              ? plan.clientExercises
              : plan.workoutPlan.exercises;
            return (
              <TouchableOpacity
                key={plan.id}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-slate-700/40 flex-row items-center"
                activeOpacity={0.7}
                onPress={() => router.push(`/(client)/workouts/${plan.id}`)}
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
                  </View>
                  <Text className="text-sm text-gray-500 dark:text-slate-400">
                    {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.iconMuted} />
              </TouchableOpacity>
            );
          })
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
