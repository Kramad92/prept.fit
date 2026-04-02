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
} from "lucide-react-native";
import { useExerciseLibrary, useExerciseCategories, useEquipmentTypes } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { AppBottomSheet } from "@/components/app-bottom-sheet";
import type { ExerciseLibraryItem } from "@/types/api";

const DIFFICULTIES = ["Beginner", "Novice", "Intermediate", "Advanced", "Expert"];

export default function ExercisesScreen() {
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
      className="bg-white mx-4 mb-2 rounded-xl border border-gray-100 px-4 py-3"
      onPress={() => setDetailItem(item)}
      activeOpacity={0.6}
    >
      <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>{item.name}</Text>
      <View className="flex-row mt-1">
        {item.category && (
          <View className="bg-blue-50 rounded-full px-2 py-0.5 mr-1.5">
            <Text className="text-[10px] text-blue-700">{item.category}</Text>
          </View>
        )}
        {item.muscleGroup && (
          <View className="bg-purple-50 rounded-full px-2 py-0.5 mr-1.5">
            <Text className="text-[10px] text-purple-700">{item.muscleGroup}</Text>
          </View>
        )}
        {item.equipment && (
          <View className="bg-amber-50 rounded-full px-2 py-0.5">
            <Text className="text-[10px] text-amber-700">{item.equipment}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 flex-1">Exercises</Text>
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
      <View className="px-4 py-2 bg-white border-b border-gray-100">
        <View className="flex-row items-center bg-gray-50 rounded-lg px-3">
          <Search size={16} color="#9ca3af" />
          <TextInput
            className="flex-1 py-2 px-2 text-sm text-gray-900"
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises..."
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)} className="p-1">
            <Filter size={16} color={hasFilters ? "#059669" : "#9ca3af"} />
          </TouchableOpacity>
        </View>
        {showFilters && (
          <ScrollView style={{ maxHeight: 200 }} className="mt-2" nestedScrollEnabled>
            {/* Category */}
            <Text className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              <TouchableOpacity
                className={`mr-1.5 px-2.5 py-1 rounded-full border ${!selectedCategory ? "bg-brand-600 border-brand-600" : "bg-white border-gray-200"}`}
                onPress={() => setSelectedCategory(undefined)}
              >
                <Text className={`text-xs ${!selectedCategory ? "text-white font-medium" : "text-gray-600"}`}>All</Text>
              </TouchableOpacity>
              {(categories || []).map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  className={`mr-1.5 px-2.5 py-1 rounded-full border ${selectedCategory === cat.name ? "bg-brand-600 border-brand-600" : "bg-white border-gray-200"}`}
                  onPress={() => setSelectedCategory(selectedCategory === cat.name ? undefined : cat.name)}
                >
                  <Text className={`text-xs ${selectedCategory === cat.name ? "text-white font-medium" : "text-gray-600"}`}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Difficulty */}
            <Text className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Difficulty</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              {DIFFICULTIES.map((d) => (
                <TouchableOpacity
                  key={d}
                  className={`mr-1.5 px-2.5 py-1 rounded-full border ${selectedDifficulty === d ? "bg-brand-600 border-brand-600" : "bg-white border-gray-200"}`}
                  onPress={() => setSelectedDifficulty(selectedDifficulty === d ? undefined : d)}
                >
                  <Text className={`text-xs ${selectedDifficulty === d ? "text-white font-medium" : "text-gray-600"}`}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Equipment */}
            {equipmentTypes && equipmentTypes.length > 0 && (
              <>
                <Text className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Equipment</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                  {equipmentTypes.map((eq) => (
                    <TouchableOpacity
                      key={eq.id}
                      className={`mr-1.5 px-2.5 py-1 rounded-full border ${selectedEquipment === eq.name ? "bg-brand-600 border-brand-600" : "bg-white border-gray-200"}`}
                      onPress={() => setSelectedEquipment(selectedEquipment === eq.name ? undefined : eq.name)}
                    >
                      <Text className={`text-xs ${selectedEquipment === eq.name ? "text-white font-medium" : "text-gray-600"}`}>
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
                <Text className="text-xs text-brand-600 font-medium mb-1">Clear all filters</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : error ? (
        <QueryError message="Failed to load exercises" onRetry={refetch} />
      ) : (
        <FlatList
          data={exercises || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Dumbbell size={40} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-3">No exercises found</Text>
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
  if (!item) return null;
  return (
    <AppBottomSheet visible={!!item} onClose={onClose} snapPoints={["50%", "85%"]} title={item.name}>
      <View className="flex-row flex-wrap mb-4">
        {item.category && <Tag label={item.category} bg="bg-blue-50" text="text-blue-700" />}
        {item.muscleGroup && <Tag label={item.muscleGroup} bg="bg-purple-50" text="text-purple-700" />}
        {item.equipment && <Tag label={item.equipment} bg="bg-amber-50" text="text-amber-700" />}
        {item.difficulty && <Tag label={item.difficulty} bg="bg-green-50" text="text-green-700" />}
        {item.bodyRegion && <Tag label={item.bodyRegion} bg="bg-pink-50" text="text-pink-700" />}
      </View>
      {item.secondaryMuscles && (
        <Detail label="Secondary Muscles" value={item.secondaryMuscles} />
      )}
      {item.secondaryEquipment && (
        <Detail label="Secondary Equipment" value={item.secondaryEquipment} />
      )}
      {item.instructions && (
        <View className="mt-2">
          <Text className="text-xs font-medium text-gray-500 mb-1">Instructions</Text>
          <Text className="text-sm text-gray-700 leading-5">{item.instructions}</Text>
        </View>
      )}
      {item.videoUrl && (
        <View className="mt-4">
          <Text className="text-xs font-medium text-gray-500 mb-1">Video</Text>
          <Text className="text-sm text-brand-600">{item.videoUrl}</Text>
        </View>
      )}
    </AppBottomSheet>
  );
}

function CreateExerciseModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
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
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["50%", "85%"]}
      title="New Exercise"
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => {
            if (!name.trim()) return Alert.alert("Required", "Name is required");
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
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Create Exercise</Text>}
        </TouchableOpacity>
      }
    >
      <FormField label="Name *" value={name} onChange={setName} placeholder="Exercise name" />
      <FormField label="Category" value={category} onChange={setCategory} placeholder="e.g. Chest, Back, Legs" />
      <FormField label="Muscle Group" value={muscleGroup} onChange={setMuscleGroup} placeholder="e.g. Pectorals, Lats" />
      <FormField label="Equipment" value={equip} onChange={setEquip} placeholder="e.g. Barbell, Dumbbell" />
      <FormField label="Video URL" value={videoUrl} onChange={setVideoUrl} placeholder="https://..." keyboard="url" />
      <Text className="text-sm font-medium text-gray-700 mb-1">Instructions</Text>
      <TextInput
        className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900"
        value={instructions}
        onChangeText={setInstructions}
        placeholder="Step-by-step instructions..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        style={{ minHeight: 100 }}
      />
    </AppBottomSheet>
  );
}

function FormField({ label, value, onChange, placeholder, keyboard }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; keyboard?: string }) {
  return (
    <>
      <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>
      <TextInput
        className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
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
      <Text className="text-xs font-medium text-gray-500">{label}</Text>
      <Text className="text-sm text-gray-700">{value}</Text>
    </View>
  );
}
