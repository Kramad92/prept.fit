import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  UtensilsCrossed,
  ChevronDown,
  ChevronUp,
  Flame,
  Plus,
  Search,
  X,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react-native";
import { QueryError } from "@/components/query-error";
import { AppHeader } from "@/components/app-header";
import { AppBottomSheet, BottomSheetTextInput } from "@/components/app-bottom-sheet";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import {
  useClientProfile,
  useNutritionLogs,
  useFoodSearch,
} from "@/hooks/use-client-data";
import type {
  AssignedMealPlan,
  AssignedNutritionProgram,
  NutritionProgramDay,
  ClientMeal,
  Food,
  Meal,
  NutritionLog,
  FoodSearchResult,
} from "@/types/api";

type Tab = "plans" | "log";

const MEAL_TYPES = ["Breakfast", "Snack", "Lunch", "Afternoon Snack", "Dinner", "Evening Snack"];

// ─── Shared sub-components ────────────────────────────────

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
        {food.portion ? (
          <Text className="text-xs text-gray-400 dark:text-slate-500">{food.portion}</Text>
        ) : null}
      </View>
      <View className="flex-row gap-3">
        {food.calories != null && (
          <Text className="text-xs text-gray-500 dark:text-slate-400 w-12 text-right">{food.calories} cal</Text>
        )}
        {food.protein != null && (
          <Text className="text-xs text-gray-500 dark:text-slate-400 w-8 text-right">{food.protein}p</Text>
        )}
        {food.carbs != null && (
          <Text className="text-xs text-gray-500 dark:text-slate-400 w-8 text-right">{food.carbs}c</Text>
        )}
        {food.fat != null && (
          <Text className="text-xs text-gray-500 dark:text-slate-400 w-8 text-right">{food.fat}f</Text>
        )}
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
        {expanded ? (
          <ChevronUp size={16} color={colors.iconMuted} />
        ) : (
          <ChevronDown size={16} color={colors.iconMuted} />
        )}
      </TouchableOpacity>
      {expanded && meal.foods.length > 0 && (
        <View className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700/40">
          {meal.foods.map((food, idx) => (
            <FoodRow key={food.name + idx} food={food} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Meal Plan Card ───────────────────────────────────────

function PlanCard({ plan }: { plan: AssignedMealPlan }) {
  const [expanded, setExpanded] = useState(false);
  const colors = useThemeColors();
  const meals =
    plan.clientMeals.length > 0
      ? [...plan.clientMeals].sort((a, b) => a.orderIndex - b.orderIndex)
      : [...plan.mealPlan.meals].sort((a, b) => a.orderIndex - b.orderIndex);
  const mp = plan.mealPlan;

  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 mb-3 overflow-hidden">
      <TouchableOpacity className="p-4" onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900 dark:text-slate-50">
              {plan.customName || mp.name}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-slate-400">
              {meals.length} meal{meals.length !== 1 ? "s" : ""}
              {!plan.isActive ? " · Inactive" : ""}
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
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Nutrition Program Card ───────────────────────────────

function NutritionProgramCard({ program }: { program: AssignedNutritionProgram }) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState<number>(program.currentWeek);

  const weeks = useMemo(() => {
    const map = new Map<number, NutritionProgramDay[]>();
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
        {expanded ? <ChevronUp size={18} color={colors.iconMuted} /> : <ChevronDown size={18} color={colors.iconMuted} />}
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
                    isCurrent ? "bg-brand-50 dark:bg-brand-900/20" : "bg-gray-50 dark:bg-slate-900/50"
                  }`}
                  onPress={() => setExpandedWeek(isWeekExpanded ? -1 : week)}
                  activeOpacity={0.7}
                >
                  <Calendar size={14} color={isCurrent ? colors.brand : colors.iconMuted} />
                  <Text
                    className={`flex-1 text-sm font-medium ml-2 ${
                      isCurrent ? "text-brand-700 dark:text-brand-300" : "text-gray-700 dark:text-slate-300"
                    }`}
                  >
                    Week {week}{isCurrent ? " (Current)" : ""}
                  </Text>
                  {isWeekExpanded ? <ChevronUp size={14} color={colors.iconMuted} /> : <ChevronDown size={14} color={colors.iconMuted} />}
                </TouchableOpacity>

                {isWeekExpanded &&
                  days.map((day) => (
                    <View
                      key={day.id}
                      className="flex-row items-center py-2.5 px-3 ml-5 border-l border-gray-200 dark:border-slate-700"
                    >
                      <View className="flex-1">
                        <Text className="text-sm text-gray-900 dark:text-slate-50">
                          Day {day.dayNumber}{day.label ? ` — ${day.label}` : ""}
                        </Text>
                        {day.mealPlan ? (
                          <Text className="text-xs text-gray-500 dark:text-slate-400">{day.mealPlan.name}</Text>
                        ) : (
                          <Text className="text-xs text-gray-400 dark:text-slate-500">No plan</Text>
                        )}
                      </View>
                    </View>
                  ))}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Food Log Tab ─────────────────────────────────────────

function FoodLogTab() {
  const colors = useThemeColors();
  const t = useT();
  const queryClient = useQueryClient();
  const { data: logs, isLoading } = useNutritionLogs(14);
  const [showLogForm, setShowLogForm] = useState(false);

  const grouped = useMemo(() => {
    if (!logs) return [];
    const map = new Map<string, NutritionLog[]>();
    for (const log of logs) {
      const date = log.date.slice(0, 10);
      const arr = map.get(date) || [];
      arr.push(log);
      map.set(date, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, items }));
  }, [logs]);

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  return (
    <>
      <TouchableOpacity
        className="bg-brand-600 rounded-xl py-3 items-center mb-4 flex-row justify-center"
        onPress={() => setShowLogForm(true)}
        activeOpacity={0.7}
      >
        <Plus size={18} color="#fff" />
        <Text className="text-white font-semibold text-base ml-2">Log Meal</Text>
      </TouchableOpacity>

      {isLoading ? (
        <View className="items-center py-16">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : grouped.length === 0 ? (
        <View className="items-center py-16">
          <UtensilsCrossed size={48} color={colors.iconMuted} />
          <Text className="text-gray-400 dark:text-slate-500 mt-3 text-base">No meals logged yet</Text>
          <Text className="text-gray-400 dark:text-slate-500 mt-1 text-sm">
            Tap "Log Meal" to start tracking
          </Text>
        </View>
      ) : (
        grouped.map(({ date, items }) => {
          const dayCals = items.reduce((s, l) => s + (l.calories || 0), 0);
          return (
            <View key={date} className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                  {formatDate(date)}
                </Text>
                {dayCals > 0 && (
                  <Text className="text-xs text-gray-500 dark:text-slate-400">{dayCals} cal total</Text>
                )}
              </View>
              {items.map((log) => (
                <View
                  key={log.id}
                  className="bg-white dark:bg-slate-800 rounded-xl p-3 mb-2 border border-gray-100 dark:border-slate-700/40"
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">{log.mealName}</Text>
                    {log.calories != null && (
                      <Text className="text-xs font-medium text-gray-600 dark:text-slate-300">{log.calories} cal</Text>
                    )}
                  </View>
                  <Text className="text-xs text-gray-500 dark:text-slate-400" numberOfLines={2}>
                    {log.foods}
                  </Text>
                  {(log.protein != null || log.carbs != null || log.fat != null) && (
                    <View className="flex-row mt-1.5 gap-3">
                      {log.protein != null && (
                        <Text className="text-xs text-gray-400 dark:text-slate-500">P: {log.protein}g</Text>
                      )}
                      {log.carbs != null && (
                        <Text className="text-xs text-gray-400 dark:text-slate-500">C: {log.carbs}g</Text>
                      )}
                      {log.fat != null && (
                        <Text className="text-xs text-gray-400 dark:text-slate-500">F: {log.fat}g</Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          );
        })
      )}

      <LogMealSheet
        visible={showLogForm}
        onClose={() => setShowLogForm(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["nutrition-logs"] });
          setShowLogForm(false);
        }}
      />
    </>
  );
}

// ─── Log Meal Bottom Sheet ────────────────────────────────

function LogMealSheet({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const colors = useThemeColors();
  const t = useT();

  const [mealName, setMealName] = useState("Breakfast");
  const [foodQuery, setFoodQuery] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<FoodSearchResult[]>([]);
  const [manualFoods, setManualFoods] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [notes, setNotes] = useState("");

  const { data: searchResults, isLoading: searching } = useFoodSearch(foodQuery);

  const autoMacros = useMemo(() => {
    return selectedFoods.reduce(
      (acc, f) => ({
        calories: acc.calories + (f.calories || 0),
        protein: acc.protein + (f.protein || 0),
        carbs: acc.carbs + (f.carbs || 0),
        fat: acc.fat + (f.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [selectedFoods]);

  const reset = () => {
    setMealName("Breakfast");
    setFoodQuery("");
    setSelectedFoods([]);
    setManualFoods("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setNotes("");
  };

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/api/nutrition-logs", data),
    onSuccess: () => {
      haptics.success();
      reset();
      onSuccess();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const handleSubmit = () => {
    const foodParts: string[] = [];
    for (const f of selectedFoods) {
      foodParts.push(f.portion ? `${f.name} (${f.portion})` : f.name);
    }
    if (manualFoods.trim()) foodParts.push(manualFoods.trim());

    if (foodParts.length === 0) {
      Alert.alert(t.common.required, "Add at least one food item");
      return;
    }

    const totalCal = autoMacros.calories + (parseInt(calories) || 0);
    const totalP = autoMacros.protein + (parseInt(protein) || 0);
    const totalC = autoMacros.carbs + (parseInt(carbs) || 0);
    const totalF = autoMacros.fat + (parseInt(fat) || 0);

    mutation.mutate({
      mealName,
      foods: foodParts.join(", "),
      calories: totalCal || null,
      protein: totalP || null,
      carbs: totalC || null,
      fat: totalF || null,
      notes: notes.trim() || null,
    });
  };

  const addFood = (food: FoodSearchResult) => {
    setSelectedFoods((prev) => [...prev, food]);
    setFoodQuery("");
  };

  const removeFood = (index: number) => {
    setSelectedFoods((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <AppBottomSheet
      visible={visible}
      onClose={() => { reset(); onClose(); }}
      snapPoints={["50%", "92%"]}
      title="Log Meal"
      footer={
        <TouchableOpacity
          className={`rounded-xl py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={handleSubmit}
          disabled={mutation.isPending}
          activeOpacity={0.7}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Log Meal</Text>
          )}
        </TouchableOpacity>
      }
    >
      {/* Meal Type */}
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Meal Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row">
          {MEAL_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              className={`mr-2 px-3 py-1.5 rounded-full ${
                mealName === type
                  ? "bg-brand-600"
                  : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
              }`}
              onPress={() => setMealName(type)}
            >
              <Text
                className={`text-xs font-medium ${
                  mealName === type ? "text-white" : "text-gray-600 dark:text-slate-300"
                }`}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Food Search */}
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Search Foods</Text>
      <View className="flex-row items-center bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 mb-2">
        <Search size={16} color={colors.iconMuted} />
        <BottomSheetTextInput
          className="flex-1 ml-2 text-sm text-gray-900 dark:text-slate-50"
          placeholder="Search USDA foods..."
          placeholderTextColor={colors.iconMuted}
          value={foodQuery}
          onChangeText={setFoodQuery}
        />
        {foodQuery.length > 0 && (
          <TouchableOpacity onPress={() => setFoodQuery("")}>
            <X size={16} color={colors.iconMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results */}
      {foodQuery.length >= 2 && (
        <View className="mb-3 max-h-40">
          {searching ? (
            <View className="items-center py-3">
              <ActivityIndicator size="small" color={colors.brand} />
            </View>
          ) : searchResults && searchResults.length > 0 ? (
            <ScrollView nestedScrollEnabled className="max-h-40">
              {searchResults.slice(0, 8).map((result, idx) => (
                <TouchableOpacity
                  key={`${result.fdcId || result.id}-${idx}`}
                  className="flex-row items-center py-2.5 px-3 border-b border-gray-100 dark:border-slate-700/40"
                  onPress={() => addFood(result)}
                  activeOpacity={0.6}
                >
                  <View className="flex-1">
                    <Text className="text-sm text-gray-900 dark:text-slate-50" numberOfLines={1}>
                      {result.name}
                    </Text>
                    <Text className="text-xs text-gray-400 dark:text-slate-500">
                      {result.portion}{result.calories != null ? ` · ${result.calories} cal` : ""}
                    </Text>
                  </View>
                  <Plus size={16} color={colors.brand} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text className="text-xs text-gray-400 dark:text-slate-500 py-2 px-3">No results found</Text>
          )}
        </View>
      )}

      {/* Selected Foods */}
      {selectedFoods.length > 0 && (
        <View className="mb-3">
          <Text className="text-xs text-gray-500 dark:text-slate-400 mb-1">Selected ({selectedFoods.length})</Text>
          <View className="flex-row flex-wrap">
            {selectedFoods.map((food, idx) => (
              <View
                key={`sel-${idx}`}
                className="flex-row items-center bg-brand-50 dark:bg-brand-900/20 rounded-full px-2.5 py-1 mr-1.5 mb-1.5"
              >
                <Text className="text-xs text-brand-700 dark:text-brand-300 mr-1" numberOfLines={1}>
                  {food.name}
                  {food.calories != null ? ` (${food.calories})` : ""}
                </Text>
                <TouchableOpacity onPress={() => removeFood(idx)}>
                  <X size={12} color={colors.brand} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {autoMacros.calories > 0 && (
            <Text className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Subtotal: {autoMacros.calories} cal · {autoMacros.protein}p · {autoMacros.carbs}c · {autoMacros.fat}f
            </Text>
          )}
        </View>
      )}

      {/* Manual Foods */}
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Additional Foods</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-sm text-gray-900 dark:text-slate-50 min-h-[60px]"
        placeholder="e.g. grilled chicken, rice..."
        placeholderTextColor={colors.iconMuted}
        value={manualFoods}
        onChangeText={setManualFoods}
        multiline
        textAlignVertical="top"
      />

      {/* Macro Fields (additional/override) */}
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">
        {selectedFoods.length > 0 ? "Extra Macros (added to search totals)" : "Macros"}
      </Text>
      <View className="flex-row gap-2 mb-4">
        <View className="flex-1">
          <BottomSheetTextInput
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-slate-50"
            placeholder="Cal"
            placeholderTextColor={colors.iconMuted}
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <BottomSheetTextInput
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-slate-50"
            placeholder="Protein"
            placeholderTextColor={colors.iconMuted}
            value={protein}
            onChangeText={setProtein}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <BottomSheetTextInput
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-slate-50"
            placeholder="Carbs"
            placeholderTextColor={colors.iconMuted}
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <BottomSheetTextInput
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-slate-50"
            placeholder="Fat"
            placeholderTextColor={colors.iconMuted}
            value={fat}
            onChangeText={setFat}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Notes */}
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Notes</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-2 text-sm text-gray-900 dark:text-slate-50"
        placeholder="Optional notes..."
        placeholderTextColor={colors.iconMuted}
        value={notes}
        onChangeText={setNotes}
        multiline
      />
    </AppBottomSheet>
  );
}

// ─── Main Screen ──────────────────────────────────────────

export default function NutritionScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("plans");
  const t = useT();
  const colors = useThemeColors();

  const { data: profile, isLoading, isError, refetch } = useClientProfile();

  const activePlans = useMemo(() => profile?.assignedMealPlans?.filter((p) => p.isActive) || [], [profile]);
  const inactivePlans = useMemo(() => profile?.assignedMealPlans?.filter((p) => !p.isActive) || [], [profile]);
  const nutritionPrograms = useMemo(() => profile?.assignedNutritionPrograms || [], [profile]);

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
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["client-profile"] }),
      queryClient.invalidateQueries({ queryKey: ["nutrition-logs"] }),
    ]);
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

      {/* Tab Switcher */}
      <View className="flex-row mx-4 mb-3 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
        <TouchableOpacity
          className={`flex-1 py-2 rounded-md items-center ${
            tab === "plans" ? "bg-white dark:bg-slate-700 shadow-sm" : ""
          }`}
          onPress={() => setTab("plans")}
          activeOpacity={0.7}
        >
          <Text
            className={`text-sm font-medium ${
              tab === "plans" ? "text-gray-900 dark:text-slate-50" : "text-gray-500 dark:text-slate-400"
            }`}
          >
            Plans
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 rounded-md items-center ${
            tab === "log" ? "bg-white dark:bg-slate-700 shadow-sm" : ""
          }`}
          onPress={() => setTab("log")}
          activeOpacity={0.7}
        >
          <Text
            className={`text-sm font-medium ${
              tab === "log" ? "text-gray-900 dark:text-slate-50" : "text-gray-500 dark:text-slate-400"
            }`}
          >
            Food Log
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {tab === "plans" ? (
          <>
            {/* Daily Targets */}
            {totalMacros.calories > 0 && (
              <View className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 mb-4 border border-brand-100">
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

            {/* Nutrition Programs */}
            {nutritionPrograms.length > 0 && (
              <>
                <Text className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Programs
                </Text>
                {nutritionPrograms.map((prog) => (
                  <NutritionProgramCard key={prog.id} program={prog} />
                ))}
              </>
            )}

            {/* Standalone Plans */}
            {activePlans.length === 0 && inactivePlans.length === 0 && nutritionPrograms.length === 0 ? (
              <View className="items-center justify-center py-16">
                <UtensilsCrossed size={48} color={colors.iconMuted} />
                <Text className="text-gray-400 dark:text-slate-500 mt-3 text-base">{t.portalNutrition.noPlans}</Text>
              </View>
            ) : (
              <>
                {activePlans.length > 0 && (
                  <>
                    {nutritionPrograms.length > 0 && (
                      <Text className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-3">
                        Standalone Plans
                      </Text>
                    )}
                    {activePlans.map((plan) => (
                      <PlanCard key={plan.id} plan={plan} />
                    ))}
                  </>
                )}
                {inactivePlans.length > 0 && (
                  <>
                    <Text className="text-sm text-gray-400 dark:text-slate-500 mt-4 mb-2">Inactive Plans</Text>
                    {inactivePlans.map((plan) => (
                      <PlanCard key={plan.id} plan={plan} />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <FoodLogTab />
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
