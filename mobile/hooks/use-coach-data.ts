import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  CoachDashboard,
  ClientListItem,
  ClientDetail,
  CoachScheduleItem,
  CoachPaymentsResponse,
  CoachTrainingGroup,
  CoachGroupSession,
  CoachGroupSessionDetail,
  LatestMessagesMap,
  UnreadCountsMap,
  AppNotification,
} from "@/types/api";

export function useCoachDashboard() {
  return useQuery<CoachDashboard>({
    queryKey: ["coach-dashboard"],
    queryFn: () => api.get<CoachDashboard>("/api/dashboard"),
  });
}

export function useCoachClients(search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  return useQuery<ClientListItem[]>({
    queryKey: ["coach-clients", search],
    queryFn: () => api.get<ClientListItem[]>(`/api/clients${params}`),
  });
}

export function useClientDetail(clientId: string | undefined) {
  return useQuery<ClientDetail>({
    queryKey: ["coach-client-detail", clientId],
    queryFn: () => api.get<ClientDetail>(`/api/clients/${clientId}`),
    enabled: !!clientId,
  });
}

export function useCoachSchedule(month?: string) {
  const params = month ? `?month=${month}` : "";
  return useQuery<CoachScheduleItem[]>({
    queryKey: ["coach-schedule", month],
    queryFn: () => api.get<CoachScheduleItem[]>(`/api/schedules${params}`),
  });
}

export function useCoachPayments(status?: string) {
  const params = status ? `?status=${status}` : "";
  return useQuery<CoachPaymentsResponse>({
    queryKey: ["coach-payments", status],
    queryFn: () =>
      api.get<CoachPaymentsResponse>(`/api/payments${params}`),
  });
}

export function useLatestMessages() {
  return useQuery<LatestMessagesMap>({
    queryKey: ["coach-latest-messages"],
    queryFn: () => api.get<LatestMessagesMap>("/api/messages/latest"),
    refetchInterval: 30000,
  });
}

export function useCoachUnreadCounts() {
  return useQuery<UnreadCountsMap>({
    queryKey: ["coach-unread-counts"],
    queryFn: () => api.get<UnreadCountsMap>("/api/messages/unread"),
    refetchInterval: 30000,
  });
}

export function useCoachTrainingGroups() {
  return useQuery<CoachTrainingGroup[]>({
    queryKey: ["coach-training-groups"],
    queryFn: () => api.get<CoachTrainingGroup[]>("/api/training-groups"),
  });
}

export function useCoachGroupSessions(groupId?: string) {
  const params = groupId ? `?groupId=${groupId}` : "";
  return useQuery<CoachGroupSession[]>({
    queryKey: ["coach-group-sessions", groupId],
    queryFn: () =>
      api.get<CoachGroupSession[]>(`/api/group-sessions${params}`),
  });
}

export function useCoachGroupSessionDetail(sessionId: string | undefined) {
  return useQuery<CoachGroupSessionDetail>({
    queryKey: ["coach-group-session-detail", sessionId],
    queryFn: () =>
      api.get<CoachGroupSessionDetail>(`/api/group-sessions/${sessionId}`),
    enabled: !!sessionId,
  });
}

export function useCoachNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: ["coach-notifications"],
    queryFn: () => api.get<AppNotification[]>("/api/notifications"),
    refetchInterval: 30000,
  });
}
