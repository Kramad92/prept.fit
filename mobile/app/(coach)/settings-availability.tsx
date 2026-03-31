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

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AvailabilityScreen() {
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
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/availability/${id}`),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
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
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <Header />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <Header />
        <QueryError message="Failed to load availability" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Header />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}
      >
        <Text className="text-sm text-gray-500 mb-4">
          Set your recurring weekly availability for client bookings.
        </Text>

        {DAYS.map((day, dayIndex) => {
          const daySlots = slotsByDay[dayIndex] || [];
          return (
            <View key={day} className="mb-4">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-sm font-semibold text-gray-900">{day}</Text>
                <TouchableOpacity
                  onPress={() => { setAddingDay(addingDay === dayIndex ? null : dayIndex); setStartTime("09:00"); setEndTime("17:00"); }}
                  className="p-1"
                >
                  <Plus size={18} color="#059669" />
                </TouchableOpacity>
              </View>

              {daySlots.length === 0 && addingDay !== dayIndex && (
                <View className="bg-white rounded-lg border border-gray-100 px-3 py-2.5">
                  <Text className="text-xs text-gray-400">No slots</Text>
                </View>
              )}

              {daySlots.map((slot) => (
                <View key={slot.id} className="bg-white rounded-lg border border-gray-100 px-3 py-2.5 flex-row items-center mb-1.5">
                  <Clock size={14} color="#6b7280" />
                  <Text className="flex-1 ml-2 text-sm text-gray-900">
                    {slot.startTime} - {slot.endTime}
                  </Text>
                  <TouchableOpacity
                    onPress={() => Alert.alert("Delete Slot", "Remove this availability slot?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(slot.id) },
                    ])}
                    className="p-1"
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}

              {addingDay === dayIndex && (
                <View className="bg-brand-50 rounded-lg border border-brand-200 p-3 mt-1">
                  <View className="flex-row items-center mb-2">
                    <View className="flex-1 mr-2">
                      <Text className="text-xs text-gray-500 mb-0.5">Start</Text>
                      <TextInput
                        className="bg-white border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900"
                        value={startTime}
                        onChangeText={setStartTime}
                        placeholder="09:00"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 mb-0.5">End</Text>
                      <TextInput
                        className="bg-white border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900"
                        value={endTime}
                        onChangeText={setEndTime}
                        placeholder="17:00"
                        placeholderTextColor="#9ca3af"
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
                        {addMutation.isPending ? "Adding..." : "Add"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="px-3 py-1.5" onPress={() => setAddingDay(null)}>
                      <Text className="text-gray-500 text-xs">Cancel</Text>
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
  return (
    <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
      <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
        <ArrowLeft size={22} color="#111827" />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-gray-900 flex-1">Availability</Text>
    </View>
  );
}
