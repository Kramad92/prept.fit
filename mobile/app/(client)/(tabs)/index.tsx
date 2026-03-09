import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useClientProfile, useHabits } from "@/hooks/use-client-data";
import {
  Dumbbell,
  Calendar,
  CheckCircle,
  ChevronRight,
} from "lucide-react-native";
import { QueryError } from "@/components/query-error";
import { router } from "expo-router";

function SkeletonCard() {
  return (
    <View className="bg-white rounded-xl p-4 mb-3 border border-gray-100">
      <View className="h-4 w-24 bg-gray-200 rounded mb-3" />
      <View className="h-5 w-48 bg-gray-100 rounded" />
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isError, refetch } = useClientProfile();
  const { data: habits } = useHabits(profile?.id);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  const activeWorkouts = useMemo(
    () => profile?.assignedPlans?.filter((p) => p.isActive) || [],
    [profile]
  );

  const todayStr = new Date().toISOString().split("T")[0];

  const habitsToday = useMemo(() => {
    if (!habits) return { done: 0, total: 0 };
    const active = habits.filter((h) => h.isActive);
    const done = active.filter((h) =>
      h.logs.some((l) => l.date.startsWith(todayStr) && l.completed)
    ).length;
    return { done, total: active.length };
  }, [habits, todayStr]);

  const nextSession = useMemo(() => {
    if (!profile?.schedules) return null;
    return (
      profile.schedules
        .filter(
          (s) =>
            s.status === "scheduled" && new Date(s.date) >= new Date(todayStr)
        )
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )[0] || null
    );
  }, [profile, todayStr]);

  const firstName = user?.name?.split(" ")[0] || "there";

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="px-4 pt-4">
          <View className="h-7 w-40 bg-gray-200 rounded mb-2" />
          <View className="h-4 w-56 bg-gray-100 rounded mb-6" />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <QueryError onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#059669"
          />
        }
      >
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          Hey, {firstName}
        </Text>
        <Text className="text-sm text-gray-500 mb-6">
          Here's your overview for today
        </Text>

        {/* Today's Workout */}
        <TouchableOpacity
          className="bg-white rounded-xl p-4 mb-3 border border-gray-100 flex-row items-center"
          activeOpacity={0.7}
          onPress={() => {
            if (activeWorkouts.length > 0) {
              router.push("/(client)/(tabs)/workouts");
            }
          }}
        >
          <View className="w-10 h-10 rounded-full bg-brand-50 items-center justify-center mr-3">
            <Dumbbell size={20} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-500">
              Today's Workout
            </Text>
            {activeWorkouts.length > 0 ? (
              <Text
                className="text-base font-semibold text-gray-900"
                numberOfLines={1}
              >
                {activeWorkouts[0].customName ||
                  activeWorkouts[0].workoutPlan.name}
              </Text>
            ) : (
              <Text className="text-base text-gray-400">
                No workout assigned
              </Text>
            )}
          </View>
          {activeWorkouts.length > 0 && (
            <ChevronRight size={18} color="#d1d5db" />
          )}
        </TouchableOpacity>

        {/* Habits Progress */}
        <TouchableOpacity
          className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
          activeOpacity={0.7}
          onPress={() => router.push("/(client)/(tabs)/habits")}
        >
          <View className="flex-row items-center mb-2">
            <View className="w-10 h-10 rounded-full bg-brand-50 items-center justify-center mr-3">
              <CheckCircle size={20} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-500">Habits</Text>
              <Text className="text-base font-semibold text-gray-900">
                {habitsToday.total > 0
                  ? `${habitsToday.done}/${habitsToday.total} completed`
                  : "No habits assigned"}
              </Text>
            </View>
          </View>
          {habitsToday.total > 0 && (
            <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <View
                className="h-2 bg-brand-500 rounded-full"
                style={{
                  width: `${(habitsToday.done / habitsToday.total) * 100}%`,
                }}
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Next Session */}
        <TouchableOpacity
          className="bg-white rounded-xl p-4 mb-3 border border-gray-100 flex-row items-center"
          activeOpacity={0.7}
          onPress={() => {
            // Navigate to booking in the future
          }}
        >
          <View className="w-10 h-10 rounded-full bg-brand-50 items-center justify-center mr-3">
            <Calendar size={20} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-500">
              Next Session
            </Text>
            {nextSession ? (
              <>
                <Text
                  className="text-base font-semibold text-gray-900"
                  numberOfLines={1}
                >
                  {nextSession.title}
                </Text>
                <Text className="text-xs text-gray-400">
                  {new Date(nextSession.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at {nextSession.startTime}
                </Text>
              </>
            ) : (
              <Text className="text-base text-gray-400">None booked</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Quick Stats */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-white rounded-xl p-4 border border-gray-100 items-center">
            <Text className="text-2xl font-bold text-brand-600">
              {activeWorkouts.length}
            </Text>
            <Text className="text-xs text-gray-500">Active Plans</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 border border-gray-100 items-center">
            <Text className="text-2xl font-bold text-brand-600">
              {profile?.assignedMealPlans?.filter((p) => p.isActive).length ||
                0}
            </Text>
            <Text className="text-xs text-gray-500">Meal Plans</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 border border-gray-100 items-center">
            <Text className="text-2xl font-bold text-brand-600">
              {profile?.measurements?.length || 0}
            </Text>
            <Text className="text-xs text-gray-500">Check-ins</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
