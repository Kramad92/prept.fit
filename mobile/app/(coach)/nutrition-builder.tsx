import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  UtensilsCrossed,
  Search,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react-native";
import { useMealPlans, useMealPlanDetail } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { AppBottomSheet, BottomSheetTextInput } from "@/components/app-bottom-sheet";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { MealPlanListItem, FoodSearchResult } from "@/types/api";

interface FoodForm {
  key: string;
  name: string;
  portion: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

interface MealForm {
  key: string;
  name: string;
  time: string;
  foods: FoodForm[];
}

function makeKey() {
  return Math.random().toString(36).slice(2, 10);
}

export default function NutritionBuilderScreen() {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { data: plans, isLoading, error, refetch, isRefetching } = useMealPlans();
  const [mode, setMode] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | undefined>();

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/meal-plans/${id}/duplicate`),
    onSuccess: () => { haptics.success(); queryClient.invalidateQueries({ queryKey: ["meal-plans"] }); },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/meal-plans/${id}`),
    onSuccess: () => { haptics.light(); queryClient.invalidateQueries({ queryKey: ["meal-plans"] }); },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const openCreate = () => { setEditingId(undefined); setMode("form"); };
  const openEdit = (id: string) => { setEditingId(id); setMode("form"); };
  const handleDone = () => {
    queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
    setMode("list");
    setEditingId(undefined);
  };

  if (mode === "form") {
    return <MealPlanForm editId={editingId} onDone={handleDone} />;
  }

