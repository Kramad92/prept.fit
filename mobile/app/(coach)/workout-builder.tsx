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
} from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { AppBottomSheet } from "@/components/app-bottom-sheet";
import type { WorkoutPlanListItem } from "@/types/api";

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
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/workouts/${id}`),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
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
      className="bg-white mx-4 mb-2 rounded-xl border border-gray-100 px-4 py-3"
      onPress={() => openEdit(item.id)}
      activeOpacity={0.6}
    >
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-900">{item.name}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            {item.exerciseCount} exercises · {item.assignedCount} assigned
            {item.isTemplate ? " · Template" : ""}
          </Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="p-2"
            onPress={() => duplicateMutation.mutate(item.id)}
          >
            <Copy size={16} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2"
            onPress={() => Alert.alert("Delete", `Delete "${item.name}"?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
            ])}
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 flex-1">Workout Plans</Text>
        <TouchableOpacity onPress={openCreate} className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center" activeOpacity={0.7}>
          <Plus size={14} color="#fff" />
          <Text className="text-white text-xs font-semibold ml-1">New</Text>
        </TouchableOpacity>
      </View>
      {listLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#059669" /></View>
      ) : listError ? (
        <QueryError message="Failed to load plans" onRetry={refetch} />
      ) : (
        <FlatList
          data={plans || []}
          keyExtractor={(item) => item.id}
          renderItem={renderPlan}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Dumbbell size={40} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-3">No workout plans yet</Text>
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

function WorkoutForm({ editId, onDone }: { editId?: string; onDone: () => void }) {
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
    onError: (err: any) => Alert.alert("Error", err.message),
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
      setAiError(e.message || "AI generation failed");
    } finally {
      setAiLoading(false);
    }
  };

  const removeAiRefinement = (index: number) => {
    setAiRefinements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) return Alert.alert("Required", "Plan name is required");
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
        { text: "Cancel", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: onDone },
      ]);
    } else {
      onDone();
    }
  };

  if (editId && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={handleBack} className="mr-3 p-1">
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 flex-1">
          {editId ? "Edit Plan" : "New Plan"}
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
              <Save size={14} color="#fff" />
              <Text className="text-white text-xs font-semibold ml-1">Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <TextInput
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base font-semibold text-gray-900 mb-3"
            value={name}
            onChangeText={setName}
            placeholder="Plan name"
            placeholderTextColor="#9ca3af"
          />
          <TextInput
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 mb-3"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the workout (e.g. 'Upper body push day for intermediate')..."
            placeholderTextColor="#9ca3af"
            multiline
          />

          {/* AI Generate Section */}
          <View className="mb-3">
            <View className="flex-row items-center">
              <TouchableOpacity
                className={`flex-row items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 mr-2 ${
                  !description.trim() || aiLoading ? "opacity-50" : ""
                }`}
                onPress={handleAiGenerate}
                disabled={!description.trim() || aiLoading}
                activeOpacity={0.7}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <Sparkles size={14} color="#059669" />
                )}
                <Text className="text-xs font-medium text-emerald-700 ml-1.5">
                  {aiLoading ? "Generating..." : aiHasGenerated ? "Regenerate" : "Generate with AI"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => setIncludeVideos(!includeVideos)}
              >
                <View className={`w-4 h-4 rounded border mr-1.5 items-center justify-center ${includeVideos ? "bg-brand-600 border-brand-600" : "border-gray-300"}`}>
                  {includeVideos && <Text className="text-white text-[8px] font-bold">✓</Text>}
                </View>
                <Text className="text-xs text-gray-500">Videos</Text>
              </TouchableOpacity>
            </View>
            {aiError ? (
              <Text className="text-xs text-red-500 mt-1">{aiError}</Text>
            ) : null}
            {aiHasGenerated && (
              <View className="mt-2">
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700"
                  value={aiRefinement}
                  onChangeText={setAiRefinement}
                  placeholder="Refine: e.g. 'add more leg exercises', 'reduce rest times'..."
                  placeholderTextColor="#9ca3af"
                  returnKeyType="go"
                  onSubmitEditing={handleAiGenerate}
                />
                {aiRefinements.length > 0 && (
                  <View className="flex-row flex-wrap mt-1.5">
                    {aiRefinements.map((r, i) => (
                      <View key={i} className="flex-row items-center bg-gray-100 rounded-md px-2 py-1 mr-1 mb-1">
                        <Text className="text-[10px] text-gray-600 mr-1">{r}</Text>
                        <TouchableOpacity onPress={() => removeAiRefinement(i)}>
                          <X size={10} color="#9ca3af" />
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
            <View className={`w-5 h-5 rounded border mr-2 items-center justify-center ${isTemplate ? "bg-brand-600 border-brand-600" : "border-gray-300"}`}>
              {isTemplate && <Text className="text-white text-xs font-bold">✓</Text>}
            </View>
            <Text className="text-sm text-gray-700">Save as template</Text>
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
              className="flex-1 border-2 border-dashed border-gray-300 rounded-xl py-3 items-center mr-2"
              onPress={() => addExercise()}
            >
              <Plus size={18} color="#9ca3af" />
              <Text className="text-xs text-gray-400 mt-1">Add Exercise</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 border-2 border-dashed border-brand-300 rounded-xl py-3 items-center"
              onPress={() => setShowExercisePicker(true)}
            >
              <Search size={18} color="#059669" />
              <Text className="text-xs text-brand-600 mt-1">From Library</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
  const [expanded, setExpanded] = useState(true);

  return (
    <View className="bg-white rounded-xl border border-gray-200 mb-3 overflow-hidden">
      <TouchableOpacity
        className="flex-row items-center px-3 py-2.5 bg-gray-50 border-b border-gray-100"
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.6}
      >
        <Text className="text-xs font-medium text-gray-500 mr-2">#{index + 1}</Text>
        <TextInput
          className="flex-1 text-sm font-medium text-gray-900 py-0"
          value={exercise.name}
          onChangeText={(v) => onUpdate("name", v)}
          placeholder="Exercise name"
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity onPress={onRemove} className="p-1 ml-1">
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
        {expanded ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
      </TouchableOpacity>

      {expanded && (
        <View className="px-3 py-3">
          <View className="flex-row mb-2">
            <View className="flex-1 mr-2">
              <Text className="text-[10px] text-gray-500 mb-0.5">Sets</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 text-center"
                value={exercise.sets}
                onChangeText={(v) => onUpdate("sets", v)}
                keyboardType="number-pad"
                placeholder="3"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-[10px] text-gray-500 mb-0.5">Reps</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 text-center"
                value={exercise.reps}
                onChangeText={(v) => onUpdate("reps", v)}
                placeholder="10"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-[10px] text-gray-500 mb-0.5">Weight</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 text-center"
                value={exercise.weight}
                onChangeText={(v) => onUpdate("weight", v)}
                placeholder="kg"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] text-gray-500 mb-0.5">Rest (s)</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 text-center"
                value={exercise.restSeconds}
                onChangeText={(v) => onUpdate("restSeconds", v)}
                keyboardType="number-pad"
                placeholder="60"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900"
            value={exercise.notes}
            onChangeText={(v) => onUpdate("notes", v)}
            placeholder="Notes (optional)"
            placeholderTextColor="#9ca3af"
          />
        </View>
      )}
    </View>
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
  const [search, setSearch] = useState("");
  const { data: exercises } = useExerciseLibrary(search || undefined);

  return (
    <AppBottomSheet
      visible={visible}
      onClose={() => { setSearch(""); onClose(); }}
      snapPoints={["50%", "85%"]}
      title="Pick Exercise"
    >
      <View className="flex-row items-center bg-gray-50 rounded-lg px-3 mb-3 -mx-1">
        <Search size={16} color="#9ca3af" />
        <TextInput
          className="flex-1 py-2 px-2 text-sm text-gray-900"
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises..."
          placeholderTextColor="#9ca3af"
        />
      </View>
      {(exercises || []).slice(0, 50).length === 0 ? (
        <View className="items-center py-12">
          <Text className="text-sm text-gray-400">No exercises found</Text>
        </View>
      ) : (
        (exercises || []).slice(0, 50).map((item) => (
          <TouchableOpacity
            key={item.id}
            className="py-3 border-b border-gray-50"
            onPress={() => { onSelect(item.name); setSearch(""); }}
            activeOpacity={0.6}
          >
            <Text className="text-sm text-gray-900">{item.name}</Text>
            <Text className="text-xs text-gray-500">{[item.category, item.muscleGroup].filter(Boolean).join(" · ")}</Text>
          </TouchableOpacity>
        ))
      )}
    </AppBottomSheet>
  );
}
