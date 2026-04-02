import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardCheck,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react-native";
import { useCoachCheckIns } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { CheckIn } from "@/types/api";

export default function CheckInSubmissionsScreen() {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { data: checkIns, isLoading, error, refetch, isRefetching } = useCoachCheckIns();

  const sorted = useMemo(
    () =>
      [...(checkIns || [])].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      ),
    [checkIns]
  );

  const renderItem = useCallback(
    ({ item }: { item: CheckIn }) => <CheckInCard checkIn={item} />,
    []
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50 flex-1">
          Client Check-ins
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : error ? (
        <QueryError message={t.errors.failedToLoad} onRetry={refetch} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <ClipboardCheck size={40} color={colors.iconMuted} />
              <Text className="text-gray-400 dark:text-slate-500 text-sm mt-3">
                No check-ins submitted yet
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function CheckInCard({ checkIn }: { checkIn: CheckIn }) {
  const colors = useThemeColors();
  const t = useT();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(checkIn.coachNotes || "");

  const notesMutation = useMutation({
    mutationFn: (coachNotes: string) =>
      api.put(`/api/check-ins/${checkIn.id}/notes`, { coachNotes: coachNotes.trim() || null }),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-check-ins"] });
      setEditingNotes(false);
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <View className="bg-white dark:bg-slate-800 mx-4 mb-2 rounded-xl border border-gray-100 dark:border-slate-700/40">
      <TouchableOpacity
        className="p-4"
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-900/25 items-center justify-center mr-3">
            <ClipboardCheck size={16} color="#6366f1" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">
              {checkIn.template?.name || "Check-in"}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-slate-400">
              {formatDate(checkIn.submittedAt)}
            </Text>
          </View>
          <View className="flex-row items-center">
            {checkIn.coachNotes && (
              <View className="bg-brand-50 rounded-full px-2 py-0.5 mr-2">
                <Text className="text-[10px] text-brand-700 font-medium">Responded</Text>
              </View>
            )}
            {expanded ? (
              <ChevronUp size={16} color={colors.iconMuted} />
            ) : (
              <ChevronDown size={16} color={colors.iconMuted} />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View className="px-4 pb-4 border-t border-gray-50 dark:border-slate-700/40 pt-3">
          {/* Client answers */}
          {checkIn.answers.map((a, i) => (
            <View key={a.questionId || i} className="mb-3">
              <Text className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-0.5">
                {checkIn.template?.questions?.[i]?.question || `Question ${i + 1}`}
              </Text>
              <Text className="text-sm text-gray-900 dark:text-slate-50">{a.answer}</Text>
            </View>
          ))}

          {/* Coach notes section */}
          <View className="mt-2 pt-3 border-t border-gray-100 dark:border-slate-700/40">
            <View className="flex-row items-center mb-2">
              <MessageSquare size={14} color={colors.brand} />
              <Text className="text-sm font-medium text-brand-700 dark:text-brand-300 ml-1">
                Coach Feedback
              </Text>
            </View>

            {editingNotes ? (
              <View>
                <TextInput
                  className="bg-gray-50 dark:bg-slate-900 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-slate-50 border border-gray-200 dark:border-slate-700 min-h-[80px]"
                  placeholder="Write your feedback..."
                  placeholderTextColor={colors.iconMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
                <View className="flex-row justify-end mt-2 gap-2">
                  <TouchableOpacity
                    className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700"
                    onPress={() => {
                      setNotes(checkIn.coachNotes || "");
                      setEditingNotes(false);
                    }}
                  >
                    <Text className="text-xs font-medium text-gray-600 dark:text-slate-300">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-row items-center px-3 py-1.5 rounded-lg ${
                      notesMutation.isPending ? "bg-brand-400" : "bg-brand-600"
                    }`}
                    onPress={() => notesMutation.mutate(notes)}
                    disabled={notesMutation.isPending}
                  >
                    {notesMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Send size={12} color="#fff" />
                        <Text className="text-xs font-medium text-white ml-1">Save</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : checkIn.coachNotes ? (
              <TouchableOpacity
                className="bg-brand-50 dark:bg-brand-900/20 rounded-lg p-3"
                onPress={() => setEditingNotes(true)}
                activeOpacity={0.7}
              >
                <Text className="text-sm text-gray-800 dark:text-slate-100">{checkIn.coachNotes}</Text>
                <Text className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">Tap to edit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 items-center border border-dashed border-gray-200 dark:border-slate-700"
                onPress={() => setEditingNotes(true)}
                activeOpacity={0.7}
              >
                <Text className="text-sm text-gray-400 dark:text-slate-500">
                  Tap to add feedback
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
