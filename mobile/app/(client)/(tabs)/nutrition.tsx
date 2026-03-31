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
import { api } from "@/lib/api-client";
import { UtensilsCrossed, ChevronDown, ChevronUp, Flame } from "lucide-react-native";
import { QueryError } from "@/components/query-error";
import { AppHeader } from "@/components/app-header";
import type { ClientProfile, AssignedMealPlan, ClientMeal, Food, Meal } from "@/types/api";

function MacroPill({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <View className="items-center">
      <Text className="text-lg font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-500">{label}</Text>
    </View>
  );
}

function FoodRow({ food }: { food: Food }) {
  return (
    <View className="flex-row items-center py-2 border-b border-gray-50">
      <View className="flex-1">
        <Text className="text-sm text-gray-900">{food.name}</Text>
        {food.portion ? <Text className="text-xs text-gray-400">{food.portion}</Text> : null}
      </View>
      <View className="flex-row gap-3">
        {food.calories != null && <Text className="text-xs text-gray-500 w-12 text-right">{food.calories} cal</Text>}
        {food.protein != null && <Text className="text-xs text-gray-500 w-8 text-right">{food.protein}p</Text>}
        {food.carbs != null && <Text className="text-xs text-gray-500 w-8 text-right">{food.carbs}c</Text>}
        {food.fat != null && <Text className="text-xs text-gray-500 w-8 text-right">{food.fat}f</Text>}
      </View>
    </View>
  );
}

function MealCard({ meal }: { meal: ClientMeal | Meal }) {
  const [expanded, setExpanded] = useState(false);
  const totalCals = meal.foods.reduce((s, f) => s + (f.calories || 0), 0);

  return (
    <View className="bg-gray-50 rounded-lg p-3 mb-2">
      <TouchableOpacity className="flex-row items-center" onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900">{meal.name}</Text>
          {meal.time && <Text className="text-xs text-gray-400">{meal.time}</Text>}
        </View>
        <Text className="text-xs text-gray-500 mr-2">{totalCals} cal</Text>
        {expanded ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
      </TouchableOpacity>
      {expanded && meal.foods.length > 0 && (
        <View className="mt-2 pt-2 border-t border-gray-100">
          {meal.foods.map((food, idx) => <FoodRow key={food.id || `${meal.id}-${idx}`} food={food} />)}
        </View>
      )}
    </View>
  );
}

function PlanCard({ plan }: { plan: AssignedMealPlan }) {
  const [expanded, setExpanded] = useState(false);
  const meals = plan.clientMeals.length > 0
    ? [...plan.clientMeals].sort((a, b) => a.orderIndex - b.orderIndex)
    : [...plan.mealPlan.meals].sort((a, b) => a.orderIndex - b.orderIndex);
  const mp = plan.mealPlan;

  return (
    <View className="bg-white rounded-xl border border-gray-100 mb-3 overflow-hidden">
      <TouchableOpacity className="p-4" onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">{plan.customName || mp.name}</Text>
            <Text className="text-sm text-gray-500">
              {meals.length} meal{meals.length !== 1 ? "s" : ""}{!plan.isActive ? " · Inactive" : ""}
            </Text>
          </View>
          {expanded ? <ChevronUp size={18} color="#9ca3af" /> : <ChevronDown size={18} color="#9ca3af" />}
        </View>
        {(mp.targetCalories || mp.targetProtein || mp.targetCarbs || mp.targetFat) && (
          <View className="flex-row justify-around mt-3 pt-3 border-t border-gray-50">
            <MacroPill label="Calories" value={mp.targetCalories} />
            <MacroPill label="Protein" value={mp.targetProtein} />
            <MacroPill label="Carbs" value={mp.targetCarbs} />
            <MacroPill label="Fat" value={mp.targetFat} />
          </View>
        )}
      </TouchableOpacity>
      {expanded && (
        <View className="px-4 pb-4">
          {meals.map((meal) => <MealCard key={meal.id} meal={meal} />)}
        </View>
      )}
    </View>
  );
}

export default function NutritionScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: profile, isLoading, isError, refetch } = useQuery<ClientProfile>({
    queryKey: ["client-profile"],
    queryFn: () => api.get<ClientProfile>("/api/portal/me"),
  });

  const activePlans = useMemo(() => profile?.assignedMealPlans?.filter((p) => p.isActive) || [], [profile]);
  const inactivePlans = useMemo(() => profile?.assignedMealPlans?.filter((p) => !p.isActive) || [], [profile]);

  const totalMacros = useMemo(() => {
    return activePlans.reduce(
      (acc, p) => ({
        calories: acc.calories + (p.mealPlan.targetCalories || 0),
        protein: acc.protein + (p.mealPlan.targetProtein || 0),
        carbs: acc.carbs + (p.mealPlan.targetCarbs || 0),
        fat: acc.fat + (p.mealPlan.targetFat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [activePlans]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["client-profile"] });
    setRefreshing(false);
  }, [queryClient]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="px-4 pt-4">
          <View className="h-7 w-32 bg-gray-200 rounded mb-4" />
          <View className="bg-white rounded-xl p-4 mb-3 border border-gray-100 h-32" />
          <View className="bg-white rounded-xl p-4 mb-3 border border-gray-100 h-32" />
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
      <AppHeader title="Nutrition" />
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      >

        {totalMacros.calories > 0 && (
          <View className="bg-brand-50 rounded-xl p-4 mb-4 border border-brand-100">
            <View className="flex-row items-center mb-2">
              <Flame size={16} color="#059669" />
              <Text className="text-sm font-medium text-brand-800 ml-1">Daily Targets</Text>
            </View>
            <View className="flex-row justify-around">
              <MacroPill label="Calories" value={totalMacros.calories} />
              <MacroPill label="Protein" value={totalMacros.protein} />
              <MacroPill label="Carbs" value={totalMacros.carbs} />
              <MacroPill label="Fat" value={totalMacros.fat} />
            </View>
          </View>
        )}

        {activePlans.length === 0 && inactivePlans.length === 0 ? (
          <View className="items-center justify-center py-16">
            <UtensilsCrossed size={48} color="#d1d5db" />
            <Text className="text-gray-400 mt-3 text-base">No meal plans assigned</Text>
          </View>
        ) : (
          <>
            {activePlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
            {inactivePlans.length > 0 && (
              <>
                <Text className="text-sm text-gray-400 mt-4 mb-2">Inactive Plans</Text>
                {inactivePlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
              </>
            )}
          </>
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
