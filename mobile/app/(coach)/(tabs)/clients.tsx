import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Search, Dumbbell, Camera, ChevronRight } from "lucide-react-native";
import { useCoachClients } from "@/hooks/use-coach-data";
import { QueryError } from "@/components/query-error";
import { AppHeader } from "@/components/app-header";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { ClientListItem } from "@/types/api";

export default function CoachClientsScreen() {
  const [search, setSearch] = useState("");
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
      <AppHeader title={t.clients.title} />
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
          </View>
        }
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
