import { useState, useCallback, useEffect } from "react";
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
import { ArrowLeft, Plus, Trash2, Edit3, Heart } from "lucide-react-native";
import { useHabitTemplates } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { AppBottomSheet, BottomSheetTextInput } from "@/components/app-bottom-sheet";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { HabitTemplate } from "@/types/api";

const PRESETS = [
  { name: "Drink Water", icon: "\u{1F4A7}" },
  { name: "Daily Steps", icon: "\u{1F45F}" },
  { name: "Sleep 7+ Hours", icon: "\u{1F634}" },
  { name: "Eat Vegetables", icon: "\u{1F966}" },
  { name: "Take Supplements", icon: "\u{1F48A}" },
  { name: "Stretch", icon: "\u{1F9D8}" },
  { name: "Meal Prep", icon: "\u{1F371}" },
  { name: "No Sugar", icon: "\u{1F6AB}" },
];

export default function HabitBuilderScreen() {
  const t = useT();
  const colors = useThemeColors();
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
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/habits?id=${id}`),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["habit-templates"] });
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const quickAdd = (preset: { name: string; icon: string }) => {
    createMutation.mutate({ name: preset.name, icon: preset.icon });
  };

  const renderHabit = useCallback(({ item }: { item: HabitTemplate }) => (
    <View className="bg-white dark:bg-slate-800 mx-4 mb-2 rounded-xl border border-gray-100 dark:border-slate-700/40 px-4 py-3 flex-row items-center">
      <Text className="text-xl mr-3">{item.icon || "\u2705"}</Text>
      <Text className="flex-1 text-sm font-medium text-gray-900 dark:text-slate-50">{item.name}</Text>
      <TouchableOpacity className="p-2" onPress={() => setEditItem(item)}>
        <Edit3 size={16} color={colors.icon} />
      </TouchableOpacity>
      <TouchableOpacity
        className="p-2"
        onPress={() => Alert.alert(t.common.delete, `Delete "${item.name}"?`, [
          { text: t.common.cancel, style: "cancel" },
          { text: t.common.delete, style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
        ])}
      >
        <Trash2 size={16} color={colors.destructive} />
      </TouchableOpacity>
    </View>
  ), [deleteMutation, colors, t]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50 flex-1">{t.habits.title}</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center" activeOpacity={0.7}>
          <Plus size={16} color="#fff" /><Text className="text-white text-xs font-semibold ml-1">New</Text>
        </TouchableOpacity>
      </View>

      {/* Quick-add presets */}
      <View className="px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <Text className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Quick Add</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {PRESETS.map((p) => (
            <TouchableOpacity
              key={p.name}
              className="bg-gray-50 dark:bg-slate-950 rounded-lg px-3 py-2 mr-2 flex-row items-center"
              onPress={() => quickAdd(p)}
              activeOpacity={0.6}
            >
              <Text className="text-sm mr-1">{p.icon}</Text>
              <Text className="text-xs text-gray-700 dark:text-slate-200">{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={colors.brand} /></View>
      ) : error ? (
        <QueryError message={t.errors.failedToLoad} onRetry={refetch} />
      ) : (
        <FlatList
          data={habits || []}
          keyExtractor={(item) => item.id}
          renderItem={renderHabit}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Heart size={40} color={colors.iconMuted} />
              <Text className="text-gray-400 dark:text-slate-500 text-sm mt-3">{t.habits.noHabits}</Text>
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
  const t = useT();
  const colors = useThemeColors();
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
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["50%", "85%"]}
      title={t.habits.newHabit}
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => {
            if (!name.trim()) return Alert.alert(t.common.required, t.habits.habitName);
            mutation.mutate({ name: name.trim(), icon: icon.trim() || null });
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{t.habits.createHabit}</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.habits.habitName} *</Text>
      <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={name} onChangeText={setName} placeholder={t.habits.habitNamePlaceholder} placeholderTextColor={colors.iconMuted} />
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.habits.icon} (emoji)</Text>
      <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={icon} onChangeText={setIcon} placeholder="\u{1F4A7}" placeholderTextColor={colors.iconMuted} />
    </AppBottomSheet>
  );
}

function HabitEditModal({ item, onClose }: { item: HabitTemplate | null; onClose: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [name, setName] = useState(item?.name || "");
  const [icon, setIcon] = useState(item?.icon || "");

  useEffect(() => {
    if (item) {
      setName(item.name);
      setIcon(item.icon || "");
    } else {
      setName("");
      setIcon("");
    }
  }, [item]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.put("/api/habits", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["habit-templates"] });
      setName(""); setIcon("");
      onClose();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  if (!item) return null;

  return (
    <AppBottomSheet
      visible={!!item}
      onClose={() => { setName(""); setIcon(""); onClose(); }}
      snapPoints={["50%", "85%"]}
      title={t.habits.editHabit}
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => {
            if (!name.trim()) return Alert.alert(t.common.required, t.habits.habitName);
            mutation.mutate({ id: item.id, name: name.trim(), icon: icon.trim() || null });
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{t.common.save}</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.habits.habitName} *</Text>
      <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={name} onChangeText={setName} placeholder={t.habits.habitNamePlaceholder} placeholderTextColor={colors.iconMuted} />
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.habits.icon} (emoji)</Text>
      <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={icon} onChangeText={setIcon} placeholder="\u{1F4A7}" placeholderTextColor={colors.iconMuted} />
    </AppBottomSheet>
  );
}
