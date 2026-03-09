import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ArrowLeft,
  Users,
  Calendar,
  Clock,
  UserPlus,
  UserMinus,
  Dumbbell,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import {
  useTrainingGroups,
  useGroupSessions,
} from "@/hooks/use-client-data";
import type { GroupSession } from "@/types/api";

type Tab = "sessions" | "groups";

export default function GroupTrainingScreen() {
  const queryClient = useQueryClient();
  const { data: groupSessions, isLoading: loadingSessions } =
    useGroupSessions();
  const { data: groups, isLoading: loadingGroups } = useTrainingGroups();
  const [tab, setTab] = useState<Tab>("sessions");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["group-sessions"] }),
      queryClient.invalidateQueries({ queryKey: ["training-groups"] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const enrollMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.post(`/api/portal/group-sessions/${sessionId}/enroll`),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["group-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["client-profile"] });
      Alert.alert("Enrolled!", "You've been enrolled in this session.");
    },
    onError: (err) => {
      haptics.error();
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Could not enroll."
      );
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.delete(`/api/portal/group-sessions/${sessionId}/enroll`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-sessions"] });
      Alert.alert("Unenrolled", "You've been removed from this session.");
    },
    onError: (err) => {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Could not unenroll."
      );
    },
  });

  const handleEnroll = useCallback(
    (session: GroupSession) => {
      const spotsLeft =
        session.maxParticipants - session._count.participants;
      Alert.alert(
        "Join Session",
        `${session.group?.name || "Group Session"} on ${formatDate(
          session.date
        )} at ${session.startTime}.\n\n${spotsLeft} spot${
          spotsLeft !== 1 ? "s" : ""
        } left.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Enroll",
            onPress: () => enrollMutation.mutate(session.id),
          },
        ]
      );
    },
    [enrollMutation]
  );

  const handleUnenroll = useCallback(
    (session: GroupSession) => {
      Alert.alert("Leave Session", "Are you sure you want to unenroll?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unenroll",
          style: "destructive",
          onPress: () => unenrollMutation.mutate(session.id),
        },
      ]);
    },
    [unenrollMutation]
  );

  const isLoading = tab === "sessions" ? loadingSessions : loadingGroups;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">
          Group Training
        </Text>
      </View>

      {/* Tab switcher */}
      <View className="flex-row px-4 pt-3 pb-1 bg-white">
        <TouchableOpacity
          className={`flex-1 py-2 items-center border-b-2 ${
            tab === "sessions" ? "border-brand-600" : "border-transparent"
          }`}
          onPress={() => setTab("sessions")}
        >
          <Text
            className={`font-medium ${
              tab === "sessions" ? "text-brand-600" : "text-gray-500"
            }`}
          >
            Sessions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 items-center border-b-2 ${
            tab === "groups" ? "border-brand-600" : "border-transparent"
          }`}
          onPress={() => setTab("groups")}
        >
          <Text
            className={`font-medium ${
              tab === "groups" ? "text-brand-600" : "text-gray-500"
            }`}
          >
            My Groups
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#059669"
          />
        }
      >
        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : tab === "sessions" ? (
          <SessionsView
            enrolled={groupSessions?.enrolled || []}
            open={groupSessions?.open || []}
            onEnroll={handleEnroll}
            onUnenroll={handleUnenroll}
            enrolling={enrollMutation.isPending}
          />
        ) : (
          <GroupsView
            groups={groups || []}
            expandedId={expandedGroupId}
            onToggleExpand={(id) =>
              setExpandedGroupId(expandedGroupId === id ? null : id)
            }
          />
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

function SessionsView({
  enrolled,
  open,
  onEnroll,
  onUnenroll,
  enrolling,
}: {
  enrolled: GroupSession[];
  open: GroupSession[];
  onEnroll: (s: GroupSession) => void;
  onUnenroll: (s: GroupSession) => void;
  enrolling: boolean;
}) {
  if (enrolled.length === 0 && open.length === 0) {
    return (
      <View className="items-center py-16">
        <Users size={48} color="#d1d5db" />
        <Text className="text-gray-400 mt-3 text-base">
          No group sessions available
        </Text>
      </View>
    );
  }

  return (
    <>
      {enrolled.length > 0 && (
        <>
          <Text className="text-sm font-medium text-gray-500 mb-2">
            Your Sessions
          </Text>
          {enrolled.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              enrolled
              onPress={() => onUnenroll(session)}
              disabled={enrolling}
            />
          ))}
        </>
      )}

      {open.length > 0 && (
        <>
          <Text className="text-sm font-medium text-gray-500 mb-2 mt-4">
            Open Sessions
          </Text>
          {open.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              enrolled={false}
              onPress={() => onEnroll(session)}
              disabled={enrolling}
            />
          ))}
        </>
      )}
    </>
  );
}

