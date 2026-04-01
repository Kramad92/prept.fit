import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
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
import { AppBottomSheet } from "@/components/app-bottom-sheet";
import { AppHeader } from "@/components/app-header";
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
      Alert.alert("Error", "Failed to update session status");
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
              router.push(
                `/(coach)/clients/${session.clientId}` as never
              ),
          },
          { text: "Cancel", style: "cancel" as const },
        ]
      );
    },
    [statusMutation]
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
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <AppHeader
        title="Schedule"
        rightContent={
          <TouchableOpacity
            onPress={() => setShowCreateSession(true)}
            className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center ml-1"
            activeOpacity={0.7}
          >
            <Plus size={14} color="#fff" />
            <Text className="text-white text-xs font-semibold ml-1">New</Text>
          </TouchableOpacity>
        }
      />
      <View className="flex-row items-center justify-center px-4 pb-3">
        <TouchableOpacity
          onPress={() => setMonthOffset((o) => o - 1)}
          className="p-2"
        >
          <ChevronLeft size={20} color="#6b7280" />
        </TouchableOpacity>
        <Text className="text-base font-medium text-gray-900 mx-4 min-w-[160px] text-center">
          {monthLabel}
        </Text>
        <TouchableOpacity
          onPress={() => setMonthOffset((o) => o + 1)}
          className="p-2"
        >
          <ChevronRight size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : error ? (
        <QueryError message="Failed to load schedule" onRetry={refetch} />
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
              tintColor="#059669"
            />
          }
        >
          {groupedByDate.length === 0 ? (
            <View className="items-center justify-center py-16">
              <Calendar size={40} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-3">
                No sessions this month
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
                        : "text-gray-500"
                    }`}
                  >
                    {group.date === today ? "Today" : group.label}
                  </Text>
                  <View className="flex-1 h-px bg-gray-200 ml-3" />
                </View>
                <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {group.items.map((s, i) => (
                    <TouchableOpacity
                      key={s.id}
                      className={`flex-row items-center px-4 py-3 ${
                        i < group.items.length - 1
                          ? "border-b border-gray-50"
                          : ""
                      }`}
                      onPress={() => showStatusOptions(s)}
                      activeOpacity={0.6}
                    >
                      <View className="mr-3 items-center w-14">
                        <Text className="text-sm font-medium text-gray-900">
                          {s.startTime}
                        </Text>
                        <Text className="text-[10px] text-gray-400">
                          {s.endTime}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-gray-900">
                          {s.clientName}
                        </Text>
                        <Text className="text-xs text-gray-500">
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
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to create session"),
  });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="New Session"
      snapPoints={["50%", "85%"]}
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => {
            if (!clientId) return Alert.alert("Required", "Select a client");
            if (!date.trim()) return Alert.alert("Required", "Date is required");
            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
            const timePattern = /^\d{2}:\d{2}$/;
            if (!datePattern.test(date.trim())) {
              return Alert.alert("Invalid Date", "Date must be in YYYY-MM-DD format.");
            }
            if (!timePattern.test(startTime.trim()) || !timePattern.test(endTime.trim())) {
              return Alert.alert("Invalid Time", "Times must be in HH:MM format (e.g. 09:00).");
            }
            if (startTime.trim() >= endTime.trim()) {
              return Alert.alert("Invalid Time Range", "Start time must be before end time.");
            }
            mutation.mutate({
              clientId,
              title: title.trim() || "Training Session",
              date: date.trim(),
              startTime: startTime.trim(),
              endTime: endTime.trim(),
              notes: notes.trim() || null,
            });
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Create Session</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 mb-1">Client *</Text>
      <TouchableOpacity
        className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-2"
        onPress={() => setShowClientPicker(!showClientPicker)}
      >
        <Text className={selectedClient ? "text-gray-900" : "text-gray-400"}>
          {selectedClient?.name || "Select client..."}
        </Text>
      </TouchableOpacity>
      {showClientPicker && (
        <View className="bg-white border border-gray-200 rounded-lg mb-4" style={{ maxHeight: 200 }}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {(clients || []).map((c) => (
              <TouchableOpacity
                key={c.id}
                className={`px-4 py-3 border-b border-gray-50 ${c.id === clientId ? "bg-brand-50" : ""}`}
                onPress={() => { setClientId(c.id); setShowClientPicker(false); }}
              >
                <Text className="text-sm text-gray-900">{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      {!showClientPicker && <View className="mb-2" />}

      <Text className="text-sm font-medium text-gray-700 mb-1">Title</Text>
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={title} onChangeText={setTitle} placeholder="Session title" placeholderTextColor="#9ca3af" />

      <Text className="text-sm font-medium text-gray-700 mb-1">Date (YYYY-MM-DD)</Text>
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={date} onChangeText={setDate} placeholder="2024-01-15" placeholderTextColor="#9ca3af" />

      <View className="flex-row mb-4">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-medium text-gray-700 mb-1">Start Time</Text>
          <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900" value={startTime} onChangeText={setStartTime} placeholder="09:00" placeholderTextColor="#9ca3af" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-700 mb-1">End Time</Text>
          <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900" value={endTime} onChangeText={setEndTime} placeholder="10:00" placeholderTextColor="#9ca3af" />
        </View>
      </View>

      <Text className="text-sm font-medium text-gray-700 mb-1">Notes (optional)</Text>
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900" value={notes} onChangeText={setNotes} placeholder="Session notes..." placeholderTextColor="#9ca3af" multiline />
    </AppBottomSheet>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const bg =
    s === "completed"
      ? "bg-green-50"
      : s === "cancelled" || s === "no-show"
      ? "bg-red-50"
      : "bg-blue-50";
  const text =
    s === "completed"
      ? "text-green-700"
      : s === "cancelled" || s === "no-show"
      ? "text-red-700"
      : "text-blue-700";
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
