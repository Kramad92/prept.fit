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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Copy,
  ClipboardList,
} from "lucide-react-native";
import { useCheckInTemplates } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { AppBottomSheet, BottomSheetTextInput } from "@/components/app-bottom-sheet";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { CheckInTemplate } from "@/types/api";

const FREQUENCIES = ["weekly", "biweekly", "monthly", "daily"];

export default function CheckInBuilderScreen() {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { data: templates, isLoading, error, refetch, isRefetching } = useCheckInTemplates();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<CheckInTemplate | null>(null);

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/check-ins/templates/${id}/duplicate`),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["checkin-templates"] });
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/check-ins/templates/${id}`),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["checkin-templates"] });
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const renderTemplate = useCallback(({ item }: { item: CheckInTemplate }) => (
    <View className="bg-white dark:bg-slate-800 mx-4 mb-2 rounded-xl border border-gray-100 dark:border-slate-700/40 px-4 py-3">
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">{item.name}</Text>
          <View className="flex-row items-center mt-1">
            <View className="bg-blue-50 dark:bg-blue-900/25 rounded-full px-2 py-0.5 mr-2">
              <Text className="text-[10px] text-blue-700 dark:text-blue-300 capitalize">{item.frequency}</Text>
            </View>
            <Text className="text-xs text-gray-500 dark:text-slate-400">{item.questions.length} {t.checkIns.questions}</Text>
          </View>
        </View>
        <TouchableOpacity className="p-2" onPress={() => setEditItem(item)}>
          <Edit3 size={16} color={colors.icon} />
        </TouchableOpacity>
        <TouchableOpacity className="p-2" onPress={() => duplicateMutation.mutate(item.id)}>
          <Copy size={16} color={colors.icon} />
        </TouchableOpacity>
        <TouchableOpacity className="p-2" onPress={() => Alert.alert(t.common.delete, `Delete "${item.name}"?`, [
          { text: t.common.cancel, style: "cancel" },
          { text: t.common.delete, style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
        ])}>
          <Trash2 size={16} color={colors.destructive} />
        </TouchableOpacity>
      </View>
      <View className="mt-2 border-t border-gray-50 dark:border-slate-700/40 pt-2">
        {item.questions.slice(0, 3).map((q, i) => (
          <Text key={q.id} className="text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
            {i + 1}. {q.question}
          </Text>
        ))}
        {item.questions.length > 3 && (
          <Text className="text-xs text-gray-400 dark:text-slate-500">+{item.questions.length - 3} more</Text>
        )}
      </View>
    </View>
  ), [duplicateMutation, deleteMutation, colors, t]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50 flex-1">{t.checkIns.title}</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center" activeOpacity={0.7}>
          <Plus size={16} color="#fff" /><Text className="text-white text-xs font-semibold ml-1">New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={colors.brand} /></View>
      ) : error ? (
        <QueryError message={t.errors.failedToLoad} onRetry={refetch} />
      ) : (
        <FlatList
          data={templates || []}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplate}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <ClipboardList size={40} color={colors.iconMuted} />
              <Text className="text-gray-400 dark:text-slate-500 text-sm mt-3">{t.checkIns.noTemplates}</Text>
              <TouchableOpacity className="mt-3 bg-brand-600 rounded-lg px-4 py-2" onPress={() => setShowForm(true)}>
                <Text className="text-white text-sm font-semibold">{t.checkIns.createTemplate}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <TemplateFormModal visible={showForm} onClose={() => setShowForm(false)} />
      <TemplateEditModal item={editItem} onClose={() => setEditItem(null)} />
    </SafeAreaView>
  );
}

function TemplateFormModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [questions, setQuestions] = useState<string[]>([""]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/api/check-ins/templates", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["checkin-templates"] });
      setName(""); setFrequency("weekly"); setQuestions([""]);
      onClose();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["50%", "85%"]}
      title={t.checkIns.newTemplate}
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => {
            if (!name.trim()) return Alert.alert(t.common.required, t.checkIns.templateName);
            const validQ = questions.filter((q) => q.trim());
            if (validQ.length === 0) return Alert.alert(t.common.required, "At least one question is required");
            mutation.mutate({ name: name.trim(), frequency, questions: validQ.map((q) => q.trim()) });
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{t.checkIns.createTemplate}</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.checkIns.templateName} *</Text>
      <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={name} onChangeText={setName} placeholder={t.checkIns.templateNamePlaceholder} placeholderTextColor={colors.iconMuted} />

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.checkIns.frequency}</Text>
      <View className="flex-row flex-wrap mb-4">
        {FREQUENCIES.map((f) => (
          <TouchableOpacity key={f} className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${frequency === f ? "bg-brand-600" : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"}`} onPress={() => setFrequency(f)}>
            <Text className={`text-xs font-medium capitalize ${frequency === f ? "text-white" : "text-gray-600 dark:text-slate-300"}`}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">{t.checkIns.questions}</Text>
      {questions.map((q, i) => (
        <View key={`q-${i}-${q.slice(0, 8)}`} className="flex-row items-center mb-2">
          <Text className="text-xs text-gray-400 dark:text-slate-500 mr-2 w-4">{i + 1}.</Text>
          <BottomSheetTextInput
            className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-slate-50"
            value={q}
            onChangeText={(v) => {
              const updated = [...questions];
              updated[i] = v;
              setQuestions(updated);
            }}
            placeholder={t.checkIns.questionPlaceholder}
            placeholderTextColor={colors.iconMuted}
          />
          {questions.length > 1 && (
            <TouchableOpacity className="p-2 ml-1" onPress={() => setQuestions(questions.filter((_, j) => j !== i))}>
              <Trash2 size={14} color={colors.destructive} />
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity className="flex-row items-center py-2" onPress={() => setQuestions([...questions, ""])}>
        <Plus size={16} color={colors.brand} />
        <Text className="text-sm text-brand-600 ml-1">{t.checkIns.addQuestion}</Text>
      </TouchableOpacity>
    </AppBottomSheet>
  );
}

function TemplateEditModal({ item, onClose }: { item: CheckInTemplate | null; onClose: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [questions, setQuestions] = useState<string[]>([""]);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setFrequency(item.frequency);
      setQuestions(item.questions.map((q) => q.question));
    } else {
      setName("");
      setFrequency("weekly");
      setQuestions([""]);
    }
  }, [item]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.put(`/api/check-ins/templates/${item?.id}`, data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["checkin-templates"] });
      setName(""); setQuestions([""]);
      onClose();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  if (!item) return null;

  return (
    <AppBottomSheet
      visible={!!item}
      onClose={() => { setName(""); setQuestions([""]); onClose(); }}
      snapPoints={["50%", "85%"]}
      title={t.common.edit}
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => {
            if (!name.trim()) return Alert.alert(t.common.required, t.checkIns.templateName);
            const validQ = questions.filter((q) => q.trim());
            if (validQ.length === 0) return Alert.alert(t.common.required, "At least one question required");
            mutation.mutate({ name: name.trim(), frequency, questions: validQ.map((q) => q.trim()) });
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{t.common.save}</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.checkIns.templateName} *</Text>
      <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={name} onChangeText={setName} placeholder={t.checkIns.templateNamePlaceholder} placeholderTextColor={colors.iconMuted} />

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.checkIns.frequency}</Text>
      <View className="flex-row flex-wrap mb-4">
        {FREQUENCIES.map((f) => (
          <TouchableOpacity key={f} className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${frequency === f ? "bg-brand-600" : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"}`} onPress={() => setFrequency(f)}>
            <Text className={`text-xs font-medium capitalize ${frequency === f ? "text-white" : "text-gray-600 dark:text-slate-300"}`}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">{t.checkIns.questions}</Text>
      {questions.map((q, i) => (
        <View key={`eq-${i}-${q.slice(0, 8)}`} className="flex-row items-center mb-2">
          <Text className="text-xs text-gray-400 dark:text-slate-500 mr-2 w-4">{i + 1}.</Text>
          <BottomSheetTextInput
            className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-slate-50"
            value={q}
            onChangeText={(v) => { const u = [...questions]; u[i] = v; setQuestions(u); }}
            placeholder={t.checkIns.questionPlaceholder}
            placeholderTextColor={colors.iconMuted}
          />
          {questions.length > 1 && (
            <TouchableOpacity className="p-2 ml-1" onPress={() => setQuestions(questions.filter((_, j) => j !== i))}>
              <Trash2 size={14} color={colors.destructive} />
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity className="flex-row items-center py-2" onPress={() => setQuestions([...questions, ""])}>
        <Plus size={16} color={colors.brand} /><Text className="text-sm text-brand-600 ml-1">{t.checkIns.addQuestion}</Text>
      </TouchableOpacity>
    </AppBottomSheet>
  );
}
