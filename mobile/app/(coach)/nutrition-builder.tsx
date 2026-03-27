import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
} from "lucide-react-native";
import { useMealPlans, useMealPlanDetail } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
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
  const queryClient = useQueryClient();
  const { data: plans, isLoading, error, refetch, isRefetching } = useMealPlans();
  const [mode, setMode] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | undefined>();

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

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/meal-plans/${id}/duplicate`),
    onSuccess: () => { haptics.success(); queryClient.invalidateQueries({ queryKey: ["meal-plans"] }); },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/meal-plans/${id}`),
    onSuccess: () => { haptics.light(); queryClient.invalidateQueries({ queryKey: ["meal-plans"] }); },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const renderPlan = ({ item }: { item: MealPlanListItem }) => (
    <TouchableOpacity className="bg-white mx-4 mb-2 rounded-xl border border-gray-100 px-4 py-3" onPress={() => openEdit(item.id)} activeOpacity={0.6}>
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-900">{item.name}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            {item.mealCount} meals · {item.assignedCount} assigned
            {item.targetCalories ? ` · ${item.targetCalories} kcal` : ""}
          </Text>
          {(item.targetProtein || item.targetCarbs || item.targetFat) && (
            <Text className="text-xs text-gray-400 mt-0.5">
              P: {item.targetProtein || 0}g · C: {item.targetCarbs || 0}g · F: {item.targetFat || 0}g
            </Text>
          )}
        </View>
        <View className="flex-row">
          <TouchableOpacity className="p-2" onPress={() => duplicateMutation.mutate(item.id)}>
            <Copy size={16} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2" onPress={() => Alert.alert("Delete", `Delete "${item.name}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
          ])}>
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1"><ArrowLeft size={22} color="#111827" /></TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 flex-1">Meal Plans</Text>
        <TouchableOpacity onPress={openCreate} className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center" activeOpacity={0.7}>
          <Plus size={14} color="#fff" /><Text className="text-white text-xs font-semibold ml-1">New</Text>
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#059669" /></View>
      ) : error ? (
        <QueryError message="Failed to load plans" onRetry={refetch} />
      ) : (
        <FlatList data={plans || []} keyExtractor={(item) => item.id} renderItem={renderPlan}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <UtensilsCrossed size={40} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-3">No meal plans yet</Text>
              <TouchableOpacity className="mt-3 bg-brand-600 rounded-lg px-4 py-2" onPress={openCreate}>
                <Text className="text-white text-sm font-semibold">Create First Plan</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function MealPlanForm({ editId, onDone }: { editId?: string; onDone: () => void }) {
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

  const saveMutation = useMutation({
    mutationFn: (data: any) => editId ? api.put(`/api/meal-plans/${editId}`, data) : api.post("/api/meal-plans", data),
    onSuccess: () => { haptics.success(); queryClient.invalidateQueries({ queryKey: ["meal-plans"] }); onDone(); },
    onError: (err: any) => Alert.alert("Error", err.message),
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

  const handleSave = () => {
    if (!name.trim()) return Alert.alert("Required", "Plan name is required");
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

  if (editId && isLoading) {
    return <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}><View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#059669" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={onDone} className="mr-3 p-1"><ArrowLeft size={22} color="#111827" /></TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 flex-1">{editId ? "Edit Plan" : "New Plan"}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saveMutation.isPending} className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center" activeOpacity={0.7}>
          {saveMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={14} color="#fff" /><Text className="text-white text-xs font-semibold ml-1">Save</Text></>}
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <TextInput className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base font-semibold text-gray-900 mb-3" value={name} onChangeText={setName} placeholder="Plan name" placeholderTextColor="#9ca3af" />
          <TextInput className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 mb-3" value={description} onChangeText={setDescription} placeholder="Description (optional)" placeholderTextColor="#9ca3af" multiline />

          {/* Macro Targets */}
          <Text className="text-xs font-medium text-gray-500 mb-1.5">Daily Targets</Text>
          <View className="flex-row mb-4">
            <View className="flex-1 mr-1.5">
              <TextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 text-center" value={targetCalories} onChangeText={setTargetCalories} placeholder="kcal" placeholderTextColor="#9ca3af" keyboardType="number-pad" />
            </View>
            <View className="flex-1 mr-1.5">
              <TextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 text-center" value={targetProtein} onChangeText={setTargetProtein} placeholder="P (g)" placeholderTextColor="#9ca3af" keyboardType="number-pad" />
            </View>
            <View className="flex-1 mr-1.5">
              <TextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 text-center" value={targetCarbs} onChangeText={setTargetCarbs} placeholder="C (g)" placeholderTextColor="#9ca3af" keyboardType="number-pad" />
            </View>
            <View className="flex-1">
              <TextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 text-center" value={targetFat} onChangeText={setTargetFat} placeholder="F (g)" placeholderTextColor="#9ca3af" keyboardType="number-pad" />
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

          <TouchableOpacity className="border-2 border-dashed border-gray-300 rounded-xl py-3 items-center" onPress={addMeal}>
            <Plus size={18} color="#9ca3af" />
            <Text className="text-xs text-gray-400 mt-1">Add Meal</Text>
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
  const [expanded, setExpanded] = useState(true);
  const totalCal = meal.foods.reduce((s, f) => s + (parseFloat(f.calories) || 0), 0);

  return (
    <View className="bg-white rounded-xl border border-gray-200 mb-3 overflow-hidden">
      <TouchableOpacity className="flex-row items-center px-3 py-2.5 bg-gray-50 border-b border-gray-100" onPress={() => setExpanded(!expanded)} activeOpacity={0.6}>
        <TextInput className="flex-1 text-sm font-semibold text-gray-900 py-0" value={meal.name} onChangeText={(v) => onUpdateMeal("name", v)} placeholder="Meal name" placeholderTextColor="#9ca3af" />
        {totalCal > 0 && <Text className="text-xs text-gray-500 mr-2">{Math.round(totalCal)} kcal</Text>}
        <TouchableOpacity onPress={onRemoveMeal} className="p-1 mr-1"><Trash2 size={14} color="#ef4444" /></TouchableOpacity>
        {expanded ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
      </TouchableOpacity>

      {expanded && (
        <View className="px-3 py-2">
          <View className="flex-row mb-2">
            <TextInput className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900 w-20" value={meal.time} onChangeText={(v) => onUpdateMeal("time", v)} placeholder="Time (HH:MM)" placeholderTextColor="#9ca3af" />
          </View>
          {meal.foods.map((food) => (
            <View key={food.key} className="bg-gray-50 rounded-lg p-2 mb-1.5">
              <View className="flex-row items-center mb-1">
                <TextInput className="flex-1 text-sm text-gray-900 py-0 font-medium" value={food.name} onChangeText={(v) => onUpdateFood(food.key, "name", v)} placeholder="Food name" placeholderTextColor="#9ca3af" />
                <TouchableOpacity onPress={() => onRemoveFood(food.key)} className="p-1"><Trash2 size={12} color="#ef4444" /></TouchableOpacity>
              </View>
              <View className="flex-row">
                <TextInput className="flex-1 bg-white border border-gray-200 rounded px-1.5 py-1 text-[10px] text-gray-900 mr-1 text-center" value={food.portion} onChangeText={(v) => onUpdateFood(food.key, "portion", v)} placeholder="Portion" placeholderTextColor="#9ca3af" />
                <TextInput className="w-12 bg-white border border-gray-200 rounded px-1 py-1 text-[10px] text-gray-900 mr-1 text-center" value={food.calories} onChangeText={(v) => onUpdateFood(food.key, "calories", v)} placeholder="Cal" placeholderTextColor="#9ca3af" keyboardType="numeric" />
                <TextInput className="w-10 bg-white border border-gray-200 rounded px-1 py-1 text-[10px] text-gray-900 mr-1 text-center" value={food.protein} onChangeText={(v) => onUpdateFood(food.key, "protein", v)} placeholder="P" placeholderTextColor="#9ca3af" keyboardType="numeric" />
                <TextInput className="w-10 bg-white border border-gray-200 rounded px-1 py-1 text-[10px] text-gray-900 mr-1 text-center" value={food.carbs} onChangeText={(v) => onUpdateFood(food.key, "carbs", v)} placeholder="C" placeholderTextColor="#9ca3af" keyboardType="numeric" />
                <TextInput className="w-10 bg-white border border-gray-200 rounded px-1 py-1 text-[10px] text-gray-900 text-center" value={food.fat} onChangeText={(v) => onUpdateFood(food.key, "fat", v)} placeholder="F" placeholderTextColor="#9ca3af" keyboardType="numeric" />
              </View>
            </View>
          ))}
          <View className="flex-row mt-1">
            <TouchableOpacity className="flex-1 border border-dashed border-gray-300 rounded py-1.5 items-center mr-1" onPress={onAddFoodManual}>
              <Text className="text-[10px] text-gray-400">+ Manual</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 border border-dashed border-brand-300 rounded py-1.5 items-center" onPress={onAddFood}>
              <Text className="text-[10px] text-brand-600">+ Search</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function FoodPickerModal({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (food: FoodSearchResult) => void }) {
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={onClose} className="mr-3 p-1"><X size={22} color="#111827" /></TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 flex-1">Search Foods</Text>
        </View>
        <View className="px-4 py-2 bg-white border-b border-gray-100">
          <View className="flex-row items-center bg-gray-50 rounded-lg px-3">
            <Search size={16} color="#9ca3af" />
            <TextInput className="flex-1 py-2 px-2 text-sm text-gray-900" value={search} onChangeText={setSearch} placeholder="Search foods..." placeholderTextColor="#9ca3af" autoFocus />
          </View>
        </View>
        <FlatList
          data={foods || []}
          keyExtractor={(item, i) => `${item.name}-${i}`}
          renderItem={({ item }) => (
            <TouchableOpacity className="px-4 py-3 border-b border-gray-50 bg-white" onPress={() => onSelect(item)} activeOpacity={0.6}>
              <Text className="text-sm text-gray-900">{item.name}</Text>
              <Text className="text-xs text-gray-500">
                {item.portion}{item.calories != null ? ` · ${item.calories} kcal` : ""}
                {item.protein != null ? ` · P:${item.protein}g` : ""}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<View className="items-center py-12"><Text className="text-sm text-gray-400">{search.length < 2 ? "Type to search..." : "No foods found"}</Text></View>}
        />
      </SafeAreaView>
    </Modal>
  );
}