  const renderPlan = ({ item }: { item: MealPlanListItem }) => (
    <TouchableOpacity className="bg-white dark:bg-slate-800 mx-4 mb-2 rounded-xl border border-gray-100 dark:border-slate-700/40 px-4 py-3" onPress={() => openEdit(item.id)} activeOpacity={0.6}>
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">{item.name}</Text>
          <Text className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {item.mealCount} {t.nutrition.meals} · {item.assignedCount} assigned
            {item.targetCalories ? ` · ${item.targetCalories} ${t.nutrition.kcal}` : ""}
          </Text>
          {(item.targetProtein || item.targetCarbs || item.targetFat) && (
            <Text className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              P: {item.targetProtein || 0}g · C: {item.targetCarbs || 0}g · F: {item.targetFat || 0}g
            </Text>
          )}
        </View>
        <View className="flex-row">
          <TouchableOpacity className="p-2" onPress={() => duplicateMutation.mutate(item.id)}>
            <Copy size={16} color={colors.icon} />
          </TouchableOpacity>
          <TouchableOpacity className="p-2" onPress={() => Alert.alert(t.common.delete, `Delete "${item.name}"?`, [
            { text: t.common.cancel, style: "cancel" },
            { text: t.common.delete, style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
          ])}>
            <Trash2 size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5"><ArrowLeft size={22} color={colors.text} /></TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50 flex-1">{t.nutrition.title}</Text>
        <TouchableOpacity onPress={openCreate} className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center" activeOpacity={0.7}>
          <Plus size={16} color="#fff" /><Text className="text-white text-xs font-semibold ml-1">New</Text>
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={colors.brand} /></View>
      ) : error ? (
        <QueryError message={t.errors.failedToLoad} onRetry={refetch} />
      ) : (
        <FlatList data={plans || []} keyExtractor={(item) => item.id} renderItem={renderPlan}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <UtensilsCrossed size={40} color={colors.iconMuted} />
              <Text className="text-gray-400 dark:text-slate-500 text-sm mt-3">{t.nutrition.noPlans}</Text>
              <TouchableOpacity className="mt-3 bg-brand-600 rounded-lg px-4 py-2" onPress={openCreate}>
                <Text className="text-white text-sm font-semibold">{t.nutrition.createPlan}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function MealPlanForm({ editId, onDone }: { editId?: string; onDone: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { data: existing, isLoading } = useMealPlanDetail(editId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetCalories, setTargetCalories] = useState("");
  const [targetProtein, setTargetProtein] = useState("");
  const [targetCarbs, setTargetCarbs] = useState("");
  const [targetFat, setTargetFat] = useState("");
  const [meals, setMeals] = useState<MealForm[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [foodPickerMealKey, setFoodPickerMealKey] = useState<string | null>(null);

  // AI generation state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiHasGenerated, setAiHasGenerated] = useState(false);
  const [aiRefinement, setAiRefinement] = useState("");
  const [aiRefinements, setAiRefinements] = useState<string[]>([]);

  useEffect(() => {
    if (existing && !initialized) {
      setName(existing.name);
      setDescription(existing.description || "");
      setTargetCalories(existing.targetCalories?.toString() || "");
      setTargetProtein(existing.targetProtein?.toString() || "");
      setTargetCarbs(existing.targetCarbs?.toString() || "");
      setTargetFat(existing.targetFat?.toString() || "");
      setMeals(
        existing.meals.map((m) => ({
          key: makeKey(),
          name: m.name,
          time: m.time || "",
          foods: m.foods.map((f) => ({
            key: makeKey(),
            name: f.name,
            portion: f.portion || "",
            calories: f.calories?.toString() || "",
            protein: f.protein?.toString() || "",
            carbs: f.carbs?.toString() || "",
            fat: f.fat?.toString() || "",
          })),
        }))
      );
      setInitialized(true);
    }
    if (!editId && !initialized) setInitialized(true);
  }, [existing, editId, initialized]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => editId ? api.put(`/api/meal-plans/${editId}`, data) : api.post("/api/meal-plans", data),
    onSuccess: () => { haptics.success(); queryClient.invalidateQueries({ queryKey: ["meal-plans"] }); onDone(); },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const addMeal = () => {
    setMeals([...meals, { key: makeKey(), name: `Meal ${meals.length + 1}`, time: "", foods: [] }]);
  };

  const updateMeal = (key: string, field: keyof MealForm, value: any) => {
    setMeals(meals.map((m) => (m.key === key ? { ...m, [field]: value } : m)));
  };

  const removeMeal = (key: string) => setMeals(meals.filter((m) => m.key !== key));

  const addFood = (mealKey: string, food?: FoodSearchResult) => {
    setMeals(meals.map((m) =>
      m.key === mealKey
        ? {
            ...m,
            foods: [
              ...m.foods,
              {
                key: makeKey(),
                name: food?.name || "",
                portion: food?.portion || "",
                calories: food?.calories?.toString() || "",
                protein: food?.protein?.toString() || "",
                carbs: food?.carbs?.toString() || "",
                fat: food?.fat?.toString() || "",
              },
            ],
          }
        : m
    ));
  };

  const updateFood = (mealKey: string, foodKey: string, field: keyof FoodForm, value: string) => {
    setMeals(meals.map((m) =>
      m.key === mealKey
        ? { ...m, foods: m.foods.map((f) => (f.key === foodKey ? { ...f, [field]: value } : f)) }
        : m
    ));
  };

  const removeFood = (mealKey: string, foodKey: string) => {
    setMeals(meals.map((m) => (m.key === mealKey ? { ...m, foods: m.foods.filter((f) => f.key !== foodKey) } : m)));
  };

  const handleAiGenerate = async () => {
    if (!description.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    try {
      const allRefinements = [...aiRefinements];
      if (aiRefinement.trim()) allRefinements.push(aiRefinement.trim());
      const fullPrompt = allRefinements.length > 0
        ? `${description.trim()}\n\nAdditional instructions:\n${allRefinements.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
        : description.trim();

      const body: Record<string, unknown> = { prompt: fullPrompt, locale: "en" };
      const calMatch = description.match(/(\d{3,5})\s*(?:cal(?:ories?)?|kcal)/i);
      if (calMatch) body.targetCalories = parseInt(calMatch[1], 10);
      const mealMatch = description.match(/(\d{1,2})\s*meals?/i);
      if (mealMatch) body.numMeals = parseInt(mealMatch[1], 10);

      const res = await api.post<{
        name: string;
        description: string;
        targetCalories: number;
        targetProtein: number;
        targetCarbs: number;
        targetFat: number;
        meals: Array<{
          name: string;
          description?: string;
          time?: string;
          foods: Array<{
            name: string;
            portion: string;
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
          }>;
        }>;
      }>("/api/ai/generate-meal-plan", body);

      if (!name.trim()) setName(res.name);
      setTargetCalories(res.targetCalories?.toString() || "");
      setTargetProtein(res.targetProtein?.toString() || "");
      setTargetCarbs(res.targetCarbs?.toString() || "");
      setTargetFat(res.targetFat?.toString() || "");
      setMeals(
        res.meals.map((m) => ({
          key: makeKey(),
          name: m.name,
          time: m.time || "",
          foods: m.foods.map((f) => ({
            key: makeKey(),
            name: f.name,
            portion: f.portion || "",
            calories: f.calories?.toString() || "",
            protein: f.protein?.toString() || "",
            carbs: f.carbs?.toString() || "",
            fat: f.fat?.toString() || "",
          })),
        }))
      );

      if (aiRefinement.trim()) {
        setAiRefinements((prev) => [...prev, aiRefinement.trim()]);
      }
      setAiHasGenerated(true);
      setAiRefinement("");
      haptics.success();
    } catch (e: any) {
      setAiError(e.message || t.workouts.aiError);
    } finally {
      setAiLoading(false);
    }
  };

  const removeAiRefinement = (index: number) => {
    setAiRefinements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) return Alert.alert(t.common.required, t.nutrition.planName);
    saveMutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      targetCalories: targetCalories ? parseFloat(targetCalories) : null,
      targetProtein: targetProtein ? parseFloat(targetProtein) : null,
      targetCarbs: targetCarbs ? parseFloat(targetCarbs) : null,
      targetFat: targetFat ? parseFloat(targetFat) : null,
      meals: meals.map((m, i) => ({
        name: m.name.trim(),
        time: m.time.trim() || null,
        orderIndex: i,
        foods: m.foods.map((f) => ({
          name: f.name.trim(),
          portion: f.portion.trim() || "",
          calories: f.calories ? parseFloat(f.calories) : null,
          protein: f.protein ? parseFloat(f.protein) : null,
          carbs: f.carbs ? parseFloat(f.carbs) : null,
          fat: f.fat ? parseFloat(f.fat) : null,
        })),
      })),
    });
  };

  const handleBack = () => {
    const hasData = name.trim() || meals.length > 0;
    if (hasData) {
      Alert.alert("Discard Changes?", "Your unsaved changes will be lost.", [
        { text: t.common.cancel, style: "cancel" },
        { text: "Discard", style: "destructive", onPress: onDone },
      ]);
    } else {
      onDone();
    }
  };

  if (editId && isLoading) {
    return <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}><View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={colors.brand} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={handleBack} className="mr-3 p-2.5"><ArrowLeft size={22} color={colors.text} /></TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50 flex-1">{editId ? t.common.edit : t.nutrition.newPlan}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saveMutation.isPending} className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center" activeOpacity={0.7}>
          {saveMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text className="text-white text-xs font-semibold ml-1">{t.common.save}</Text></>}
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <TextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 text-base font-semibold text-gray-900 dark:text-slate-50 mb-3" value={name} onChangeText={setName} placeholder={t.nutrition.planNamePlaceholder} placeholderTextColor={colors.iconMuted} />
          <TextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm text-gray-900 dark:text-slate-50 mb-3" value={description} onChangeText={setDescription} placeholder={t.nutrition.descriptionPlaceholder} placeholderTextColor={colors.iconMuted} multiline />

          {/* AI Generate Section */}
          <View className="mb-3">
            <TouchableOpacity
              className={`flex-row items-center rounded-lg border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 self-start ${
                !description.trim() || aiLoading ? "opacity-50" : ""
              }`}
              onPress={handleAiGenerate}
              disabled={!description.trim() || aiLoading}
              activeOpacity={0.7}
            >
              {aiLoading ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Sparkles size={14} color={colors.brand} />
              )}
              <Text className="text-xs font-medium text-emerald-700 dark:text-emerald-300 ml-1.5">
                {aiLoading ? t.workouts.generating : aiHasGenerated ? t.workouts.regenerateWithAI : t.workouts.generateWithAI}
              </Text>
            </TouchableOpacity>
            {aiError ? (
              <Text className="text-xs text-red-500 mt-1">{aiError}</Text>
            ) : null}
            {aiHasGenerated && (
              <View className="mt-2">
                <TextInput
                  className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-slate-200"
                  value={aiRefinement}
                  onChangeText={setAiRefinement}
                  placeholder={t.workouts.refinePromptPlaceholder}
                  placeholderTextColor={colors.iconMuted}
                  returnKeyType="go"
                  onSubmitEditing={handleAiGenerate}
                />
                {aiRefinements.length > 0 && (
                  <View className="flex-row flex-wrap mt-1.5">
                    {aiRefinements.map((r, i) => (
                      <View key={i} className="flex-row items-center bg-gray-100 dark:bg-slate-700 rounded-md px-2 py-1 mr-1 mb-1">
                        <Text className="text-[11px] text-gray-600 dark:text-slate-300 mr-1">{r}</Text>
                        <TouchableOpacity onPress={() => removeAiRefinement(i)}>
                          <X size={10} color={colors.iconMuted} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Macro Targets */}
          <Text className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Daily Targets</Text>
          <View className="flex-row mb-4">
            <View className="flex-1 mr-1.5">
              <TextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50 text-center" value={targetCalories} onChangeText={setTargetCalories} placeholder={t.nutrition.kcal} placeholderTextColor={colors.iconMuted} keyboardType="number-pad" />
            </View>
            <View className="flex-1 mr-1.5">
              <TextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50 text-center" value={targetProtein} onChangeText={setTargetProtein} placeholder="P (g)" placeholderTextColor={colors.iconMuted} keyboardType="number-pad" />
            </View>
            <View className="flex-1 mr-1.5">
              <TextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50 text-center" value={targetCarbs} onChangeText={setTargetCarbs} placeholder="C (g)" placeholderTextColor={colors.iconMuted} keyboardType="number-pad" />
            </View>
            <View className="flex-1">
              <TextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50 text-center" value={targetFat} onChangeText={setTargetFat} placeholder="F (g)" placeholderTextColor={colors.iconMuted} keyboardType="number-pad" />
            </View>
          </View>

          {/* Meals */}
          {meals.map((meal) => (
            <MealCard
              key={meal.key}
              meal={meal}
              onUpdateMeal={(field, value) => updateMeal(meal.key, field, value)}
              onRemoveMeal={() => removeMeal(meal.key)}
              onAddFood={() => setFoodPickerMealKey(meal.key)}
              onAddFoodManual={() => addFood(meal.key)}
              onUpdateFood={(fKey, field, value) => updateFood(meal.key, fKey, field, value)}
              onRemoveFood={(fKey) => removeFood(meal.key, fKey)}
            />
          ))}

          <TouchableOpacity className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl py-3 items-center" onPress={addMeal}>
            <Plus size={18} color={colors.iconMuted} />
            <Text className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t.nutrition.addMeal}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <FoodPickerModal
        visible={!!foodPickerMealKey}
        onClose={() => setFoodPickerMealKey(null)}
        onSelect={(food) => { if (foodPickerMealKey) addFood(foodPickerMealKey, food); setFoodPickerMealKey(null); }}
      />
    </SafeAreaView>
  );
}

function MealCard({ meal, onUpdateMeal, onRemoveMeal, onAddFood, onAddFoodManual, onUpdateFood, onRemoveFood }: {
  meal: MealForm;
  onUpdateMeal: (field: keyof MealForm, value: any) => void;
  onRemoveMeal: () => void;
  onAddFood: () => void;
  onAddFoodManual: () => void;
  onUpdateFood: (foodKey: string, field: keyof FoodForm, value: string) => void;
  onRemoveFood: (foodKey: string) => void;
}) {
  const t = useT();
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(true);
  const totalCal = meal.foods.reduce((s, f) => s + (parseFloat(f.calories) || 0), 0);

  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 mb-3 overflow-hidden">
      <TouchableOpacity className="flex-row items-center px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-700/40" onPress={() => setExpanded(!expanded)} activeOpacity={0.6}>
        <TextInput className="flex-1 text-sm font-semibold text-gray-900 dark:text-slate-50 py-0" value={meal.name} onChangeText={(v) => onUpdateMeal("name", v)} placeholder="Meal name" placeholderTextColor={colors.iconMuted} />
        {totalCal > 0 && <Text className="text-xs text-gray-500 dark:text-slate-400 mr-2">{Math.round(totalCal)} kcal</Text>}
        <TouchableOpacity onPress={onRemoveMeal} className="p-1 mr-1"><Trash2 size={14} color={colors.destructive} /></TouchableOpacity>
        {expanded ? <ChevronUp size={14} color={colors.iconMuted} /> : <ChevronDown size={14} color={colors.iconMuted} />}
      </TouchableOpacity>

      {expanded && (
        <View className="px-3 py-2">
          <View className="flex-row mb-2">
            <TextInput className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs text-gray-900 dark:text-slate-50 w-20" value={meal.time} onChangeText={(v) => onUpdateMeal("time", v)} placeholder="Time (HH:MM)" placeholderTextColor={colors.iconMuted} />
          </View>
          {meal.foods.map((food) => (
            <View key={food.key} className="bg-gray-50 dark:bg-slate-950 rounded-lg p-2 mb-1.5">
              <View className="flex-row items-center mb-1">
                <TextInput className="flex-1 text-sm text-gray-900 dark:text-slate-50 py-0 font-medium" value={food.name} onChangeText={(v) => onUpdateFood(food.key, "name", v)} placeholder="Food name" placeholderTextColor={colors.iconMuted} />
                <TouchableOpacity onPress={() => onRemoveFood(food.key)} className="p-1" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Trash2 size={12} color={colors.destructive} /></TouchableOpacity>
              </View>
              <View className="flex-row">
                <TextInput className="flex-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-1.5 py-1 text-[11px] text-gray-900 dark:text-slate-50 mr-1 text-center" value={food.portion} onChangeText={(v) => onUpdateFood(food.key, "portion", v)} placeholder="Portion" placeholderTextColor={colors.iconMuted} />
                <TextInput className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-1 py-1 text-[11px] text-gray-900 dark:text-slate-50 mr-1 text-center" value={food.calories} onChangeText={(v) => onUpdateFood(food.key, "calories", v)} placeholder="Cal" placeholderTextColor={colors.iconMuted} keyboardType="numeric" />
                <TextInput className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-1 py-1 text-[11px] text-gray-900 dark:text-slate-50 mr-1 text-center" value={food.protein} onChangeText={(v) => onUpdateFood(food.key, "protein", v)} placeholder="P" placeholderTextColor={colors.iconMuted} keyboardType="numeric" />
                <TextInput className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-1 py-1 text-[11px] text-gray-900 dark:text-slate-50 mr-1 text-center" value={food.carbs} onChangeText={(v) => onUpdateFood(food.key, "carbs", v)} placeholder="C" placeholderTextColor={colors.iconMuted} keyboardType="numeric" />
                <TextInput className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-1 py-1 text-[11px] text-gray-900 dark:text-slate-50 text-center" value={food.fat} onChangeText={(v) => onUpdateFood(food.key, "fat", v)} placeholder="F" placeholderTextColor={colors.iconMuted} keyboardType="numeric" />
              </View>
            </View>
          ))}
          <View className="flex-row mt-1">
            <TouchableOpacity className="flex-1 border border-dashed border-gray-300 dark:border-slate-600 rounded py-1.5 items-center mr-1" onPress={onAddFoodManual}>
              <Text className="text-[11px] text-gray-400 dark:text-slate-500">+ Manual</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 border border-dashed border-brand-300 rounded py-1.5 items-center" onPress={onAddFood}>
              <Text className="text-[11px] text-brand-600">+ {t.common.search}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function FoodPickerModal({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (food: FoodSearchResult) => void }) {
  const t = useT();
  const colors = useThemeColors();
  const [search, setSearch] = useState("");
  const { data: foods } = useQuery({
    queryKey: ["food-search", search],
    queryFn: async () => {
      const [usda, library] = await Promise.all([
        search.length >= 2 ? api.get<FoodSearchResult[]>(`/api/food-search?q=${encodeURIComponent(search)}`) : [],
        api.get<FoodSearchResult[]>(`/api/food-library${search ? `?search=${encodeURIComponent(search)}` : ""}`),
      ]);
      return [...(library as FoodSearchResult[]), ...(usda as FoodSearchResult[])];
    },
    enabled: search.length >= 2,
  });

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title={t.common.search}>
      <View className="-mx-5">
        <View className="px-5 py-2 border-b border-gray-100 dark:border-slate-700/40">
          <View className="flex-row items-center bg-gray-50 dark:bg-slate-950 rounded-lg px-3">
            <Search size={16} color={colors.iconMuted} />
            <BottomSheetTextInput className="flex-1 py-2 px-2 text-sm text-gray-900 dark:text-slate-50" value={search} onChangeText={setSearch} placeholder={t.nutrition.searchPlaceholder} placeholderTextColor={colors.iconMuted} autoFocus />
          </View>
        </View>
        <FlatList
          data={foods || []}
          keyExtractor={(item, i) => `${item.name}-${i}`}
          style={{ maxHeight: 400 }}
          renderItem={({ item }) => (
            <TouchableOpacity className="px-5 py-3 border-b border-gray-50 dark:border-slate-700/40 bg-white dark:bg-slate-800" onPress={() => onSelect(item)} activeOpacity={0.6}>
              <Text className="text-sm text-gray-900 dark:text-slate-50">{item.name}</Text>
              <Text className="text-xs text-gray-500 dark:text-slate-400">
                {item.portion}{item.calories != null ? ` · ${item.calories} ${t.nutrition.kcal}` : ""}
                {item.protein != null ? ` · P:${item.protein}g` : ""}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<View className="items-center py-12"><Text className="text-sm text-gray-400 dark:text-slate-500">{search.length < 2 ? "Type to search..." : t.common.noResults}</Text></View>}
        />
      </View>
    </AppBottomSheet>
  );
}
