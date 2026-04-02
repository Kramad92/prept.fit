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
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { ClientProfile, AssignedMealPlan, ClientMeal, Food, Meal } from "@/types/api";

function MacroPill({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <View className="items-center">
      <Text className="text-lg font-bold text-gray-900 dark:text-slate-50">{value}</Text>
      <Text className="text-xs text-gray-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}

function FoodRow({ food }: { food: Food }) {
  return (
    <View className="flex-row items-center py-2 border-b border-gray-50 dark:border-slate-700/40">
      <View className="flex-1">
        <Text className="text-sm text-gray-900 dark:text-slate-50">{food.name}</Text>
        {food.portion ? <Text className="text-xs text-gray-400 dark:text-slate-500">{food.portion}</Text> : null}
      </View>
      <View className="flex-row gap-3">
        {food.calories != null && <Text className="text-xs text-gray-500 dark:text-slate-400 w-12 text-right">{food.calories} cal</Text>}
        {food.protein != null && <Text className="text-xs text-gray-500 dark:text-slate-400 w-8 text-right">{food.protein}p</Text>}
        {food.carbs != null && <Text className="text-xs text-gray-500 dark:text-slate-400 w-8 text-right">{food.carbs}c</Text>}
        {food.fat != null && <Text className="text-xs text-gray-500 dark:text-slate-400 w-8 text-right">{food.fat}f</Text>}
      </View>
    </View>
  );
}

function MealCard({ meal }: { meal: ClientMeal | Meal }) {
  const [expanded, setExpanded] = useState(false);
  const colors = useThemeColors();
  const totalCals = meal.foods.reduce((s, f) => s + (f.calories || 0), 0);

  return (
    <View className="bg-gray-50 dark:bg-slate-950 rounded-lg p-3 mb-2">
      <TouchableOpacity className="flex-row items-center" onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900 dark:text-slate-50">{meal.name}</Text>
          {meal.time && <Text className="text-xs text-gray-400 dark:text-slate-500">{meal.time}</Text>}
        </View>
        <Text className="text-xs text-gray-500 dark:text-slate-400 mr-2">{totalCals} cal</Text>
        {expanded ? <ChevronUp size={16} color={colors.iconMuted} /> : <ChevronDown size={16} color={colors.iconMuted} />}
      </TouchableOpacity>
      {expanded && meal.foods.length > 0 && (
        <View className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700/40">
          {meal.foods.map((food, idx) => <FoodRow key={food.id || `${meal.id}-${idx}`} food={food} />)}
        </View>
      )}
    </View>
  );
}

function PlanCard({ plan }: { plan: AssignedMealPlan }) {
  const [expanded, setExpanded] = useState(false);
  const colors = useThemeColors();
  const meals = plan.clientMeals.length > 0
    ? [...plan.clientMeals].sort((a, b) => a.orderIndex - b.orderIndex)
    : [...plan.mealPlan.meals].sort((a, b) => a.orderIndex - b.orderIndex);
  const mp = plan.mealPlan;

  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 mb-3 overflow-hidden">
      <TouchableOpacity className="p-4" onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900 dark:text-slate-50">{plan.customName || mp.name}</Text>
            <Text className="text-sm text-gray-500 dark:text-slate-400">
              {meals.length} meal{meals.length !== 1 ? "s" : ""}{!plan.isActive ? " · Inactive" : ""}
            </Text>
          </View>
          {expanded ? <ChevronUp size={18} color={colors.iconMuted} /> : <ChevronDown size={18} color={colors.iconMuted} />}
        </View>
        {(mp.targetCalories || mp.targetProtein || mp.targetCarbs || mp.targetFat) && (
          <View className="flex-row justify-around mt-3 pt-3 border-t border-gray-50 dark:border-slate-700/40">
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
  const t = useT();
  const colors = useThemeColors();

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
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <View className="px-4 pt-4">
          <View className="h-7 w-32 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
          <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-slate-700/40 h-32" />
          <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-slate-700/40 h-32" />
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
      <AppHeader title={t.nav.nutrition} />
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >

        {totalMacros.calories > 0 && (
          <View className="bg-brand-50 rounded-xl p-4 mb-4 border border-brand-100">
            <View className="flex-row items-center mb-2">
              <Flame size={16} color={colors.brand} />
              <Text className="text-sm font-medium text-brand-800 ml-1">Daily Targets</Text>
            </View>
            <View className="flex-row justify-around">
              <MacroPill label={t.nutrition.calories} value={totalMacros.calories} />
              <MacroPill label={t.nutrition.protein} value={totalMacros.protein} />
              <MacroPill label={t.nutrition.carbs} value={totalMacros.carbs} />
              <MacroPill label={t.nutrition.fat} value={totalMacros.fat} />
            </View>
          </View>
        )}

        {activePlans.length === 0 && inactivePlans.length === 0 ? (
          <View className="items-center justify-center py-16">
            <UtensilsCrossed size={48} color={colors.iconMuted} />
            <Text className="text-gray-400 dark:text-slate-500 mt-3 text-base">{t.portalNutrition.noPlans}</Text>
          </View>
        ) : (
          <>
            {activePlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
            {inactivePlans.length > 0 && (
              <>
                <Text className="text-sm text-gray-400 dark:text-slate-500 mt-4 mb-2">Inactive Plans</Text>
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