function SessionCard({
  session,
  enrolled,
  onPress,
  disabled,
}: {
  session: GroupSession;
  enrolled: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  const spotsLeft = session.maxParticipants - session._count.participants;

  return (
    <View
      className={`bg-white rounded-xl p-4 mb-3 border ${
        enrolled ? "border-brand-200" : "border-gray-100"
      }`}
    >
      <View className="flex-row items-start">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            enrolled ? "bg-brand-50" : "bg-gray-50"
          }`}
        >
          <Users size={20} color={enrolled ? "#059669" : "#6b7280"} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">
            {session.group?.name || "Group Session"}
          </Text>
          <View className="flex-row items-center mt-1">
            <Calendar size={13} color="#6b7280" />
            <Text className="text-sm text-gray-500 ml-1">
              {formatDate(session.date)}
            </Text>
            <Clock size={13} color="#6b7280" className="ml-2" />
            <Text className="text-sm text-gray-500 ml-1">
              {session.startTime} - {session.endTime}
            </Text>
          </View>
          <View className="flex-row items-center mt-1.5" style={{ gap: 8 }}>
            <View className="flex-row items-center">
              <Users size={12} color="#9ca3af" />
              <Text className="text-xs text-gray-400 ml-1">
                {session._count.participants}/{session.maxParticipants}
              </Text>
            </View>
            {session.workoutPlan && (
              <View className="flex-row items-center">
                <Dumbbell size={12} color="#9ca3af" />
                <Text className="text-xs text-gray-400 ml-1">
                  {session.workoutPlan.name}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <TouchableOpacity
        className={`mt-3 rounded-lg py-2 items-center flex-row justify-center ${
          enrolled ? "bg-gray-100" : spotsLeft > 0 ? "bg-brand-600" : "bg-gray-300"
        }`}
        onPress={onPress}
        disabled={disabled || (!enrolled && spotsLeft <= 0)}
        activeOpacity={0.7}
      >
        {enrolled ? (
          <>
            <UserMinus size={16} color="#6b7280" />
            <Text className="text-sm font-medium text-gray-600 ml-1.5">
              Unenroll
            </Text>
          </>
        ) : spotsLeft > 0 ? (
          <>
            <UserPlus size={16} color="#fff" />
            <Text className="text-sm font-medium text-white ml-1.5">
              Enroll ({spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left)
            </Text>
          </>
        ) : (
          <Text className="text-sm font-medium text-gray-500">Full</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function GroupsView({
  groups,
  expandedId,
  onToggleExpand,
}: {
  groups: Array<{
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
    joinedAt: string;
    nextSession?: { date: string; startTime: string } | null;
  }>;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}) {
  if (groups.length === 0) {
    return (
      <View className="items-center py-16">
        <Users size={48} color="#d1d5db" />
        <Text className="text-gray-400 mt-3 text-base">
          You haven't joined any groups yet
        </Text>
      </View>
    );
  }

  return (
    <>
      {groups.map((group) => {
        const isExpanded = expandedId === group.id;
        return (
          <TouchableOpacity
            key={group.id}
            className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
            onPress={() => onToggleExpand(group.id)}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-brand-50 items-center justify-center mr-3">
                <Users size={20} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {group.name}
                </Text>
                <Text className="text-sm text-gray-500">
                  {group.memberCount} member
                  {group.memberCount !== 1 ? "s" : ""}
                </Text>
              </View>
              {isExpanded ? (
                <ChevronUp size={18} color="#9ca3af" />
              ) : (
                <ChevronDown size={18} color="#9ca3af" />
              )}
            </View>

            {isExpanded && (
              <View className="mt-3 pt-3 border-t border-gray-100">
                {group.description && (
                  <Text className="text-sm text-gray-600 mb-2">
                    {group.description}
                  </Text>
                )}
                <View className="flex-row items-center">
                  <Calendar size={14} color="#6b7280" />
                  <Text className="text-sm text-gray-500 ml-1.5">
                    {group.nextSession
                      ? `Next: ${formatDate(group.nextSession.date)} at ${
                          group.nextSession.startTime
                        }`
                      : "No upcoming sessions"}
                  </Text>
                </View>
                <Text className="text-xs text-gray-400 mt-1.5">
                  Joined{" "}
                  {new Date(group.joinedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
