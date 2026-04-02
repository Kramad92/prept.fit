import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  Calendar,
  ChevronRight,
  CheckCircle,
  XCircle,
  Plus,
} from "lucide-react-native";
import {
  useCoachTrainingGroups,
  useCoachGroupSessions,
  useCoachGroupSessionDetail,
  useWorkoutPlans,
} from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { AppBottomSheet, BottomSheetTextInput } from "@/components/app-bottom-sheet";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { CoachTrainingGroup, CoachGroupSession } from "@/types/api";

type ViewMode = "groups" | "sessions" | "attendance";

export default function CoachGroupTrainingScreen() {
  const t = useT();
  const colors = useThemeColors();
  const [view, setView] = useState<ViewMode>("groups");
  const [selectedGroupId, setSelectedGroupId] = useState<string>();
  const [selectedSessionId, setSelectedSessionId] = useState<string>();

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity
          onPress={() => {
            if (view === "attendance") setView("sessions");
            else if (view === "sessions") {
              setSelectedGroupId(undefined);
              setView("groups");
            }
            else router.back();
          }}
          className="mr-3 p-2.5"
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50">
          {view === "attendance"
            ? t.groupTraining.attended
            : view === "sessions"
            ? t.groupTraining.sessions
            : t.groupTraining.title}
        </Text>
      </View>

      {view === "groups" && (
        <GroupsList
          onSelectGroup={(groupId) => {
            setSelectedGroupId(groupId);
            setView("sessions");
          }}
        />
      )}
      {view === "sessions" && (
        <SessionsList
          groupId={selectedGroupId}
          onSelectSession={(id) => {
            setSelectedSessionId(id);
            setView("attendance");
          }}
        />
      )}
      {view === "attendance" && selectedSessionId && (
        <AttendanceView sessionId={selectedSessionId} />
      )}
    </SafeAreaView>
  );
}

