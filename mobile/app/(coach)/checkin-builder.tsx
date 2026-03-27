import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
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
  Edit3,
  X,
  Copy,
  ClipboardList,
  GripVertical,
} from "lucide-react-native";
import { useCheckInTemplates } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import type { CheckInTemplate } from "@/types/api";

const FREQUENCIES = ["weekly", "biweekly", "monthly", "daily"];

export default function CheckInBuilderScreen() {
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
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/check-ins/templates/${id}`),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["checkin-templates"] });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const renderTemplate = useCallback(({ item }: { item: CheckInTemplate }) => (
    <View className="bg-white mx-4 mb-2 rounded-xl border border-gray-100 px-4 py-3">
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-900">{item.name}</Text>
          <View className="flex-row items-center mt-1">
            <View className="bg-blue-50 rounded-full px-2 py-0.5 mr-2">
              <Text className="text-[10px] text-blue-700 capitalize">{item.frequency}</Text>
            </View>
            <Text className="text-xs text-gray-500">{item.questions.length} questions</Text>
          </View>
        </View>
        <TouchableOpacity className="p-2" onPress={() => setEditItem(item)}>
          <Edit3 size={16} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity className="p-2" onPress={() => duplicateMutation.mutate(item.id)}>
          <Copy size={16} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity className="p-2" onPress={() => Alert.alert("Delete", `Delete "${item.name}"?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
        ])}>
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
      {/* Preview questions */}
      <View className="mt-2 border-t border-gray-50 pt-2">
        {item.questions.slice(0, 3).map((q, i) => (
          <Text key={q.id} className="text-xs text-gray-500" numberOfLines={1}>
            {i + 1}. {q.question}
          </Text>
        ))}
        {item.questions.length > 3 && (
          <Text className="text-xs text-gray-400">+{item.questions.length - 3} more</Text>
        )}
      </View>
    </View>
  ), []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 flex-1">Check-in Templates</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center" activeOpacity={0.7}>
          <Plus size={14} color="#fff" /><Text className="text-white text-xs font-semibold ml-1">New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#059669" /></View>
      ) : error ? (
        <QueryError message="Failed to load templates" onRetry={refetch} />
      ) : (
        <FlatList
          data={templates || []}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplate}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <ClipboardList size={40} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-3">No templates yet</Text>
              <TouchableOpacity className="mt-3 bg-brand-600 rounded-lg px-4 py-2" onPress={() => setShowForm(true)}>
                <Text className="text-white text-sm font-semibold">Create First Template</Text>
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
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-gray-50">
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
            <TouchableOpacity onPress={onClose} className="mr-3 p-1"><X size={22} color="#111827" /></TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900 flex-1">New Template</Text>
          </View>
          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
            <Text className="text-sm font-medium text-gray-700 mb-1">Template Name *</Text>
            <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={name} onChangeText={setName} placeholder="e.g. Weekly Check-in" placeholderTextColor="#9ca3af" />

            <Text className="text-sm font-medium text-gray-700 mb-1">Frequency</Text>
            <View className="flex-row flex-wrap mb-4">
              {FREQUENCIES.map((f) => (
                <TouchableOpacity key={f} className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${frequency === f ? "bg-brand-600" : "bg-white border border-gray-200"}`} onPress={() => setFrequency(f)}>
                  <Text className={`text-xs font-medium capitalize ${frequency === f ? "text-white" : "text-gray-600"}`}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Questions</Text>
            {questions.map((q, i) => (
              <View key={i} className="flex-row items-center mb-2">
                <Text className="text-xs text-gray-400 mr-2 w-4">{i + 1}.</Text>
                <TextInput
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900"
                  value={q}
                  onChangeText={(v) => {
                    const updated = [...questions];
                    updated[i] = v;
                    setQuestions(updated);
                  }}
                  placeholder="Enter question..."
                  placeholderTextColor="#9ca3af"
                />
                {questions.length > 1 && (
                  <TouchableOpacity className="p-2 ml-1" onPress={() => setQuestions(questions.filter((_, j) => j !== i))}>
                    <Trash2 size={14} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity className="flex-row items-center py-2" onPress={() => setQuestions([...questions, ""])}>
              <Plus size={16} color="#059669" />
              <Text className="text-sm text-brand-600 ml-1">Add Question</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`rounded-lg py-3.5 items-center mt-4 ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
              onPress={() => {
                if (!name.trim()) return Alert.alert("Required", "Template name is required");
                const validQ = questions.filter((q) => q.trim());
                if (validQ.length === 0) return Alert.alert("Required", "At least one question is required");
                mutation.mutate({ name: name.trim(), frequency, questions: validQ.map((q) => q.trim()) });
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Create Template</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function TemplateEditModal({ item, onClose }: { item: CheckInTemplate | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [questions, setQuestions] = useState<string[]>([""]);
  const [init, setInit] = useState(false);

  if (item && !init) {
    setName(item.name);
    setFrequency(item.frequency);
    setQuestions(item.questions.map((q) => q.question));
    setInit(true);
  }

  const mutation = useMutation({
    mutationFn: (data: any) => api.put(`/api/check-ins/templates/${item?.id}`, data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["checkin-templates"] });
      setInit(false); setName(""); setQuestions([""]);
      onClose();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  if (!item) return null;

  return (
    <Modal visible={!!item} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-gray-50">
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
            <TouchableOpacity onPress={() => { setInit(false); setName(""); setQuestions([""]); onClose(); }} className="mr-3 p-1"><X size={22} color="#111827" /></TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900 flex-1">Edit Template</Text>
          </View>
          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
            <Text className="text-sm font-medium text-gray-700 mb-1">Template Name *</Text>
            <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={name} onChangeText={setName} placeholder="Template name" placeholderTextColor="#9ca3af" />

            <Text className="text-sm font-medium text-gray-700 mb-1">Frequency</Text>
            <View className="flex-row flex-wrap mb-4">
              {FREQUENCIES.map((f) => (
                <TouchableOpacity key={f} className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${frequency === f ? "bg-brand-600" : "bg-white border border-gray-200"}`} onPress={() => setFrequency(f)}>
                  <Text className={`text-xs font-medium capitalize ${frequency === f ? "text-white" : "text-gray-600"}`}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Questions</Text>
            {questions.map((q, i) => (
              <View key={i} className="flex-row items-center mb-2">
                <Text className="text-xs text-gray-400 mr-2 w-4">{i + 1}.</Text>
                <TextInput
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900"
                  value={q}
                  onChangeText={(v) => { const u = [...questions]; u[i] = v; setQuestions(u); }}
                  placeholder="Question..."
                  placeholderTextColor="#9ca3af"
                />
                {questions.length > 1 && (
                  <TouchableOpacity className="p-2 ml-1" onPress={() => setQuestions(questions.filter((_, j) => j !== i))}>
                    <Trash2 size={14} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity className="flex-row items-center py-2" onPress={() => setQuestions([...questions, ""])}>
              <Plus size={16} color="#059669" /><Text className="text-sm text-brand-600 ml-1">Add Question</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`rounded-lg py-3.5 items-center mt-4 ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
              onPress={() => {
                if (!name.trim()) return Alert.alert("Required", "Name is required");
                const validQ = questions.filter((q) => q.trim());
                if (validQ.length === 0) return Alert.alert("Required", "At least one question required");
                mutation.mutate({ name: name.trim(), frequency, questions: validQ.map((q) => q.trim()) });
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Save Changes</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
