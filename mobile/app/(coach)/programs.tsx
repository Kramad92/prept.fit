import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  X,
  Dumbbell,
  UtensilsCrossed,
  Calendar,
  Layers,
} from "lucide-react-native";
import { usePrograms, useNutritionPrograms } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import type { ProgramListItem, NutritionProgramListItem } from "@/types/api";

type Tab = "workout" | "nutrition";

export default function ProgramsScreen() {
  const [tab, setTab] = useState<Tab>("workout");
  const queryClient = useQueryClient();
  const { data: workoutPrograms, isLoading: wLoading, error: wError, refetch: wRefetch, isRefetching: wRefetching } = usePrograms();
  const { data: nutritionPrograms, isLoading: nLoading, error: nError, refetch: nRefetch, isRefetching: nRefetching } = useNutritionPrograms();
  const [showCreate, setShowCreate] = useState(false);

  const wDeleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/programs/${id}`),
    onSuccess: () => { haptics.light(); queryClient.invalidateQueries({ queryKey: ["programs"] }); },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const nDeleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/nutrition-programs/${id}`),
    onSuccess: () => { haptics.light(); queryClient.invalidateQueries({ queryKey: ["nutrition-programs"] }); },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const renderWorkoutProgram = useCallback(({ item }: { item: ProgramListItem }) => (
    <View className="bg-white mx-4 mb-2 rounded-xl border border-gray-100 px-4 py-3 flex-row items-center">
      <View className="w-9 h-9 rounded-full bg-purple-50 items-center justify-center mr-3">
        <Dumbbell size={16} color="#8b5cf6" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-900">{item.name}</Text>
        <Text className="text-xs text-gray-500">
          {item.durationWeeks}w · {item.daysPerWeek} days/week · {item.assignedCount} assigned
        </Text>
      </View>
      <TouchableOpacity className="p-2" onPress={() => Alert.alert("Delete", `Delete "${item.name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => wDeleteMutation.mutate(item.id) },
      ])}>
        <Trash2 size={16} color="#ef4444" />
      </TouchableOpacity>
    </View>
  ), []);

  const renderNutritionProgram = useCallback(({ item }: { item: NutritionProgramListItem }) => (
    <View className="bg-white mx-4 mb-2 rounded-xl border border-gray-100 px-4 py-3 flex-row items-center">
      <View className="w-9 h-9 rounded-full bg-green-50 items-center justify-center mr-3">
        <UtensilsCrossed size={16} color="#10b981" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-900">{item.name}</Text>
        <Text className="text-xs text-gray-500">
          {item.durationWeeks}w · {item.mealsPerDay} meals/day · {item.assignedCount} assigned
        </Text>
      </View>
      <TouchableOpacity className="p-2" onPress={() => Alert.alert("Delete", `Delete "${item.name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => nDeleteMutation.mutate(item.id) },
      ])}>
        <Trash2 size={16} color="#ef4444" />
      </TouchableOpacity>
    </View>
  ), []);

  const isLoading = tab === "workout" ? wLoading : nLoading;
  const errorState = tab === "workout" ? wError : nError;
  const refetch = tab === "workout" ? wRefetch : nRefetch;
  const isRefetching = tab === "workout" ? wRefetching : nRefetching;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 flex-1">Programs</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center" activeOpacity={0.7}>
          <Plus size={14} color="#fff" /><Text className="text-white text-xs font-semibold ml-1">New</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 py-2 bg-white border-b border-gray-100">
        <TouchableOpacity className={`mr-4 pb-1 ${tab === "workout" ? "border-b-2 border-brand-600" : ""}`} onPress={() => setTab("workout")}>
          <Text className={`text-sm font-medium ${tab === "workout" ? "text-brand-600" : "text-gray-500"}`}>Workout</Text>
        </TouchableOpacity>
        <TouchableOpacity className={`pb-1 ${tab === "nutrition" ? "border-b-2 border-brand-600" : ""}`} onPress={() => setTab("nutrition")}>
          <Text className={`text-sm font-medium ${tab === "nutrition" ? "text-brand-600" : "text-gray-500"}`}>Nutrition</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#059669" /></View>
      ) : errorState ? (
        <QueryError message="Failed to load programs" onRetry={refetch} />
      ) : tab === "workout" ? (
        <FlatList
          data={workoutPrograms || []}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkoutProgram}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Layers size={40} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-3">No workout programs</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={nutritionPrograms || []}
          keyExtractor={(item) => item.id}
          renderItem={renderNutritionProgram}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Layers size={40} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-3">No nutrition programs</Text>
            </View>
          }
        />
      )}

      <CreateProgramModal visible={showCreate} tab={tab} onClose={() => setShowCreate(false)} />
    </SafeAreaView>
  );
}

function CreateProgramModal({ visible, tab, onClose }: { visible: boolean; tab: Tab; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("4");
  const [perWeek, setPerWeek] = useState("3");

  const mutation = useMutation({
    mutationFn: (data: any) =>
      tab === "workout"
        ? api.post("/api/programs", data)
        : api.post("/api/nutrition-programs", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: [tab === "workout" ? "programs" : "nutrition-programs"] });
      setName(""); setDescription(""); setDurationWeeks("4"); setPerWeek("3");
      onClose();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-gray-50">
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
            <TouchableOpacity onPress={onClose} className="mr-3 p-1"><X size={22} color="#111827" /></TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900 flex-1">
              New {tab === "workout" ? "Workout" : "Nutrition"} Program
            </Text>
          </View>
          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
            <Text className="text-sm font-medium text-gray-700 mb-1">Name *</Text>
            <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={name} onChangeText={setName} placeholder="Program name" placeholderTextColor="#9ca3af" />
            <Text className="text-sm font-medium text-gray-700 mb-1">Description</Text>
            <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={description} onChangeText={setDescription} placeholder="Optional description" placeholderTextColor="#9ca3af" multiline />
            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-sm font-medium text-gray-700 mb-1">Duration (weeks)</Text>
                <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 text-center" value={durationWeeks} onChangeText={setDurationWeeks} keyboardType="number-pad" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  {tab === "workout" ? "Days/week" : "Meals/day"}
                </Text>
                <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 text-center" value={perWeek} onChangeText={setPerWeek} keyboardType="number-pad" />
              </View>
            </View>
            <TouchableOpacity
              className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
              onPress={() => {
                if (!name.trim()) return Alert.alert("Required", "Name is required");
                const body: any = {
                  name: name.trim(),
                  description: description.trim() || null,
                  durationWeeks: parseInt(durationWeeks) || 4,
                };
                if (tab === "workout") body.daysPerWeek = parseInt(perWeek) || 3;
                else body.mealsPerDay = parseInt(perWeek) || 3;
                mutation.mutate(body);
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Create Program</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