function GroupsList({ onSelectGroup }: { onSelectGroup: (groupId: string) => void }) {
  const t = useT();
  const colors = useThemeColors();
  const { data: groups, isLoading, error, refetch, isRefetching } =
    useCoachTrainingGroups();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (error) {
    return <QueryError message={t.errors.failedToLoad} onRetry={refetch} />;
  }

  return (
    <FlatList
      data={groups || []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.brand}
        />
      }
      renderItem={({ item }: { item: CoachTrainingGroup }) => (
        <TouchableOpacity
          className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-4 mb-3"
          onPress={() => onSelectGroup(item.id)}
          activeOpacity={0.6}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-medium text-gray-900 dark:text-slate-50 flex-1">
              {item.name}
            </Text>
            <ChevronRight size={16} color={colors.iconMuted} />
          </View>
          {item.description && (
            <Text className="text-sm text-gray-500 dark:text-slate-400 mt-1" numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View className="flex-row items-center mt-2">
            <Users size={12} color={colors.iconMuted} />
            <Text className="text-xs text-gray-500 dark:text-slate-400 ml-1">
              {item._count.members} {t.groupTraining.members}
            </Text>
            <View className="ml-3">
              <Calendar size={12} color={colors.iconMuted} />
            </View>
            <Text className="text-xs text-gray-500 dark:text-slate-400 ml-1">
              {item._count.sessions} {t.groupTraining.sessions.toLowerCase()}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View className="items-center justify-center py-16">
          <Users size={40} color={colors.iconMuted} />
          <Text className="text-gray-400 dark:text-slate-500 text-sm mt-3">{t.groupTraining.noGroups}</Text>
        </View>
      }
    />
  );
}

function SessionsList({
  groupId,
  onSelectSession,
}: {
  groupId?: string;
  onSelectSession: (id: string) => void;
}) {
  const t = useT();
  const colors = useThemeColors();
  const [showCreate, setShowCreate] = useState(false);
  const { data: sessions, isLoading, error, refetch, isRefetching } =
    useCoachGroupSessions(groupId);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (error) {
    return <QueryError message={t.errors.failedToLoad} onRetry={refetch} />;
  }

  // Sort upcoming first
  const sorted = useMemo(
    () =>
      [...(sessions || [])].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [sessions]
  );

  return (
    <>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand}
          />
        }
        ListHeaderComponent={
          <TouchableOpacity
            className="bg-brand-600 rounded-xl py-3 items-center mb-4 flex-row justify-center"
            onPress={() => setShowCreate(true)}
            activeOpacity={0.7}
          >
            <Plus size={18} color="#fff" />
            <Text className="text-white font-semibold text-sm ml-2">New Session</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }: { item: CoachGroupSession }) => (
          <TouchableOpacity
            className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-4 mb-3"
            onPress={() => onSelectSession(item.id)}
            activeOpacity={0.6}
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-base font-medium text-gray-900 dark:text-slate-50 flex-1">
                {item.title || item.group?.name || "Session"}
              </Text>
              <SessionBadge status={item.status} />
            </View>
            <Text className="text-sm text-gray-500 dark:text-slate-400">
              {new Date(item.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              · {item.startTime} – {item.endTime}
            </Text>
            <View className="flex-row items-center mt-2">
              <Users size={12} color={colors.iconMuted} />
              <Text className="text-xs text-gray-500 dark:text-slate-400 ml-1">
                {item._count.participants}/{item.maxParticipants} {t.groupTraining.participants}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Calendar size={40} color={colors.iconMuted} />
            <Text className="text-gray-400 dark:text-slate-500 text-sm mt-3">{t.groupTraining.noSessions}</Text>
          </View>
        }
      />
      <CreateSessionSheet
        visible={showCreate}
        groupId={groupId}
        onClose={() => setShowCreate(false)}
      />
    </>
  );
}

function AttendanceView({ sessionId }: { sessionId: string }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { data: session, isLoading, error, refetch } =
    useCoachGroupSessionDetail(sessionId);

  const attendanceMutation = useMutation({
    mutationFn: (
      participants: Array<{ clientId: string; status: string }>
    ) =>
      api.put(`/api/group-sessions/${sessionId}/attendance`, {
        participants,
      }),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({
        queryKey: ["coach-group-session-detail", sessionId],
      });
      queryClient.invalidateQueries({ queryKey: ["coach-group-sessions"] });
    },
    onError: () => {
      Alert.alert(t.common.error, t.errors.failedToSave);
    },
  });

  const toggleAttendance = useCallback(
    (clientId: string, currentStatus: string) => {
      if (!session) return;
      const newStatus =
        currentStatus === "attended" ? "enrolled" : "attended";
      const participants = session.participants.map((p) =>
        p.clientId === clientId
          ? { clientId: p.clientId, status: newStatus }
          : { clientId: p.clientId, status: p.status }
      );
      attendanceMutation.mutate(participants);
    },
    [session, attendanceMutation]
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (error || !session) {
    return <QueryError message={t.errors.failedToLoad} onRetry={refetch} />;
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {/* Session Info */}
      <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-4 mb-4">
        <Text className="text-base font-semibold text-gray-900 dark:text-slate-50">
          {session.title || session.group?.name || "Session"}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {new Date(session.date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}{" "}
          · {session.startTime} – {session.endTime}
        </Text>
        {session.location && (
          <Text className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {session.location}
          </Text>
        )}
      </View>

      {/* Participants */}
      <Text className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
        {t.groupTraining.participants} ({session.participants.length})
      </Text>
      <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 overflow-hidden">
        {session.participants.length === 0 ? (
          <View className="p-6 items-center">
            <Text className="text-gray-400 dark:text-slate-500 text-sm">No participants</Text>
          </View>
        ) : (
          session.participants.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              className={`flex-row items-center px-4 py-3 ${
                i < session.participants.length - 1
                  ? "border-b border-gray-50 dark:border-slate-700/40"
                  : ""
              }`}
              onPress={() => toggleAttendance(p.clientId, p.status)}
              activeOpacity={0.6}
            >
              <View
                className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                  p.status === "attended" ? "bg-green-100 dark:bg-green-900/25" : "bg-gray-100 dark:bg-slate-700"
                }`}
              >
                {p.status === "attended" ? (
                  <CheckCircle size={18} color="#10b981" />
                ) : (
                  <XCircle size={18} color={colors.iconMuted} />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">
                  {p.client.name}
                </Text>
                {p.client.email && (
                  <Text className="text-xs text-gray-500 dark:text-slate-400">
                    {p.client.email}
                  </Text>
                )}
              </View>
              <Text
                className={`text-xs font-medium capitalize ${
                  p.status === "attended"
                    ? "text-green-600"
                    : "text-gray-400 dark:text-slate-500"
                }`}
              >
                {p.status}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function CreateSessionSheet({
  visible,
  groupId,
  onClose,
}: {
  visible: boolean;
  groupId?: string;
  onClose: () => void;
}) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { data: workoutPlans } = useWorkoutPlans();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("20");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showPlanPicker, setShowPlanPicker] = useState(false);

  const reset = () => {
    setTitle("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setLocation("");
    setNotes("");
    setMaxParticipants("20");
    setIsOpen(false);
    setSelectedPlanId(null);
    setShowPlanPicker(false);
  };

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post("/api/group-sessions", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-group-sessions"] });
      reset();
      onClose();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const handleCreate = () => {
    if (!title.trim()) {
      Alert.alert(t.common.required, "Title is required");
      return;
    }
    if (!date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      Alert.alert(t.common.required, "Date is required (YYYY-MM-DD)");
      return;
    }
    if (!startTime.trim() || !endTime.trim()) {
      Alert.alert(t.common.required, "Start and end times are required (HH:MM)");
      return;
    }
    mutation.mutate({
      title: title.trim(),
      date: date.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      location: location.trim() || null,
      notes: notes.trim() || null,
      maxParticipants: parseInt(maxParticipants, 10) || 20,
      isOpen,
      groupId: groupId || null,
      workoutPlanId: selectedPlanId,
    });
  };

  const selectedPlan = workoutPlans?.find((p: any) => p.id === selectedPlanId);

  return (
    <AppBottomSheet
      visible={visible}
      onClose={() => { reset(); onClose(); }}
      snapPoints={["60%", "90%"]}
      title="New Session"
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
            <Text className="text-white font-semibold text-base">Create Session</Text>
          )}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Title *</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50"
        placeholder="Session title"
        placeholderTextColor={colors.iconMuted}
        value={title}
        onChangeText={setTitle}
      />

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Date *</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50"
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.iconMuted}
        value={date}
        onChangeText={setDate}
        keyboardType="numbers-and-punctuation"
      />

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Start *</Text>
          <BottomSheetTextInput
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-base text-gray-900 dark:text-slate-50"
            placeholder="HH:MM"
            placeholderTextColor={colors.iconMuted}
            value={startTime}
            onChangeText={setStartTime}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">End *</Text>
          <BottomSheetTextInput
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-base text-gray-900 dark:text-slate-50"
            placeholder="HH:MM"
            placeholderTextColor={colors.iconMuted}
            value={endTime}
            onChangeText={setEndTime}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Location</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50"
        placeholder="e.g. Main gym"
        placeholderTextColor={colors.iconMuted}
        value={location}
        onChangeText={setLocation}
      />

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Max Participants</Text>
          <BottomSheetTextInput
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-base text-gray-900 dark:text-slate-50"
            placeholder="20"
            placeholderTextColor={colors.iconMuted}
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            keyboardType="number-pad"
          />
        </View>
        <View className="flex-1 justify-end">
          <TouchableOpacity
            className={`flex-row items-center justify-center rounded-lg py-3 px-4 border ${
              isOpen
                ? "bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700"
                : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
            }`}
            onPress={() => setIsOpen(!isOpen)}
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-medium ${
                isOpen
                  ? "text-brand-700 dark:text-brand-300"
                  : "text-gray-500 dark:text-slate-400"
              }`}
            >
              {isOpen ? "Open to All" : "Members Only"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Workout Plan Selector */}
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Workout Plan</Text>
      <TouchableOpacity
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-1"
        onPress={() => setShowPlanPicker(!showPlanPicker)}
        activeOpacity={0.7}
      >
        <Text
          className={`text-base ${
            selectedPlan
              ? "text-gray-900 dark:text-slate-50"
              : "text-gray-400 dark:text-slate-500"
          }`}
        >
          {selectedPlan ? selectedPlan.name : "None (optional)"}
        </Text>
      </TouchableOpacity>
      {showPlanPicker && workoutPlans && workoutPlans.length > 0 && (
        <View className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg mb-4 max-h-36 overflow-hidden">
          <ScrollView nestedScrollEnabled>
            <TouchableOpacity
              className="px-4 py-2.5 border-b border-gray-100 dark:border-slate-700"
              onPress={() => { setSelectedPlanId(null); setShowPlanPicker(false); }}
            >
              <Text className="text-sm text-gray-500 dark:text-slate-400">None</Text>
            </TouchableOpacity>
            {workoutPlans.map((plan: any) => (
              <TouchableOpacity
                key={plan.id}
                className={`px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 ${
                  selectedPlanId === plan.id ? "bg-brand-50 dark:bg-brand-900/20" : ""
                }`}
                onPress={() => { setSelectedPlanId(plan.id); setShowPlanPicker(false); }}
              >
                <Text className="text-sm text-gray-900 dark:text-slate-50">{plan.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      {!showPlanPicker && <View className="mb-4" />}

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Notes</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50"
        placeholder="Optional notes"
        placeholderTextColor={colors.iconMuted}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        style={{ minHeight: 60, textAlignVertical: "top" }}
      />
    </AppBottomSheet>
  );
}

function SessionBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const bg =
    s === "completed"
      ? "bg-green-50 dark:bg-green-900/25"
      : s === "cancelled"
      ? "bg-red-50 dark:bg-red-900/25"
      : "bg-blue-50 dark:bg-blue-900/25";
  const text =
    s === "completed"
      ? "text-green-700 dark:text-green-300"
      : s === "cancelled"
      ? "text-red-700 dark:text-red-300"
      : "text-blue-700 dark:text-blue-300";

  return (
    <View className={`px-2 py-0.5 rounded-full ${bg}`}>
      <Text className={`text-[10px] font-medium capitalize ${text}`}>
        {status}
      </Text>
    </View>
  );
}
