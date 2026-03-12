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
} from "lucide-react-native";
import {
  useCoachTrainingGroups,
  useCoachGroupSessions,
  useCoachGroupSessionDetail,
} from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import type { CoachTrainingGroup, CoachGroupSession } from "@/types/api";

type ViewMode = "groups" | "sessions" | "attendance";

export default function CoachGroupTrainingScreen() {
  const [view, setView] = useState<ViewMode>("groups");
  const [selectedSessionId, setSelectedSessionId] = useState<string>();

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={() => {
            if (view === "attendance") setView("sessions");
            else if (view === "sessions") setView("groups");
            else router.back();
          }}
          className="mr-3 p-1"
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">
          {view === "attendance"
            ? "Attendance"
            : view === "sessions"
            ? "Sessions"
            : "Group Training"}
        </Text>
      </View>

      {view === "groups" && (
        <GroupsList
          onSelectGroup={() => setView("sessions")}
        />
      )}
      {view === "sessions" && (
        <SessionsList
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

function GroupsList({ onSelectGroup }: { onSelectGroup: () => void }) {
  const { data: groups, isLoading, error, refetch, isRefetching } =
    useCoachTrainingGroups();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (error) {
    return <QueryError message="Failed to load groups" onRetry={refetch} />;
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
          tintColor="#059669"
        />
      }
      renderItem={({ item }: { item: CoachTrainingGroup }) => (
        <TouchableOpacity
          className="bg-white rounded-xl border border-gray-100 p-4 mb-3"
          onPress={onSelectGroup}
          activeOpacity={0.6}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-medium text-gray-900 flex-1">
              {item.name}
            </Text>
            <ChevronRight size={16} color="#d1d5db" />
          </View>
          {item.description && (
            <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View className="flex-row items-center mt-2">
            <Users size={12} color="#9ca3af" />
            <Text className="text-xs text-gray-500 ml-1">
              {item._count.members} members
            </Text>
            <View className="ml-3">
              <Calendar size={12} color="#9ca3af" />
            </View>
            <Text className="text-xs text-gray-500 ml-1">
              {item._count.sessions} sessions
            </Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View className="items-center justify-center py-16">
          <Users size={40} color="#d1d5db" />
          <Text className="text-gray-400 text-sm mt-3">No training groups</Text>
        </View>
      }
    />
  );
}

function SessionsList({
  onSelectSession,
}: {
  onSelectSession: (id: string) => void;
}) {
  const { data: sessions, isLoading, error, refetch, isRefetching } =
    useCoachGroupSessions();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (error) {
    return <QueryError message="Failed to load sessions" onRetry={refetch} />;
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
    <FlatList
      data={sorted}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor="#059669"
        />
      }
      renderItem={({ item }: { item: CoachGroupSession }) => (
        <TouchableOpacity
          className="bg-white rounded-xl border border-gray-100 p-4 mb-3"
          onPress={() => onSelectSession(item.id)}
          activeOpacity={0.6}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-base font-medium text-gray-900 flex-1">
              {item.title || item.group?.name || "Session"}
            </Text>
            <SessionBadge status={item.status} />
          </View>
          <Text className="text-sm text-gray-500">
            {new Date(item.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}{" "}
            · {item.startTime} – {item.endTime}
          </Text>
          <View className="flex-row items-center mt-2">
            <Users size={12} color="#9ca3af" />
            <Text className="text-xs text-gray-500 ml-1">
              {item._count.participants}/{item.maxParticipants} participants
            </Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View className="items-center justify-center py-16">
          <Calendar size={40} color="#d1d5db" />
          <Text className="text-gray-400 text-sm mt-3">No sessions</Text>
        </View>
      }
    />
  );
}

function AttendanceView({ sessionId }: { sessionId: string }) {
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
      Alert.alert("Error", "Failed to update attendance");
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
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (error || !session) {
    return <QueryError message="Failed to load session" onRetry={refetch} />;
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {/* Session Info */}
      <View className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <Text className="text-base font-semibold text-gray-900">
          {session.title || session.group?.name || "Session"}
        </Text>
        <Text className="text-sm text-gray-500 mt-1">
          {new Date(session.date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}{" "}
          · {session.startTime} – {session.endTime}
        </Text>
        {session.location && (
          <Text className="text-sm text-gray-500 mt-0.5">
            {session.location}
          </Text>
        )}
      </View>

      {/* Participants */}
      <Text className="text-sm font-semibold text-gray-700 mb-2">
        Participants ({session.participants.length})
      </Text>
      <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {session.participants.length === 0 ? (
          <View className="p-6 items-center">
            <Text className="text-gray-400 text-sm">No participants</Text>
          </View>
        ) : (
          session.participants.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              className={`flex-row items-center px-4 py-3 ${
                i < session.participants.length - 1
                  ? "border-b border-gray-50"
                  : ""
              }`}
              onPress={() => toggleAttendance(p.clientId, p.status)}
              activeOpacity={0.6}
            >
              <View
                className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                  p.status === "attended" ? "bg-green-100" : "bg-gray-100"
                }`}
              >
                {p.status === "attended" ? (
                  <CheckCircle size={18} color="#10b981" />
                ) : (
                  <XCircle size={18} color="#d1d5db" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">
                  {p.client.name}
                </Text>
                {p.client.email && (
                  <Text className="text-xs text-gray-500">
                    {p.client.email}
                  </Text>
                )}
              </View>
              <Text
                className={`text-xs font-medium capitalize ${
                  p.status === "attended"
                    ? "text-green-600"
                    : "text-gray-400"
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

function SessionBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const bg =
    s === "completed"
      ? "bg-green-50"
      : s === "cancelled"
      ? "bg-red-50"
      : "bg-blue-50";
  const text =
    s === "completed"
      ? "text-green-700"
      : s === "cancelled"
      ? "text-red-700"
      : "text-blue-700";

  return (
    <View className={`px-2 py-0.5 rounded-full ${bg}`}>
      <Text className={`text-[10px] font-medium capitalize ${text}`}>
        {status}
      </Text>
    </View>
  );
}
