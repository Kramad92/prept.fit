import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Dumbbell, Camera, ChevronRight, Plus } from "lucide-react-native";
import { useCoachClients } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { AppHeader } from "@/components/app-header";
import { AppBottomSheet, BottomSheetTextInput } from "@/components/app-bottom-sheet";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { ClientListItem } from "@/types/api";

const GENDERS = ["Male", "Female", "Other"];

export default function CoachClientsScreen() {
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: clients, isLoading, error, refetch, isRefetching } =
    useCoachClients();
  const t = useT();
  const colors = useThemeColors();

  const filtered = useMemo(() => {
    if (!clients) return [];
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const renderClient = useCallback(
    ({ item }: { item: ClientListItem }) => (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3.5 bg-white dark:bg-slate-800 border-b border-gray-50 dark:border-slate-700/40"
        onPress={() =>
          router.push({ pathname: "/(coach)/clients/[id]", params: { id: item.id } } as any)
        }
        activeOpacity={0.6}
      >
        <View className="w-10 h-10 rounded-full bg-brand-50 items-center justify-center mr-3">
          <Text className="text-brand-700 font-semibold text-base">
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-medium text-gray-900 dark:text-slate-50">
            {item.name}
          </Text>
          <View className="flex-row items-center mt-0.5">
            {item.email && (
              <Text className="text-xs text-gray-500 dark:text-slate-400 mr-3" numberOfLines={1}>
                {item.email}
              </Text>
            )}
            <StatusBadge status={item.status} />
          </View>
        </View>
        <View className="flex-row items-center">
          {item._count.assignedPlans > 0 && (
            <View className="flex-row items-center mr-2">
              <Dumbbell size={12} color={colors.iconMuted} />
              <Text className="text-xs text-gray-400 dark:text-slate-500 ml-0.5">
                {item._count.assignedPlans}
              </Text>
            </View>
          )}
          {item._count.progressPhotos > 0 && (
            <View className="flex-row items-center mr-2">
              <Camera size={12} color={colors.iconMuted} />
              <Text className="text-xs text-gray-400 dark:text-slate-500 ml-0.5">
                {item._count.progressPhotos}
              </Text>
            </View>
          )}
          <ChevronRight size={16} color={colors.iconMuted} />
        </View>
      </TouchableOpacity>
    ),
    [colors]
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <QueryError message={t.errors.failedToLoad} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <AppHeader
        title={t.clients.title}
        rightContent={
          <TouchableOpacity
            onPress={() => setShowCreateForm(true)}
            className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center"
            activeOpacity={0.7}
          >
            <Plus size={16} color="#fff" />
            <Text className="text-white text-xs font-semibold ml-1">New</Text>
          </TouchableOpacity>
        }
      />
      <View className="px-4 pb-2">
        <View className="flex-row items-center bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2.5">
          <Search size={18} color={colors.iconMuted} />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-900 dark:text-slate-50"
            placeholder={t.clients.searchPlaceholder}
            placeholderTextColor={colors.iconMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderClient}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Text className="text-gray-400 dark:text-slate-500 text-sm">
              {search ? t.common.noResults : t.clients.noClients}
            </Text>
            {!search && (
              <TouchableOpacity
                className="mt-3 bg-brand-600 rounded-lg px-4 py-2"
                onPress={() => setShowCreateForm(true)}
              >
                <Text className="text-white text-sm font-semibold">Add Client</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <CreateClientSheet
        visible={showCreateForm}
        onClose={() => setShowCreateForm(false)}
      />
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE" || status === "active";
  return (
    <View
      className={`px-1.5 py-0.5 rounded-full ${
        isActive ? "bg-green-50 dark:bg-green-900/25" : "bg-gray-100 dark:bg-slate-700"
      }`}
    >
      <Text
        className={`text-[10px] font-medium ${
          isActive ? "text-green-700 dark:text-green-300" : "text-gray-500 dark:text-slate-400"
        }`}
      >
        {status}
      </Text>
    </View>
  );
}

function CreateClientSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [goals, setGoals] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setGender(null);
    setGoals("");
    setNotes("");
  };

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/api/clients", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-clients"] });
      queryClient.invalidateQueries({ queryKey: ["coach-dashboard"] });
      reset();
      onClose();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert(t.common.required, "Client name is required");
      return;
    }
    mutation.mutate({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      gender: gender || null,
      goals: goals.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <AppBottomSheet
      visible={visible}
      onClose={() => { reset(); onClose(); }}
      snapPoints={["50%", "85%"]}
      title="New Client"
      footer={
        <TouchableOpacity
          className={`rounded-xl py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={handleCreate}
          disabled={mutation.isPending}
          activeOpacity={0.7}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Create Client</Text>
          )}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Name *</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50"
        placeholder="Client name"
        placeholderTextColor={colors.iconMuted}
        value={name}
        onChangeText={setName}
      />

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Email</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50"
        placeholder="email@example.com"
        placeholderTextColor={colors.iconMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Phone</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50"
        placeholder="+1 234 567 890"
        placeholderTextColor={colors.iconMuted}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Gender</Text>
      <View className="flex-row flex-wrap mb-4">
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g}
            className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${
              gender === g
                ? "bg-brand-600"
                : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
            }`}
            onPress={() => setGender(gender === g ? null : g)}
          >
            <Text
              className={`text-xs font-medium ${
                gender === g ? "text-white" : "text-gray-600 dark:text-slate-300"
              }`}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Goals</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-sm text-gray-900 dark:text-slate-50 min-h-[60px]"
        placeholder="Client goals..."
        placeholderTextColor={colors.iconMuted}
        value={goals}
        onChangeText={setGoals}
        multiline
        textAlignVertical="top"
      />

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Notes</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-2 text-sm text-gray-900 dark:text-slate-50 min-h-[60px]"
        placeholder="Additional notes..."
        placeholderTextColor={colors.iconMuted}
        value={notes}
        onChangeText={setNotes}
        multiline
        textAlignVertical="top"
      />
    </AppBottomSheet>
  );
}
