import { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { ArrowLeft, Play, Clock, Weight } from "lucide-react-native";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useClientProfile } from "@/hooks/use-client-data";
import { QueryError } from "@/components/query-error";
import type { ClientExercise, Exercise } from "@/types/api";

export default function PlanDetailScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const t = useT();
  const colors = useThemeColors();

  const { data: profile, isLoading, isError, refetch } = useClientProfile();

  const plan = useMemo(
    () => profile?.assignedPlans?.find((p) => p.id === planId),
    [profile, planId]
  );

  const exercises: (ClientExercise | Exercise)[] = useMemo(() => {
    if (!plan) return [];
    const list = plan.clientExercises.length > 0
      ? plan.clientExercises
      : plan.workoutPlan.exercises;
    return [...list].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [plan]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <QueryError message="Failed to load workout" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400 dark:text-slate-500">Plan not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900 dark:text-slate-50" numberOfLines={1}>
            {plan.customName || plan.workoutPlan.name}
          </Text>
          {plan.workoutPlan.description && (
            <Text className="text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
              {plan.workoutPlan.description}
            </Text>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {exercises.map((ex, index) => (
          <View key={ex.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-slate-700/40">
            <View className="flex-row items-start">
              <View className="w-7 h-7 rounded-full bg-brand-50 items-center justify-center mr-3 mt-0.5">
                <Text className="text-xs font-bold text-brand-700">{index + 1}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 dark:text-slate-50">{ex.name}</Text>
                <View className="flex-row flex-wrap mt-1.5 gap-x-4 gap-y-1">
                  {ex.sets != null && (
                    <Text className="text-sm text-gray-500 dark:text-slate-400">{ex.sets} {t.portalWorkouts.sets}</Text>
                  )}
                  {ex.reps && (
                    <Text className="text-sm text-gray-500 dark:text-slate-400">{ex.reps} {t.portalWorkouts.reps}</Text>
                  )}
                  {ex.weight && (
                    <View className="flex-row items-center">
                      <Weight size={12} color={colors.iconMuted} />
                      <Text className="text-sm text-gray-500 dark:text-slate-400 ml-1">{ex.weight}</Text>
                    </View>
                  )}
                  {ex.restSeconds != null && ex.restSeconds > 0 && (
                    <View className="flex-row items-center">
                      <Clock size={12} color={colors.iconMuted} />
                      <Text className="text-sm text-gray-500 dark:text-slate-400 ml-1">{ex.restSeconds}s {t.portalWorkouts.rest}</Text>
                    </View>
                  )}
                </View>
                {ex.notes && (
                  <Text className="text-sm text-gray-400 dark:text-slate-500 mt-1.5">{ex.notes}</Text>
                )}
              </View>
            </View>
          </View>
        ))}
        <View className="h-24" />
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 dark:bg-slate-950">
        <TouchableOpacity
          className="bg-brand-600 rounded-xl py-4 flex-row items-center justify-center"
          activeOpacity={0.8}
          onPress={() => router.push(`/(client)/workouts/${planId}/log`)}
        >
          <Play size={20} color="white" fill="white" />
          <Text className="text-white font-bold text-base ml-2">{t.portalWorkouts.startWorkout}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
