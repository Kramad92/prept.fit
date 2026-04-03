import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
} from "lucide-react-native";
import { useCoachSchedule, useCoachClients } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { AppBottomSheet, BottomSheetTextInput } from "@/components/app-bottom-sheet";
import { AppHeader } from "@/components/app-header";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { CoachScheduleItem } from "@/types/api";

const STATUS_OPTIONS = [
  { value: "completed", label: "Mark Complete" },
  { value: "no-show", label: "Mark No-Show" },
  { value: "cancelled", label: "Cancel Session" },
  { value: "scheduled", label: "Reset to Scheduled" },
];

export default function CoachScheduleScreen() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const queryClient = useQueryClient();
  const t = useT();
  const colors = useThemeColors();

  const currentMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthStr = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, [currentMonth]);

  const monthLabel = useMemo(
    () =>
      currentMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [currentMonth]
  );

  const { data: sessions, isLoading, error, refetch, isRefetching } =
    useCoachSchedule(monthStr);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/api/schedules/${id}`, { status }),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["coach-dashboard"] });
    },
    onError: () => {
      Alert.alert(t.common.error, t.errors.failedToSave);
    },
  });

  const showStatusOptions = useCallback(
    (session: CoachScheduleItem) => {
      const currentStatus = session.status.toLowerCase();
      const options = STATUS_OPTIONS.filter(
        (o) => o.value !== currentStatus
      );

      Alert.alert(
        session.clientName,
        `${session.startTime} – ${session.endTime}`,
        [
          ...options.map((o) => ({
            text: o.label,
            onPress: () =>
              statusMutation.mutate({ id: session.id, status: o.value }),
          })),
          {
            text: "View Client",
            onPress: () =>
              router.push({ pathname: "/(coach)/clients/[id]", params: { id: session.clientId } } as any),
          },
          { text: t.common.cancel, style: "cancel" as const },
        ]
      );
    },
    [statusMutation, t]
  );

  // Group sessions by date
  const groupedByDate = useMemo(() => {
    if (!sessions) return [];
    const map = new Map<string, CoachScheduleItem[]>();
    for (const s of sessions) {
      const dateKey = s.date.split("T")[0];
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(s);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        label: formatDateLabel(date),
        items: items.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }));
  }, [sessions]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <AppHeader
        title={t.schedule.title}
        rightContent={
          <TouchableOpacity
            onPress={() => setShowCreateSession(true)}
            className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center ml-1"
            activeOpacity={0.7}
          >
            <Plus size={14} color="#fff" />
            <Text className="text-white text-xs font-semibold ml-1">{t.schedule.newSession}</Text>
          </TouchableOpacity>
        }
      />
      <View className="flex-row items-center justify-center px-4 pb-3">
        <TouchableOpacity
          onPress={() => setMonthOffset((o) => o - 1)}
          className="p-2"
        >
          <ChevronLeft size={20} color={colors.icon} />
        </TouchableOpacity>
        <Text className="text-base font-medium text-gray-900 dark:text-slate-50 mx-4 min-w-[160px] text-center">
          {monthLabel}
        </Text>
        <TouchableOpacity
          onPress={() => setMonthOffset((o) => o + 1)}
          className="p-2"
        >
          <ChevronRight size={20} color={colors.icon} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : error ? (
        <QueryError message={t.errors.failedToLoad} onRetry={refetch} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 16,
            paddingTop: 0,
            paddingBottom: 32,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.brand}
            />
          }
        >
          {groupedByDate.length === 0 ? (
            <View className="items-center justify-center py-16">
              <Calendar size={40} color={colors.iconMuted} />
              <Text className="text-gray-400 dark:text-slate-500 text-sm mt-3">
                {t.schedule.noSessionsOnDay}
              </Text>
            </View>
          ) : (
            groupedByDate.map((group) => (
              <View key={group.date} className="mb-4">
                <View className="flex-row items-center mb-2">
                  <Text
                    className={`text-sm font-semibold ${
                      group.date === today
                        ? "text-brand-600"
                        : "text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    {group.date === today ? t.common.today : group.label}
                  </Text>
                  <View className="flex-1 h-px bg-gray-200 dark:bg-slate-700 ml-3" />
                </View>
                <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 overflow-hidden">
                  {group.items.map((s, i) => (
                    <TouchableOpacity
                      key={s.id}
                      className={`flex-row items-center px-4 py-3 ${
                        i < group.items.length - 1
                          ? "border-b border-gray-50 dark:border-slate-700/40"
                          : ""
                      }`}
                      onPress={() => showStatusOptions(s)}
                      activeOpacity={0.6}
                    >
                      <View className="mr-3 items-center w-14">
                        <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">
                          {s.startTime}
                        </Text>
                        <Text className="text-[10px] text-gray-400 dark:text-slate-500">
                          {s.endTime}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">
                          {s.clientName}
                        </Text>
                        <Text className="text-xs text-gray-500 dark:text-slate-400">
                          {s.title || s.type}
                        </Text>
                      </View>
                      <SessionStatusBadge status={s.status} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <CreateSessionModal
        visible={showCreateSession}
        onClose={() => setShowCreateSession(false)}
        onSuccess={() => {
          setShowCreateSession(false);
          refetch();
        }}
      />
    </SafeAreaView>
  );
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTimeDisplay(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function timeStringToDate(timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dateToDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CreateSessionModal({ visible, onClose, onSuccess }: { visible: boolean; onClose: () => void; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { data: clients } = useCoachClients();
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("Training Session");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const t = useT();
  const colors = useThemeColors();

  const selectedClient = clients?.find((c) => c.id === clientId);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/api/schedules", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["coach-dashboard"] });
      setClientId(""); setTitle("Training Session"); setNotes("");
      onSuccess();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message || t.errors.failedToSave),
  });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={t.schedule.newSession}
      snapPoints={["50%", "85%"]}
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => {
            if (!clientId) return Alert.alert(t.common.required, t.schedule.selectClient);
            if (startTime >= endTime) {
              return Alert.alert(t.common.error, "Start time must be before end time.");
            }
            mutation.mutate({
              clientId,
              title: title.trim() || "Training Session",
              date,
              startTime,
              endTime,
              notes: notes.trim() || null,
            });
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{t.schedule.createSession}</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.schedule.client} *</Text>
      <TouchableOpacity
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-2"
        onPress={() => setShowClientPicker(!showClientPicker)}
      >
        <Text className={selectedClient ? "text-gray-900 dark:text-slate-50" : "text-gray-400 dark:text-slate-500"}>
          {selectedClient?.name || t.schedule.selectClient}
        </Text>
      </TouchableOpacity>
      {showClientPicker && (
        <View className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg mb-4" style={{ maxHeight: 200 }}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {(clients || []).map((c) => (
              <TouchableOpacity
                key={c.id}
                className={`px-4 py-3 border-b border-gray-50 dark:border-slate-700/40 ${c.id === clientId ? "bg-brand-50 dark:bg-brand-900/20" : ""}`}
                onPress={() => { setClientId(c.id); setShowClientPicker(false); }}
              >
                <Text className="text-sm text-gray-900 dark:text-slate-50">{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      {!showClientPicker && <View className="mb-2" />}

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.schedule.sessionTitle}</Text>
      <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={title} onChangeText={setTitle} placeholder={t.schedule.titlePlaceholder} placeholderTextColor={colors.iconMuted} />

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.date}</Text>
      <TouchableOpacity
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4"
        onPress={() => setShowDatePicker(true)}
      >
        <Text className="text-base text-gray-900 dark:text-slate-50">{formatDateDisplay(date)}</Text>
      </TouchableOpacity>
      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={new Date(date + "T12:00:00")}
        onConfirm={(d) => { setDate(dateToDateString(d)); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
      />

      <View className="flex-row mb-4">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.schedule.startTime}</Text>
          <TouchableOpacity
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3"
            onPress={() => setShowStartPicker(true)}
          >
            <Text className="text-base text-gray-900 dark:text-slate-50">{formatTimeDisplay(startTime)}</Text>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={showStartPicker}
            mode="time"
            date={timeStringToDate(startTime)}
            onConfirm={(d) => { setStartTime(dateToTimeString(d)); setShowStartPicker(false); }}
            onCancel={() => setShowStartPicker(false)}
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.schedule.endTime}</Text>
          <TouchableOpacity
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3"
            onPress={() => setShowEndPicker(true)}
          >
            <Text className="text-base text-gray-900 dark:text-slate-50">{formatTimeDisplay(endTime)}</Text>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={showEndPicker}
            mode="time"
            date={timeStringToDate(endTime)}
            onConfirm={(d) => { setEndTime(dateToTimeString(d)); setShowEndPicker(false); }}
            onCancel={() => setShowEndPicker(false)}
          />
        </View>
      </View>

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.notes} ({t.common.optional.toLowerCase()})</Text>
      <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-base text-gray-900 dark:text-slate-50" value={notes} onChangeText={setNotes} placeholder={t.common.notesPlaceholder} placeholderTextColor={colors.iconMuted} multiline />
    </AppBottomSheet>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const bg =
    s === "completed"
      ? "bg-green-50 dark:bg-green-900/25"
      : s === "cancelled" || s === "no-show"
      ? "bg-red-50 dark:bg-red-900/25"
      : "bg-blue-50 dark:bg-blue-900/25";
  const text =
    s === "completed"
      ? "text-green-700 dark:text-green-300"
      : s === "cancelled" || s === "no-show"
      ? "text-red-700 dark:text-red-400"
      : "text-blue-700 dark:text-blue-300";
  const label =
    s === "no-show"
      ? "No Show"
      : s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <View className={`px-2 py-0.5 rounded-full ${bg}`}>
      <Text className={`text-[10px] font-medium ${text}`}>{label}</Text>
    </View>
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
