import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Search,
  Plus,
  Dumbbell,
  Filter,
  Edit3,
  Trash2,
  Video,
} from "lucide-react-native";
import { useExerciseLibrary, useExerciseCategories, useEquipmentTypes } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { AppBottomSheet, BottomSheetTextInput } from "@/components/app-bottom-sheet";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { ExerciseLibraryItem } from "@/types/api";

const DIFFICULTIES = ["Beginner", "Novice", "Intermediate", "Advanced", "Expert"];

export default function ExercisesScreen() {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | undefined>();
  const [selectedEquipment, setSelectedEquipment] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [detailItem, setDetailItem] = useState<ExerciseLibraryItem | null>(null);

  const { data: exercises, isLoading, error, refetch, isRefetching } =
    useExerciseLibrary(search || undefined, selectedCategory, { difficulty: selectedDifficulty, equipment: selectedEquipment });
  const { data: categories } = useExerciseCategories();
  const { data: equipmentTypes } = useEquipmentTypes();

  const hasFilters = selectedCategory || selectedDifficulty || selectedEquipment;

  const renderItem = useCallback(({ item }: { item: ExerciseLibraryItem }) => (
    <TouchableOpacity
      className="bg-white dark:bg-slate-800 mx-4 mb-2 rounded-xl border border-gray-100 dark:border-slate-700/40 px-4 py-3"
      onPress={() => setDetailItem(item)}
      activeOpacity={0.6}
    >
      <Text className="text-sm font-medium text-gray-900 dark:text-slate-50" numberOfLines={1}>{item.name}</Text>
      <View className="flex-row mt-1">
        {item.category && (
          <View className="bg-blue-50 dark:bg-blue-900/25 rounded-full px-2 py-0.5 mr-1.5">
            <Text className="text-[10px] text-blue-700 dark:text-blue-300">{item.category}</Text>
          </View>
        )}
        {item.muscleGroup && (
          <View className="bg-purple-50 dark:bg-purple-900/20 rounded-full px-2 py-0.5 mr-1.5">
            <Text className="text-[10px] text-purple-700 dark:text-purple-300">{item.muscleGroup}</Text>
          </View>
        )}
        {item.equipment && (
          <View className="bg-amber-50 dark:bg-amber-900/25 rounded-full px-2 py-0.5">
            <Text className="text-[10px] text-amber-700 dark:text-amber-300">{item.equipment}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50 flex-1">{t.exerciseLibrary.title}</Text>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center"
          activeOpacity={0.7}
        >
          <Plus size={14} color="#fff" />
          <Text className="text-white text-xs font-semibold ml-1">New</Text>
        </TouchableOpacity>
      </View>

      {/* Search + Filter */}
      <View className="px-4 py-2 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <View className="flex-row items-center bg-gray-50 dark:bg-slate-950 rounded-lg px-3">
          <Search size={16} color={colors.iconMuted} />
          <TextInput
            className="flex-1 py-2 px-2 text-sm text-gray-900 dark:text-slate-50"
            value={search}
            onChangeText={setSearch}
            placeholder={t.exerciseLibrary.searchPlaceholder}
            placeholderTextColor={colors.iconMuted}
          />
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)} className="p-1">
            <Filter size={16} color={hasFilters ? colors.brand : colors.iconMuted} />
          </TouchableOpacity>
        </View>
        {showFilters && (
          <ScrollView style={{ maxHeight: 200 }} className="mt-2" nestedScrollEnabled>
            {/* Category */}
            <Text className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">{t.exerciseLibrary.category}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              <TouchableOpacity
                className={`mr-1.5 px-2.5 py-1 rounded-full border ${!selectedCategory ? "bg-brand-600 border-brand-600" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"}`}
                onPress={() => setSelectedCategory(undefined)}
              >
                <Text className={`text-xs ${!selectedCategory ? "text-white font-medium" : "text-gray-600 dark:text-slate-300"}`}>{t.common.all}</Text>
              </TouchableOpacity>
              {(categories || []).map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  className={`mr-1.5 px-2.5 py-1 rounded-full border ${selectedCategory === cat.name ? "bg-brand-600 border-brand-600" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"}`}
                  onPress={() => setSelectedCategory(selectedCategory === cat.name ? undefined : cat.name)}
                >
                  <Text className={`text-xs ${selectedCategory === cat.name ? "text-white font-medium" : "text-gray-600 dark:text-slate-300"}`}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Difficulty */}
            <Text className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">{t.exerciseLibrary.difficulty}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              {DIFFICULTIES.map((d) => (
                <TouchableOpacity
                  key={d}
                  className={`mr-1.5 px-2.5 py-1 rounded-full border ${selectedDifficulty === d ? "bg-brand-600 border-brand-600" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"}`}
                  onPress={() => setSelectedDifficulty(selectedDifficulty === d ? undefined : d)}
                >
                  <Text className={`text-xs ${selectedDifficulty === d ? "text-white font-medium" : "text-gray-600 dark:text-slate-300"}`}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Equipment */}
            {equipmentTypes && equipmentTypes.length > 0 && (
              <>
                <Text className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">{t.exerciseLibrary.equipment}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                  {equipmentTypes.map((eq) => (
                    <TouchableOpacity
                      key={eq.id}
                      className={`mr-1.5 px-2.5 py-1 rounded-full border ${selectedEquipment === eq.name ? "bg-brand-600 border-brand-600" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"}`}
                      onPress={() => setSelectedEquipment(selectedEquipment === eq.name ? undefined : eq.name)}
                    >
                      <Text className={`text-xs ${selectedEquipment === eq.name ? "text-white font-medium" : "text-gray-600 dark:text-slate-300"}`}>
                        {eq.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Clear filters */}
            {hasFilters && (
              <TouchableOpacity onPress={() => { setSelectedCategory(undefined); setSelectedDifficulty(undefined); setSelectedEquipment(undefined); }}>
                <Text className="text-xs text-brand-600 font-medium mb-1">{t.common.clearAll}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : error ? (
        <QueryError message={t.errors.failedToLoad} onRetry={refetch} />
      ) : (
        <FlatList
          data={exercises || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Dumbbell size={40} color={colors.iconMuted} />
              <Text className="text-gray-400 dark:text-slate-500 text-sm mt-3">{t.exerciseLibrary.noExercisesFound}</Text>
            </View>
          }
        />
      )}

      <ExerciseDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
      <CreateExerciseModal visible={showCreate} onClose={() => setShowCreate(false)} />
    </SafeAreaView>
  );
}

function ExerciseDetailModal({ item, onClose }: { item: ExerciseLibraryItem | null; onClose: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [equip, setEquip] = useState("");
  const [instructions, setInstructions] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const startEdit = useCallback(() => {
    if (!item) return;
    setName(item.name);
    setCategory(item.category || "");
    setMuscleGroup(item.muscleGroup || "");
    setEquip(item.equipment || "");
    setInstructions(item.instructions || "");
    setVideoUrl(item.videoUrl || "");
    setEditing(true);
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/api/exercise-library/${item?.id}`, data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
      setEditing(false);
      onClose();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/exercise-library/${item?.id}`),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
      onClose();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const handleClose = () => {
    setEditing(false);
    onClose();
  };

  if (!item) return null;

  return (
    <AppBottomSheet
      visible={!!item}
      onClose={handleClose}
      snapPoints={["50%", "85%"]}
      title={editing ? "Edit Exercise" : item.name}
      footer={editing ? (
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${updateMutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => {
            if (!name.trim()) return Alert.alert(t.common.required, t.exerciseLibrary.exerciseName);
            updateMutation.mutate({
              name: name.trim(),
              category: category.trim() || null,
              muscleGroup: muscleGroup.trim() || null,
              equipment: equip.trim() || null,
              instructions: instructions.trim() || null,
              videoUrl: videoUrl.trim() || null,
            });
          }}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{t.common.save}</Text>}
        </TouchableOpacity>
      ) : undefined}
    >
      {editing ? (
        <>
          <FormField label={`${t.common.name} *`} value={name} onChange={setName} placeholder={t.exerciseLibrary.namePlaceholder} />
          <FormField label={t.exerciseLibrary.category} value={category} onChange={setCategory} placeholder="e.g. Chest, Back, Legs" />
          <FormField label={t.exerciseLibrary.muscleGroup} value={muscleGroup} onChange={setMuscleGroup} placeholder="e.g. Pectorals, Lats" />
          <FormField label={t.exerciseLibrary.equipment} value={equip} onChange={setEquip} placeholder="e.g. Barbell, Dumbbell" />
          <FormField label={t.exerciseLibrary.videoUrl} value={videoUrl} onChange={setVideoUrl} placeholder="https://..." keyboard="url" />
          <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.exerciseLibrary.instructions}</Text>
          <BottomSheetTextInput
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50"
            value={instructions}
            onChangeText={setInstructions}
            placeholder={t.exerciseLibrary.instructionsPlaceholder}
            placeholderTextColor={colors.iconMuted}
            multiline
            textAlignVertical="top"
            style={{ minHeight: 80 }}
          />
        </>
      ) : (
        <>
          {/* Action buttons */}
          <View className="flex-row mb-4 gap-2">
            <TouchableOpacity
              className="flex-row items-center bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2"
              onPress={startEdit}
            >
              <Edit3 size={14} color={colors.icon} />
              <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 ml-1.5">{t.common.edit}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center bg-red-50 dark:bg-red-900/25 rounded-lg px-3 py-2"
              onPress={() => Alert.alert(t.common.delete, `Delete "${item.name}"?`, [
                { text: t.common.cancel, style: "cancel" },
                { text: t.common.delete, style: "destructive", onPress: () => deleteMutation.mutate() },
              ])}
            >
              <Trash2 size={14} color={colors.destructive} />
              <Text className="text-sm font-medium text-red-600 dark:text-red-400 ml-1.5">{t.common.delete}</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap mb-4">
            {item.category && <Tag label={item.category} bg="bg-blue-50 dark:bg-blue-900/25" text="text-blue-700 dark:text-blue-300" />}
            {item.muscleGroup && <Tag label={item.muscleGroup} bg="bg-purple-50 dark:bg-purple-900/20" text="text-purple-700 dark:text-purple-300" />}
            {item.equipment && <Tag label={item.equipment} bg="bg-amber-50 dark:bg-amber-900/25" text="text-amber-700 dark:text-amber-300" />}
            {item.difficulty && <Tag label={item.difficulty} bg="bg-green-50 dark:bg-green-900/25" text="text-green-700 dark:text-green-300" />}
            {item.bodyRegion && <Tag label={item.bodyRegion} bg="bg-pink-50 dark:bg-pink-900/20" text="text-pink-700 dark:text-pink-300" />}
          </View>
          {item.secondaryMuscles && <Detail label="Secondary Muscles" value={item.secondaryMuscles} />}
          {item.secondaryEquipment && <Detail label="Secondary Equipment" value={item.secondaryEquipment} />}
          {item.instructions && (
            <View className="mt-2">
              <Text className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{t.exerciseLibrary.instructions}</Text>
              <Text className="text-sm text-gray-700 dark:text-slate-200 leading-5">{item.instructions}</Text>
            </View>
          )}
          {item.videoUrl && (
            <TouchableOpacity
              className="flex-row items-center mt-4 bg-brand-50 dark:bg-brand-900/20 rounded-lg px-3 py-2.5"
              onPress={() => Linking.openURL(item.videoUrl!).catch(() => {})}
              activeOpacity={0.7}
            >
              <Video size={18} color={colors.brand} />
              <Text className="text-sm font-medium text-brand-700 dark:text-brand-300 ml-2">Watch Video</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </AppBottomSheet>
  );
}

function CreateExerciseModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { data: categories } = useExerciseCategories();
  const { data: equipment } = useEquipmentTypes();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [equip, setEquip] = useState("");
  const [instructions, setInstructions] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/api/exercise-library", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
      setName(""); setCategory(""); setMuscleGroup(""); setEquip(""); setInstructions(""); setVideoUrl("");
      onClose();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["50%", "85%"]}
      title={t.exerciseLibrary.addExercise}
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => {
            if (!name.trim()) return Alert.alert(t.common.required, t.exerciseLibrary.exerciseName);
            mutation.mutate({
              name: name.trim(),
              category: category.trim() || null,
              muscleGroup: muscleGroup.trim() || null,
              equipment: equip.trim() || null,
              instructions: instructions.trim() || null,
              videoUrl: videoUrl.trim() || null,
            });
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{t.exerciseLibrary.createExercise}</Text>}
        </TouchableOpacity>
      }
    >
      <FormField label={`${t.common.name} *`} value={name} onChange={setName} placeholder={t.exerciseLibrary.namePlaceholder} />
      <FormField label={t.exerciseLibrary.category} value={category} onChange={setCategory} placeholder="e.g. Chest, Back, Legs" />
      <FormField label={t.exerciseLibrary.muscleGroup} value={muscleGroup} onChange={setMuscleGroup} placeholder="e.g. Pectorals, Lats" />
      <FormField label={t.exerciseLibrary.equipment} value={equip} onChange={setEquip} placeholder="e.g. Barbell, Dumbbell" />
      <FormField label={t.exerciseLibrary.videoUrl} value={videoUrl} onChange={setVideoUrl} placeholder="https://..." keyboard="url" />
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.exerciseLibrary.instructions}</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50"
        value={instructions}
        onChangeText={setInstructions}
        placeholder={t.exerciseLibrary.instructionsPlaceholder}
        placeholderTextColor={colors.iconMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        style={{ minHeight: 100 }}
      />
    </AppBottomSheet>
  );
}

function FormField({ label, value, onChange, placeholder, keyboard }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; keyboard?: string }) {
  const colors = useThemeColors();
  return (
    <>
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{label}</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.iconMuted}
        autoCapitalize={keyboard === "url" ? "none" : "sentences"}
        keyboardType={keyboard === "url" ? "url" : "default"}
      />
    </>
  );
}

function Tag({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <View className={`${bg} rounded-full px-2.5 py-1 mr-1.5 mb-1.5`}>
      <Text className={`text-xs font-medium ${text}`}>{label}</Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2">
      <Text className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</Text>
      <Text className="text-sm text-gray-700 dark:text-slate-200">{value}</Text>
    </View>
  );
}
