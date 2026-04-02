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
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
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
  const t = useT();
  const colors = useThemeColors();

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
        t.common.error,
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
        t.common.error,
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
          { text: t.common.cancel, style: "cancel" },
          {
            text: "Enroll",
            onPress: () => enrollMutation.mutate(session.id),
          },
        ]
      );
    },
    [enrollMutation, t]
  );

  const handleUnenroll = useCallback(
    (session: GroupSession) => {
      Alert.alert("Leave Session", "Are you sure you want to unenroll?", [
        { text: t.common.cancel, style: "cancel" },
        {
          text: "Unenroll",
          style: "destructive",
          onPress: () => unenrollMutation.mutate(session.id),
        },
      ]);
    },
    [unenrollMutation, t]
  );

  const isLoading = tab === "sessions" ? loadingSessions : loadingGroups;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50">
          {t.nav.groupTraining}
        </Text>
      </View>

      {/* Tab switcher */}
      <View className="flex-row px-4 pt-3 pb-1 bg-white dark:bg-slate-800">
        <TouchableOpacity
          className={`flex-1 py-2 items-center border-b-2 ${
            tab === "sessions" ? "border-brand-600" : "border-transparent"
          }`}
          onPress={() => setTab("sessions")}
        >
          <Text
            className={`font-medium ${
              tab === "sessions" ? "text-brand-600" : "text-gray-500 dark:text-slate-400"
            }`}
          >
            {t.groupTraining.sessions}
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
              tab === "groups" ? "text-brand-600" : "text-gray-500 dark:text-slate-400"
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
            tintColor={colors.brand}
          />
        }
      >
        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : tab === "sessions" ? (
          <SessionsView
            enrolled={groupSessions?.enrolled || []}
            open={groupSessions?.open || []}
            onEnroll={handleEnroll}
            onUnenroll={handleUnenroll}
            enrolling={enrollMutation.isPending}
            colors={colors}
            t={t}
          />
        ) : (
          <GroupsView
            groups={groups || []}
            expandedId={expandedGroupId}
            onToggleExpand={(id) =>
              setExpandedGroupId(expandedGroupId === id ? null : id)
            }
            colors={colors}
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
  colors,
  t,
}: {
  enrolled: GroupSession[];
  open: GroupSession[];
  onEnroll: (s: GroupSession) => void;
  onUnenroll: (s: GroupSession) => void;
  enrolling: boolean;
  colors: ReturnType<typeof useThemeColors>;
  t: ReturnType<typeof useT>;
}) {
  if (enrolled.length === 0 && open.length === 0) {
    return (
      <View className="items-center py-16">
        <Users size={48} color={colors.iconMuted} />
        <Text className="text-gray-400 dark:text-slate-500 mt-3 text-base">
          {t.groupTraining.noSessions}
        </Text>
      </View>
    );
  }

  return (
    <>
      {enrolled.length > 0 && (
        <>
          <Text className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">
            Your Sessions
          </Text>
          {enrolled.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              enrolled
              onPress={() => onUnenroll(session)}
              disabled={enrolling}
              colors={colors}
            />
          ))}
        </>
      )}

      {open.length > 0 && (
        <>
          <Text className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2 mt-4">
            {t.groupTraining.openSessions}
          </Text>
          {open.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              enrolled={false}
              onPress={() => onEnroll(session)}
              disabled={enrolling}
              colors={colors}
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
  colors,
}: {
  session: GroupSession;
  enrolled: boolean;
  onPress: () => void;
  disabled: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const t = useT();
  const spotsLeft = session.maxParticipants - session._count.participants;

  return (
    <View
      className={`bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 border ${
        enrolled ? "border-brand-200" : "border-gray-100 dark:border-slate-700/40"
      }`}
    >
      <View className="flex-row items-start">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            enrolled ? "bg-brand-50" : "bg-gray-50 dark:bg-slate-950"
          }`}
        >
          <Users size={20} color={enrolled ? colors.brand : colors.icon} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900 dark:text-slate-50">
            {session.group?.name || "Group Session"}
          </Text>
          <View className="flex-row items-center mt-1">
            <Calendar size={13} color={colors.icon} />
            <Text className="text-sm text-gray-500 dark:text-slate-400 ml-1">
              {formatDate(session.date)}
            </Text>
            <Clock size={13} color={colors.icon} className="ml-2" />
            <Text className="text-sm text-gray-500 dark:text-slate-400 ml-1">
              {session.startTime} - {session.endTime}
            </Text>
          </View>
          <View className="flex-row items-center mt-1.5" style={{ gap: 8 }}>
            <View className="flex-row items-center">
              <Users size={12} color={colors.iconMuted} />
              <Text className="text-xs text-gray-400 dark:text-slate-500 ml-1">
                {session._count.participants}/{session.maxParticipants}
              </Text>
            </View>
            {session.workoutPlan && (
              <View className="flex-row items-center">
                <Dumbbell size={12} color={colors.iconMuted} />
                <Text className="text-xs text-gray-400 dark:text-slate-500 ml-1">
                  {session.workoutPlan.name}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <TouchableOpacity
        className={`mt-3 rounded-lg py-2 items-center flex-row justify-center ${
          enrolled ? "bg-gray-100 dark:bg-slate-700" : spotsLeft > 0 ? "bg-brand-600" : "bg-gray-300 dark:bg-slate-600"
        }`}
        onPress={onPress}
        disabled={disabled || (!enrolled && spotsLeft <= 0)}
        activeOpacity={0.7}
      >
        {enrolled ? (
          <>
            <UserMinus size={16} color={colors.icon} />
            <Text className="text-sm font-medium text-gray-600 dark:text-slate-300 ml-1.5">
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
          <Text className="text-sm font-medium text-gray-500 dark:text-slate-400">{t.groupTraining.full}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function GroupsView({
  groups,
  expandedId,
  onToggleExpand,
  colors,
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
  colors: ReturnType<typeof useThemeColors>;
}) {
  if (groups.length === 0) {
    return (
      <View className="items-center py-16">
        <Users size={48} color={colors.iconMuted} />
        <Text className="text-gray-400 dark:text-slate-500 mt-3 text-base">
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
            className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-slate-700/40"
            onPress={() => onToggleExpand(group.id)}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-brand-50 items-center justify-center mr-3">
                <Users size={20} color={colors.brand} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 dark:text-slate-50">
                  {group.name}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-slate-400">
                  {group.memberCount} member
                  {group.memberCount !== 1 ? "s" : ""}
                </Text>
              </View>
              {isExpanded ? (
                <ChevronUp size={18} color={colors.iconMuted} />
              ) : (
                <ChevronDown size={18} color={colors.iconMuted} />
              )}
            </View>

            {isExpanded && (
              <View className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700/40">
                {group.description && (
                  <Text className="text-sm text-gray-600 dark:text-slate-300 mb-2">
                    {group.description}
                  </Text>
                )}
                <View className="flex-row items-center">
                  <Calendar size={14} color={colors.icon} />
                  <Text className="text-sm text-gray-500 dark:text-slate-400 ml-1.5">
                    {group.nextSession
                      ? `Next: ${formatDate(group.nextSession.date)} at ${
                          group.nextSession.startTime
                        }`
                      : "No upcoming sessions"}
                  </Text>
                </View>
                <Text className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">
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
