import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ArrowLeft,
  ClipboardList,
  ChevronRight,
  Send,
  MessageSquare,
  Check,
} from "lucide-react-native";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { haptics } from "@/lib/haptics";
import { useCheckIns, useCheckInTemplates } from "@/hooks/use-client-data";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { CheckIn, CheckInTemplate } from "@/types/api";

type ViewMode = "list" | "select-template" | "fill";

export default function CheckInsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const clientId = user?.clientProfileId;
  const t = useT();
  const colors = useThemeColors();

  const { data: checkIns, isLoading: loadingCheckIns, isRefetching } = useCheckIns(clientId ?? undefined);
  const { data: templates, isLoading: loadingTemplates } = useCheckInTemplates();

  const [mode, setMode] = useState<ViewMode>("list");
  const [selectedTemplate, setSelectedTemplate] = useState<CheckInTemplate | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const activeTemplates = useMemo(
    () => templates?.filter((t) => t.isActive) || [],
    [templates]
  );

  const sortedCheckIns = useMemo(
    () =>
      [...(checkIns || [])].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      ),
    [checkIns]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["check-ins", clientId] });
    setRefreshing(false);
  }, [queryClient, clientId]);

  const submitMutation = useMutation({
    mutationFn: (data: { templateId: string; answers: string[] }) =>
      api.post<CheckIn>("/api/check-ins", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["check-ins", clientId] });
      setMode("list");
      setSelectedTemplate(null);
      setAnswers([]);
      Alert.alert(t.portalCheckIns.submitted, "Your check-in has been sent to your coach.");
    },
  });

  const startCheckIn = useCallback((template: CheckInTemplate) => {
    setSelectedTemplate(template);
    setAnswers(template.questions.map(() => ""));
    setMode("fill");
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedTemplate) return;
    const unanswered = answers.some((a) => !a.trim());
    if (unanswered) {
      Alert.alert("Incomplete", "Please answer all questions before submitting.");
      return;
    }
    submitMutation.mutate({
      templateId: selectedTemplate.id,
      answers,
    });
  }, [selectedTemplate, answers, submitMutation]);

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  // Fill form view
  if (mode === "fill" && selectedTemplate) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
          <TouchableOpacity
            onPress={() => {
              Alert.alert("Discard Check-in?", "Your answers will be lost.", [
                { text: t.common.cancel, style: "cancel" },
                {
                  text: "Discard",
                  style: "destructive",
                  onPress: () => {
                    setMode("list");
                    setSelectedTemplate(null);
                  },
                },
              ]);
            }}
            className="mr-3 p-2.5"
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50">
              {selectedTemplate.name}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
            {selectedTemplate.questions.map((q, i) => (
              <View key={q.id} className="mb-4">
                <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  {i + 1}. {q.question}
                </Text>
                <TextInput
                  className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-slate-50 border border-gray-200 dark:border-slate-700 min-h-[80px]"
                  placeholder="Type your answer..."
                  placeholderTextColor={colors.iconMuted}
                  value={answers[i]}
                  onChangeText={(val) => {
                    const updated = [...answers];
                    updated[i] = val;
                    setAnswers(updated);
                  }}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            ))}
            <View className="h-4" />
          </ScrollView>

          <View className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700/40">
            <TouchableOpacity
              className={`rounded-xl py-3.5 items-center ${
                submitMutation.isPending ? "bg-brand-400" : "bg-brand-600"
              }`}
              onPress={handleSubmit}
              disabled={submitMutation.isPending}
              activeOpacity={0.7}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="flex-row items-center">
                  <Send size={18} color="#fff" />
                  <Text className="text-white font-semibold text-base ml-2">
                    {t.portalCheckIns.submit}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Template selection view
  if (mode === "select-template") {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
          <TouchableOpacity onPress={() => setMode("list")} className="mr-3 p-2.5">
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50">
            Select Template
          </Text>
        </View>

        <ScrollView className="flex-1 px-4 pt-4">
          {loadingTemplates ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color={colors.brand} />
            </View>
          ) : activeTemplates.length === 0 ? (
            <View className="items-center py-16">
              <ClipboardList size={48} color={colors.iconMuted} />
              <Text className="text-gray-400 dark:text-slate-500 mt-3 text-base">
                {t.portalCheckIns.noCheckIns}
              </Text>
            </View>
          ) : (
            activeTemplates.map((template) => (
              <TouchableOpacity
                key={template.id}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-slate-700/40 flex-row items-center"
                onPress={() => startCheckIn(template)}
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-full bg-brand-50 items-center justify-center mr-3">
                  <ClipboardList size={20} color={colors.brand} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900 dark:text-slate-50">
                    {template.name}
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-slate-400">
                    {template.questions.length} {t.portalCheckIns.questions} · {template.frequency}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.iconMuted} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main list view
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
          {t.nav.checkIns}
        </Text>
        <TouchableOpacity
          className="bg-brand-600 rounded-lg px-3 py-1.5"
          onPress={() => setMode("select-template")}
          activeOpacity={0.7}
        >
          <Text className="text-white font-medium text-sm">New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
      >
        {loadingCheckIns ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : sortedCheckIns.length === 0 ? (
          <View className="items-center py-16">
            <ClipboardList size={48} color={colors.iconMuted} />
            <Text className="text-gray-400 dark:text-slate-500 mt-3 text-base">
              No check-ins submitted yet
            </Text>
            <TouchableOpacity
              className="mt-4 bg-brand-600 rounded-xl px-6 py-3"
              onPress={() => setMode("select-template")}
              activeOpacity={0.7}
            >
              <Text className="text-white font-semibold">Submit Your First</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sortedCheckIns.map((checkIn) => {
            const isExpanded = expandedId === checkIn.id;
            return (
              <TouchableOpacity
                key={checkIn.id}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-slate-700/40"
                onPress={() => setExpandedId(isExpanded ? null : checkIn.id)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-brand-50 items-center justify-center mr-3">
                    <Check size={20} color={colors.brand} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900 dark:text-slate-50">
                      {checkIn.template?.name || "Check-in"}
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-slate-400">
                      {formatDate(checkIn.submittedAt)}
                    </Text>
                  </View>
                  {checkIn.coachNotes && (
                    <View className="bg-brand-50 rounded-full px-2 py-0.5">
                      <Text className="text-xs text-brand-700 font-medium">
                        Feedback
                      </Text>
                    </View>
                  )}
                </View>

                {isExpanded && (
                  <View className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700/40">
                    {checkIn.answers.map((a, i) => (
                      <View key={a.questionId || i} className="mb-3">
                        <Text className="text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">
                          {checkIn.template?.questions?.[i]?.question ||
                            `Question ${i + 1}`}
                        </Text>
                        <Text className="text-sm text-gray-900 dark:text-slate-50">{a.answer}</Text>
                      </View>
                    ))}
                    {checkIn.coachNotes && (
                      <View className="mt-2 bg-brand-50 rounded-lg p-3">
                        <View className="flex-row items-center mb-1">
                          <MessageSquare size={14} color={colors.brand} />
                          <Text className="text-sm font-medium text-brand-700 ml-1">
                            Coach Feedback
                          </Text>
                        </View>
                        <Text className="text-sm text-gray-800 dark:text-slate-100">
                          {checkIn.coachNotes}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
