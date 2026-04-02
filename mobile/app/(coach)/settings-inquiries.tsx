import { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MessageSquare,
  Trash2,
  Mail,
  Phone,
} from "lucide-react-native";
import { useInquiries } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { Inquiry } from "@/types/api";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "bg-blue-50 dark:bg-blue-900/25", text: "text-blue-700 dark:text-blue-300" },
  contacted: { bg: "bg-green-50 dark:bg-green-900/25", text: "text-green-700 dark:text-green-300" },
  archived: { bg: "bg-gray-100 dark:bg-slate-700", text: "text-gray-500 dark:text-slate-400" },
};

export default function InquiriesScreen() {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { data: inquiries, isLoading, error, refetch, isRefetching } = useInquiries();

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/settings/inquiries/${id}`, { status }),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/settings/inquiries/${id}`),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const cycleStatus = (inquiry: Inquiry) => {
    const next = inquiry.status === "new" ? "contacted" : inquiry.status === "contacted" ? "archived" : "new";
    statusMutation.mutate({ id: inquiry.id, status: next });
  };

  const renderItem = useCallback(({ item }: { item: Inquiry }) => {
    const statusColors = STATUS_COLORS[item.status] || STATUS_COLORS.new;
    return (
      <View className="bg-white dark:bg-slate-800 mx-4 mb-3 rounded-xl border border-gray-100 dark:border-slate-700/40 overflow-hidden">
        <View className="px-4 py-3">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-sm font-semibold text-gray-900 dark:text-slate-50 flex-1" numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity onPress={() => cycleStatus(item)} className={`px-2 py-0.5 rounded-full ${statusColors.bg}`}>
              <Text className={`text-[10px] font-medium capitalize ${statusColors.text}`}>{item.status}</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center mb-1">
            <Mail size={12} color={colors.iconMuted} />
            <Text className="text-xs text-gray-500 dark:text-slate-400 ml-1">{item.email}</Text>
          </View>
          {item.phone && (
            <View className="flex-row items-center mb-1">
              <Phone size={12} color={colors.iconMuted} />
              <Text className="text-xs text-gray-500 dark:text-slate-400 ml-1">{item.phone}</Text>
            </View>
          )}
          <Text className="text-sm text-gray-700 dark:text-slate-200 mt-1" numberOfLines={3}>{item.message}</Text>
          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-xs text-gray-400 dark:text-slate-500">
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <TouchableOpacity
              onPress={() => Alert.alert(t.common.delete, "Delete this inquiry?", [
                { text: t.common.cancel, style: "cancel" },
                { text: t.common.delete, style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
              ])}
            >
              <Trash2 size={16} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [statusMutation, deleteMutation, colors, t]);

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
      <FlatList
        data={inquiries || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <MessageSquare size={40} color={colors.iconMuted} />
            <Text className="text-gray-400 dark:text-slate-500 text-sm mt-3">No inquiries yet</Text>
          </View>
        }
      />
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
      <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50 flex-1">Inquiries</Text>
    </View>
  );
}
