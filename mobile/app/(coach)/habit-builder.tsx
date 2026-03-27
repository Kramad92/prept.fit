import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Edit3, X, Heart } from "lucide-react-native";
import { useHabitTemplates } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import type { HabitTemplate } from "@/types/api";

const PRESETS = [
  { name: "Drink Water", icon: "💧" },
  { name: "Daily Steps", icon: "👟" },
  { name: "Sleep 7+ Hours", icon: "😴" },
  { name: "Eat Vegetables", icon: "🥦" },
  { name: "Take Supplements", icon: "💊" },
  { name: "Stretch", icon: "🧘" },
  { name: "Meal Prep", icon: "🍱" },
  { name: "No Sugar", icon: "🚫" },
];

export default function HabitBuilderScreen() {
  const queryClient = useQueryClient();
  const { data: habits, isLoading, error, refetch, isRefetching } = useHabitTemplates();
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<HabitTemplate | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/habits", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["habit-templates"] });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/habits?id=${id}`),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["habit-templates"] });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const quickAdd = (preset: { name: string; icon: string }) => {
    createMutation.mutate({ name: preset.name, icon: preset.icon });
  };

  const renderHabit = useCallback(({ item }: { item: HabitTemplate }) => (
    <View className="bg-white mx-4 mb-2 rounded-xl border border-gray-100 px-4 py-3 flex-row items-center">
      <Text className="text-xl mr-3">{item.icon || "✅"}</Text>
      <Text className="flex-1 text-sm font-medium text-gray-900">{item.name}</Text>
      <TouchableOpacity className="p-2" onPress={() => setEditItem(item)}>
        <Edit3 size={16} color="#6b7280" />
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
  ), []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 flex-1">Habits</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center" activeOpacity={0.7}>
          <Plus size={14} color="#fff" /><Text className="text-white text-xs font-semibold ml-1">New</Text>
        </TouchableOpacity>
      </View>

      {/* Quick-add presets */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <Text className="text-xs font-medium text-gray-500 mb-2">Quick Add</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {PRESETS.map((p) => (
            <TouchableOpacity
              key={p.name}
              className="bg-gray-50 rounded-lg px-3 py-2 mr-2 flex-row items-center"
              onPress={() => quickAdd(p)}
              activeOpacity={0.6}
            >
              <Text className="text-sm mr-1">{p.icon}</Text>
              <Text className="text-xs text-gray-700">{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#059669" /></View>
      ) : error ? (
        <QueryError message="Failed to load habits" onRetry={refetch} />
      ) : (
        <FlatList
          data={habits || []}
          keyExtractor={(item) => item.id}
          renderItem={renderHabit}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Heart size={40} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-3">No habits created yet</Text>
            </View>
          }
        />
      )}

      <HabitFormModal visible={showCreate} onClose={() => setShowCreate(false)} />
      <HabitEditModal item={editItem} onClose={() => setEditItem(null)} />
    </SafeAreaView>
  );
}

function HabitFormModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/api/habits", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["habit-templates"] });
      setName(""); setIcon("");
      onClose();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={onClose} className="mr-3 p-1"><X size={22} color="#111827" /></TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 flex-1">New Habit</Text>
        </View>
        <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
          <Text className="text-sm font-medium text-gray-700 mb-1">Name *</Text>
          <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={name} onChangeText={setName} placeholder="e.g. Drink 3L water" placeholderTextColor="#9ca3af" />
          <Text className="text-sm font-medium text-gray-700 mb-1">Icon (emoji)</Text>
          <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base text-gray-900" value={icon} onChangeText={setIcon} placeholder="💧" placeholderTextColor="#9ca3af" />
          <TouchableOpacity
            className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
            onPress={() => {
              if (!name.trim()) return Alert.alert("Required", "Name is required");
              mutation.mutate({ name: name.trim(), icon: icon.trim() || null });
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Create Habit</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function HabitEditModal({ item, onClose }: { item: HabitTemplate | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(item?.name || "");
  const [icon, setIcon] = useState(item?.icon || "");

  // Sync state when item changes
  if (item && name === "" && item.name !== "") {
    setName(item.name);
    setIcon(item.icon || "");
  }

  const mutation = useMutation({
    mutationFn: (data: any) => api.put("/api/habits", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["habit-templates"] });
      setName(""); setIcon("");
      onClose();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  if (!item) return null;

  return (
    <Modal visible={!!item} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={() => { setName(""); setIcon(""); onClose(); }} className="mr-3 p-1"><X size={22} color="#111827" /></TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 flex-1">Edit Habit</Text>
        </View>
        <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
          <Text className="text-sm font-medium text-gray-700 mb-1">Name *</Text>
          <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={name} onChangeText={setName} placeholder="Habit name" placeholderTextColor="#9ca3af" />
          <Text className="text-sm font-medium text-gray-700 mb-1">Icon (emoji)</Text>
          <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base text-gray-900" value={icon} onChangeText={setIcon} placeholder="💧" placeholderTextColor="#9ca3af" />
          <TouchableOpacity
            className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
            onPress={() => {
              if (!name.trim()) return Alert.alert("Required", "Name is required");
              mutation.mutate({ id: item.id, name: name.trim(), icon: icon.trim() || null });
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Save Changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
