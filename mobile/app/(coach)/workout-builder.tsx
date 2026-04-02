import { useState, useEffect } from "react";
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
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  Dumbbell,
  Search,
  X,
  Copy,
  Sparkles,
} from "lucide-react-native";
import {
  useWorkoutPlans,
  useWorkoutPlanDetail,
  useExerciseLibrary,
  useExerciseCategories,
  useEquipmentTypes,
} from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { AppBottomSheet, BottomSheetTextInput } from "@/components/app-bottom-sheet";
import type { WorkoutPlanListItem } from "@/types/api";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";

interface ExerciseForm {
  key: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  restSeconds: string;
  notes: string;
  videoUrl: string;
}

function makeKey() {
  return Math.random().toString(36).slice(2, 10);
}

export default function WorkoutBuilderScreen() {
  const t = useT();
  const colors = useThemeColors();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const queryClient = useQueryClient();
  const { data: plans, isLoading: listLoading, error: listError, refetch, isRefetching } = useWorkoutPlans();
  const [mode, setMode] = useState<"list" | "form">(editId ? "form" : "list");
  const [editingId, setEditingId] = useState<string | undefined>(editId);

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/workouts/${id}/duplicate`),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/workouts/${id}`),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const openCreate = () => {
    setEditingId(undefined);
    setMode("form");
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setMode("form");
  };

  const handleDone = () => {
    queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
    setMode("list");
    setEditingId(undefined);
  };

  if (mode === "form") {
    return <WorkoutForm editId={editingId} onDone={handleDone} />;
  }

  const renderPlan = ({ item }: { item: WorkoutPlanListItem }) => (
    <TouchableOpacity
      className="bg-white dark:bg-slate-800 mx-4 mb-2 rounded-xl border border-gray-100 dark:border-slate-700/40 px-4 py-3"
      onPress={() => openEdit(item.id)}
      activeOpacity={0.6}
    >
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">{item.name}</Text>
          <Text className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {item.exerciseCount} {t.workouts.exercises_count} · {item.assignedCount} {t.workouts.assign.toLowerCase()}ed
            {item.isTemplate ? ` · ${t.workouts.template}` : ""}
          </Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="p-2"
            onPress={() => duplicateMutation.mutate(item.id)}
          >
            <Copy size={16} color={colors.icon} />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2"
            onPress={() => Alert.alert(t.common.delete, `${t.workouts.deleteConfirm}`, [
              { text: t.common.cancel, style: "cancel" },
              { text: t.common.delete, style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
            ])}
          >
            <Trash2 size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50 flex-1">{t.workouts.title}</Text>
        <TouchableOpacity onPress={openCreate} className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center" activeOpacity={0.7}>
          <Plus size={16} color="#fff" />
          <Text className="text-white text-xs font-semibold ml-1">{t.workouts.newPlan}</Text>
        </TouchableOpacity>
      </View>
      {listLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={colors.brand} /></View>
      ) : listError ? (
        <QueryError message={t.errors.failedToLoad} onRetry={refetch} />
      ) : (
        <FlatList
          data={plans || []}
          keyExtractor={(item) => item.id}
          renderItem={renderPlan}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Dumbbell size={40} color={colors.iconMuted} />
              <Text className="text-gray-400 dark:text-slate-500 text-sm mt-3">{t.workouts.noPlans}</Text>
              <TouchableOpacity className="mt-3 bg-brand-600 rounded-lg px-4 py-2" onPress={openCreate}>
                <Text className="text-white text-sm font-semibold">{t.workouts.createPlan}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function WorkoutForm({ editId, onDone }: { editId?: string; onDone: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { data: existing, isLoading } = useWorkoutPlanDetail(editId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [exercises, setExercises] = useState<ExerciseForm[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);

  // AI generation state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiHasGenerated, setAiHasGenerated] = useState(false);
  const [aiRefinement, setAiRefinement] = useState("");
  const [aiRefinements, setAiRefinements] = useState<string[]>([]);
  const [includeVideos, setIncludeVideos] = useState(false);

  // Initialize form from existing plan
  useEffect(() => {
    if (existing && !initialized) {
      setName(existing.name);
      setDescription(existing.description || "");
      setIsTemplate(existing.isTemplate);
      setExercises(
        existing.exercises.map((ex) => ({
          key: makeKey(),
          name: ex.name,
          sets: ex.sets?.toString() || "",
          reps: ex.reps || "",
          weight: ex.weight || "",
          restSeconds: ex.restSeconds?.toString() || "",
          notes: ex.notes || "",
          videoUrl: ex.videoUrl || "",
        }))
      );
      setInitialized(true);
    }
    if (!editId && !initialized) {
      setInitialized(true);
    }
  }, [existing, editId, initialized]);

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editId ? api.put(`/api/workouts/${editId}`, data) : api.post("/api/workouts", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      onDone();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const addExercise = (exerciseName?: string) => {
    setExercises([
      ...exercises,
      {
        key: makeKey(),
        name: exerciseName || "",
        sets: "3",
        reps: "10",
        weight: "",
        restSeconds: "60",
        notes: "",
        videoUrl: "",
      },
    ]);
  };

  const updateExercise = (key: string, field: keyof ExerciseForm, value: string) => {
    setExercises(exercises.map((ex) => (ex.key === key ? { ...ex, [field]: value } : ex)));
  };

  const removeExercise = (key: string) => {
    setExercises(exercises.filter((ex) => ex.key !== key));
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

      const res = await api.post<{
        name: string;
        description: string;
        exercises: Array<{
          name: string;
          sets: number;
          reps: string;
          weight: string;
          restSeconds: number;
          notes: string;
          videoUrl?: string;
        }>;
      }>("/api/ai/generate-workout-plan", {
        prompt: fullPrompt,
        locale: "en",
        includeVideos,
      });

      if (!name.trim()) setName(res.name);
      setExercises(
        res.exercises.map((ex) => ({
          key: makeKey(),
          name: ex.name,
          sets: ex.sets?.toString() || "3",
          reps: ex.reps || "8-12",
          weight: ex.weight || "",
          restSeconds: ex.restSeconds?.toString() || "60",
          notes: ex.notes || "",
          videoUrl: ex.videoUrl || "",
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
    if (!name.trim()) return Alert.alert(t.common.required, t.workouts.planName);
    saveMutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      isTemplate,
      exercises: exercises.map((ex, i) => ({
        name: ex.name.trim(),
        sets: ex.sets ? parseInt(ex.sets) : null,
        reps: ex.reps.trim() || null,
        weight: ex.weight.trim() || null,
        restSeconds: ex.restSeconds ? parseInt(ex.restSeconds) : null,
        notes: ex.notes.trim() || null,
        videoUrl: ex.videoUrl.trim() || null,
        orderIndex: i,
      })),
    });
  };

  const handleBack = () => {
    const hasData = name.trim() || exercises.length > 0;
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
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={handleBack} className="mr-3 p-2.5">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50 flex-1">
          {editId ? t.workouts.editWorkoutPlan : t.workouts.newPlan}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saveMutation.isPending}
          className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center"
          activeOpacity={0.7}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={16} color="#fff" />
              <Text className="text-white text-xs font-semibold ml-1">{t.common.save}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
          <TextInput
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 text-base font-semibold text-gray-900 dark:text-slate-50 mb-3"
            value={name}
            onChangeText={setName}
            placeholder={t.workouts.planNamePlaceholder}
            placeholderTextColor={colors.textTertiary}
          />
          <TextInput
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm text-gray-900 dark:text-slate-50 mb-3"
            value={description}
            onChangeText={setDescription}
            placeholder={t.workouts.aiPromptPlaceholder}
            placeholderTextColor={colors.textTertiary}
            multiline
          />

          {/* AI Generate Section */}
          <View className="mb-3">
            <View className="flex-row items-center">
              <TouchableOpacity
                className={`flex-row items-center rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/25 px-3 py-2 mr-2 ${
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
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => setIncludeVideos(!includeVideos)}
              >
                <View className={`w-4 h-4 rounded border mr-1.5 items-center justify-center ${includeVideos ? "bg-brand-600 border-brand-600" : "border-gray-300 dark:border-slate-600"}`}>
                  {includeVideos && <Text className="text-white text-[11px] font-bold">✓</Text>}
                </View>
                <Text className="text-xs text-gray-500 dark:text-slate-400">Videos</Text>
              </TouchableOpacity>
            </View>
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
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="go"
                  onSubmitEditing={handleAiGenerate}
                />
                {aiRefinements.length > 0 && (
                  <View className="flex-row flex-wrap mt-1.5">
                    {aiRefinements.map((r, i) => (
                      <View key={i} className="flex-row items-center bg-gray-100 dark:bg-slate-700 rounded-md px-2 py-1 mr-1 mb-1">
                        <Text className="text-[10px] text-gray-600 dark:text-slate-300 mr-1">{r}</Text>
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

          <TouchableOpacity
            className="flex-row items-center mb-4"
            onPress={() => setIsTemplate(!isTemplate)}
          >
            <View className={`w-5 h-5 rounded border mr-2 items-center justify-center ${isTemplate ? "bg-brand-600 border-brand-600" : "border-gray-300 dark:border-slate-600"}`}>
              {isTemplate && <Text className="text-white text-xs font-bold">✓</Text>}
            </View>
            <Text className="text-sm text-gray-700 dark:text-slate-200">{t.workouts.template}</Text>
          </TouchableOpacity>

          {/* Exercise list */}
          {exercises.map((ex, index) => (
            <ExerciseCard
              key={ex.key}
              exercise={ex}
              index={index}
              onUpdate={(field, value) => updateExercise(ex.key, field, value)}
              onRemove={() => removeExercise(ex.key)}
            />
          ))}

          <View className="flex-row">
            <TouchableOpacity
              className="flex-1 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl py-3 items-center mr-2"
              onPress={() => addExercise()}
            >
              <Plus size={18} color={colors.iconMuted} />
              <Text className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t.workouts.addBlank}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 border-2 border-dashed border-brand-300 rounded-xl py-3 items-center"
              onPress={() => setShowExercisePicker(true)}
            >
              <Search size={18} color={colors.brand} />
              <Text className="text-xs text-brand-600 mt-1">{t.workouts.fromLibrary}</Text>
            </TouchableOpacity>
          </View>
      </KeyboardAwareScrollView>

      <ExercisePickerModal
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelect={(name) => { addExercise(name); setShowExercisePicker(false); }}
      />
    </SafeAreaView>
  );
}

function ExerciseCard({
  exercise,
  index,
  onUpdate,
  onRemove,
}: {
  exercise: ExerciseForm;
  index: number;
  onUpdate: (field: keyof ExerciseForm, value: string) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(true);

  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 mb-3 overflow-hidden">
      <TouchableOpacity
        className="flex-row items-center px-3 py-2.5 bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-700/40"
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.6}
      >
        <Text className="text-xs font-medium text-gray-500 dark:text-slate-400 mr-2">#{index + 1}</Text>
        <TextInput
          className="flex-1 text-sm font-medium text-gray-900 dark:text-slate-50 py-0"
          value={exercise.name}
          onChangeText={(v) => onUpdate("name", v)}
          placeholder={t.workouts.exerciseName}
          placeholderTextColor={colors.textTertiary}
        />
        <TouchableOpacity onPress={onRemove} className="p-1 ml-1">
          <Trash2 size={16} color={colors.destructive} />
        </TouchableOpacity>
        {expanded ? <ChevronUp size={16} color={colors.iconMuted} /> : <ChevronDown size={16} color={colors.iconMuted} />}
      </TouchableOpacity>

      {expanded && (
        <View className="px-3 py-3">
          <View className="flex-row mb-2">
            <View className="flex-1 mr-2">
              <Text className="text-[11px] text-gray-500 dark:text-slate-400 mb-0.5">{t.workouts.sets}</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm text-gray-900 dark:text-slate-50 text-center"
                value={exercise.sets}
                onChangeText={(v) => onUpdate("sets", v)}
                keyboardType="number-pad"
                placeholder="3"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-[11px] text-gray-500 dark:text-slate-400 mb-0.5">{t.workouts.reps}</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm text-gray-900 dark:text-slate-50 text-center"
                value={exercise.reps}
                onChangeText={(v) => onUpdate("reps", v)}
                placeholder="10"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-[11px] text-gray-500 dark:text-slate-400 mb-0.5">{t.workouts.weight}</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm text-gray-900 dark:text-slate-50 text-center"
                value={exercise.weight}
                onChangeText={(v) => onUpdate("weight", v)}
                placeholder="kg"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] text-gray-500 dark:text-slate-400 mb-0.5">{t.workouts.restSec}</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm text-gray-900 dark:text-slate-50 text-center"
                value={exercise.restSeconds}
                onChangeText={(v) => onUpdate("restSeconds", v)}
                keyboardType="number-pad"
                placeholder="60"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>
          <TextInput
            className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm text-gray-900 dark:text-slate-50"
            value={exercise.notes}
            onChangeText={(v) => onUpdate("notes", v)}
            placeholder={t.workouts.formCues}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      )}
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-2.5 py-1 rounded-full mr-1.5 mb-1.5 border ${active ? "bg-brand-600 border-brand-600" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"}`}
    >
      <Text className={`text-xs ${active ? "text-white font-medium" : "text-gray-600 dark:text-slate-300"}`}>{label}</Text>
    </TouchableOpacity>
  );
}

function ExercisePickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
}) {
  const t = useT();
  const colors = useThemeColors();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | undefined>();
  const [selectedEquipment, setSelectedEquipment] = useState<string | undefined>();

  const { data: categories } = useExerciseCategories();
  const { data: equipmentTypes } = useEquipmentTypes();
  const { data: exercises } = useExerciseLibrary(
    search.length >= 2 ? search : undefined,
    selectedCategory,
    { difficulty: selectedDifficulty, equipment: selectedEquipment }
  );

  const difficulties = ["Beginner", "Novice", "Intermediate", "Advanced", "Expert"];

  useEffect(() => {
    if (visible) {
      setSearch("");
      setSelectedCategory(undefined);
      setSelectedDifficulty(undefined);
      setSelectedEquipment(undefined);
    }
  }, [visible]);

  const hasFilters = selectedCategory || selectedDifficulty || selectedEquipment;

  const stickyHeader = (
    <>
      <View className="flex-row items-center bg-gray-50 dark:bg-slate-950 rounded-lg px-3 mb-3">
        <Search size={16} color={colors.iconMuted} />
        <BottomSheetTextInput
          className="flex-1 py-2.5 px-2 text-sm text-gray-900 dark:text-slate-50"
          value={search}
          onChangeText={setSearch}
          placeholder={t.exerciseLibrary.searchPlaceholder}
          placeholderTextColor={colors.textTertiary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <X size={14} color={colors.iconMuted} />
          </TouchableOpacity>
        )}
      </View>

      {categories && categories.length > 0 && (
        <View className="mb-2">
          <Text className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">{t.exerciseLibrary.category}</Text>
          <GHScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            {categories.map((cat) => (
              <FilterChip key={cat.id} label={cat.name} active={selectedCategory === cat.name} onPress={() => setSelectedCategory(selectedCategory === cat.name ? undefined : cat.name)} />
            ))}
          </GHScrollView>
        </View>
      )}

      <View className="mb-2">
        <Text className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">{t.exerciseLibrary.difficulty}</Text>
        <GHScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
          {difficulties.map((d) => (
            <FilterChip key={d} label={d} active={selectedDifficulty === d} onPress={() => setSelectedDifficulty(selectedDifficulty === d ? undefined : d)} />
          ))}
        </GHScrollView>
      </View>

      {equipmentTypes && equipmentTypes.length > 0 && (
        <View className="mb-2">
          <Text className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">{t.exerciseLibrary.equipment}</Text>
          <GHScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            {equipmentTypes.map((eq) => (
              <FilterChip key={eq.id} label={eq.name} active={selectedEquipment === eq.name} onPress={() => setSelectedEquipment(selectedEquipment === eq.name ? undefined : eq.name)} />
            ))}
          </GHScrollView>
        </View>
      )}

      {hasFilters && (
        <TouchableOpacity className="mb-2" onPress={() => { setSelectedCategory(undefined); setSelectedDifficulty(undefined); setSelectedEquipment(undefined); }}>
          <Text className="text-xs text-brand-600 font-medium">{t.common.clearFilters}</Text>
        </TouchableOpacity>
      )}

      <View className="border-t border-gray-100 dark:border-slate-700/40 pt-1">
        <Text className="text-[10px] text-gray-400 dark:text-slate-500">{exercises?.length ?? 0} {t.exerciseLibrary.exerciseCount}</Text>
      </View>
    </>
  );

  return (
    <AppBottomSheet visible={visible} onClose={() => { setSearch(""); onClose(); }} snapPoints={["85%"]} title={t.exerciseLibrary.browseLibrary} stickyHeader={stickyHeader}>
      {(exercises || []).length === 0 ? (
        <View className="items-center py-10">
          <Text className="text-sm text-gray-400 dark:text-slate-500">{t.exerciseLibrary.noExercisesFound}</Text>
        </View>
      ) : (
        (exercises || []).slice(0, 50).map((item) => (
          <TouchableOpacity
            key={item.id}
            className="py-2.5 border-b border-gray-50 dark:border-slate-700/40"
            onPress={() => { onSelect(item.name); setSearch(""); }}
            activeOpacity={0.6}
          >
            <Text className="text-sm text-gray-900 dark:text-slate-50">{item.name}</Text>
            <Text className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
              {[item.category, item.muscleGroup, item.equipment, item.difficulty].filter(Boolean).join(" · ")}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </AppBottomSheet>
  );
}
