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
import type { Inquiry } from "@/types/api";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "bg-blue-50", text: "text-blue-700" },
  contacted: { bg: "bg-green-50", text: "text-green-700" },
  archived: { bg: "bg-gray-100", text: "text-gray-500" },
};

export default function InquiriesScreen() {
  const queryClient = useQueryClient();
  const { data: inquiries, isLoading, error, refetch, isRefetching } = useInquiries();

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/settings/inquiries/${id}`, { status }),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/settings/inquiries/${id}`),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const cycleStatus = (inquiry: Inquiry) => {
    const next = inquiry.status === "new" ? "contacted" : inquiry.status === "contacted" ? "archived" : "new";
    statusMutation.mutate({ id: inquiry.id, status: next });
  };

  const renderItem = useCallback(({ item }: { item: Inquiry }) => {
    const colors = STATUS_COLORS[item.status] || STATUS_COLORS.new;
    return (
      <View className="bg-white mx-4 mb-3 rounded-xl border border-gray-100 overflow-hidden">
        <View className="px-4 py-3">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-sm font-semibold text-gray-900 flex-1" numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity onPress={() => cycleStatus(item)} className={`px-2 py-0.5 rounded-full ${colors.bg}`}>
              <Text className={`text-[10px] font-medium capitalize ${colors.text}`}>{item.status}</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center mb-1">
            <Mail size={12} color="#9ca3af" />
            <Text className="text-xs text-gray-500 ml-1">{item.email}</Text>
          </View>
          {item.phone && (
            <View className="flex-row items-center mb-1">
              <Phone size={12} color="#9ca3af" />
              <Text className="text-xs text-gray-500 ml-1">{item.phone}</Text>
            </View>
          )}
          <Text className="text-sm text-gray-700 mt-1" numberOfLines={3}>{item.message}</Text>
          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-xs text-gray-400">
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <TouchableOpacity
              onPress={() => Alert.alert("Delete", "Delete this inquiry?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
              ])}
            >
              <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, []);

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
        <QueryError message="Failed to load inquiries" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Header />
      <FlatList
        data={inquiries || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <MessageSquare size={40} color="#d1d5db" />
            <Text className="text-gray-400 text-sm mt-3">No inquiries yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
      <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
        <ArrowLeft size={22} color="#111827" />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-gray-900 flex-1">Inquiries</Text>
    </View>
  );
}
