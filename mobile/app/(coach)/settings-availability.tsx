import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Clock } from "lucide-react-native";
import { useAvailability } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AvailabilityScreen() {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { data: slots, isLoading, error, refetch, isRefetching } = useAvailability();
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/availability", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      setAddingDay(null);
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/availability/${id}`),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const handleAdd = () => {
    if (addingDay === null) return;
    const timePattern = /^\d{2}:\d{2}$/;
    if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
      Alert.alert("Invalid Time", "Times must be in HH:MM format (e.g. 09:00).");
      return;
    }
    if (startTime >= endTime) {
      Alert.alert("Invalid Time Range", "Start time must be before end time.");
      return;
    }
    addMutation.mutate({ dayOfWeek: addingDay, startTime, endTime });
  };

  const slotsByDay = useCallback(() => {
    const grouped: Record<number, typeof slots> = {};
    (slots || []).forEach((s) => {
      if (!grouped[s.dayOfWeek]) grouped[s.dayOfWeek] = [];
      grouped[s.dayOfWeek]!.push(s);
    });
    return grouped;
  }, [slots])();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Header />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Header />
        <QueryError message={t.errors.failedToLoad} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <Header />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
      >
        <Text className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          {t.settings.availabilityDesc}
        </Text>

        {DAYS.map((day, dayIndex) => {
          const daySlots = slotsByDay[dayIndex] || [];
          return (
            <View key={day} className="mb-4">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-sm font-semibold text-gray-900 dark:text-slate-50">{day}</Text>
                <TouchableOpacity
                  onPress={() => { setAddingDay(addingDay === dayIndex ? null : dayIndex); setStartTime("09:00"); setEndTime("17:00"); }}
                  className="p-1"
                >
                  <Plus size={18} color={colors.brand} />
                </TouchableOpacity>
              </View>

              {daySlots.length === 0 && addingDay !== dayIndex && (
                <View className="bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700/40 px-3 py-2.5">
                  <Text className="text-xs text-gray-400 dark:text-slate-500">No slots</Text>
                </View>
              )}

              {daySlots.map((slot) => (
                <View key={slot.id} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700/40 px-3 py-2.5 flex-row items-center mb-1.5">
                  <Clock size={14} color={colors.icon} />
                  <Text className="flex-1 ml-2 text-sm text-gray-900 dark:text-slate-50">
                    {slot.startTime} - {slot.endTime}
                  </Text>
                  <TouchableOpacity
                    onPress={() => Alert.alert(t.common.delete, "Remove this availability slot?", [
                      { text: t.common.cancel, style: "cancel" },
                      { text: t.common.delete, style: "destructive", onPress: () => deleteMutation.mutate(slot.id) },
                    ])}
                    className="p-1"
                  >
                    <Trash2 size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ))}

              {addingDay === dayIndex && (
                <View className="bg-brand-50 rounded-lg border border-brand-200 p-3 mt-1">
                  <View className="flex-row items-center mb-2">
                    <View className="flex-1 mr-2">
                      <Text className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Start</Text>
                      <TextInput
                        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm text-gray-900 dark:text-slate-50"
                        value={startTime}
                        onChangeText={setStartTime}
                        placeholder="09:00"
                        placeholderTextColor={colors.iconMuted}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">End</Text>
                      <TextInput
                        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm text-gray-900 dark:text-slate-50"
                        value={endTime}
                        onChangeText={setEndTime}
                        placeholder="17:00"
                        placeholderTextColor={colors.iconMuted}
                      />
                    </View>
                  </View>
                  <View className="flex-row">
                    <TouchableOpacity
                      className="bg-brand-600 rounded px-3 py-1.5 mr-2"
                      onPress={handleAdd}
                      disabled={addMutation.isPending}
                    >
                      <Text className="text-white text-xs font-semibold">
                        {addMutation.isPending ? t.common.saving : t.common.add}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="px-3 py-1.5" onPress={() => setAddingDay(null)}>
                      <Text className="text-gray-500 dark:text-slate-400 text-xs">{t.common.cancel}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header() {
  const t = useT();
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
      <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
        <ArrowLeft size={22} color={colors.text} />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50 flex-1">{t.settings.availability}</Text>
    </View>
  );
}
