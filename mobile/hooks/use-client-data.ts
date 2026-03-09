import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  ClientProfile,
  AssignedHabit,
  WorkoutLog,
  Message,
  CheckIn,
  CheckInTemplate,
  AppNotification,
  BookingSlot,
  TrainingGroup,
  GroupSessionsResponse,
  PaymentResponse,
} from "@/types/api";

export function useClientProfile() {
  return useQuery<ClientProfile>({
    queryKey: ["client-profile"],
    queryFn: () => api.get<ClientProfile>("/api/portal/me"),
  });
}

export function useHabits(clientId: string | undefined) {
  return useQuery<AssignedHabit[]>({
    queryKey: ["habits", clientId],
    queryFn: () =>
      api.get<AssignedHabit[]>(
        `/api/habits/log?clientId=${clientId}&days=30`
      ),
    enabled: !!clientId,
  });
}

export function useWorkoutLogs() {
  return useQuery<WorkoutLog[]>({
    queryKey: ["workout-logs"],
    queryFn: () => api.get<WorkoutLog[]>("/api/workout-logs"),
  });
}

export function useMessages(clientId: string | undefined) {
  return useQuery<Message[]>({
    queryKey: ["messages", clientId],
    queryFn: () => api.get<Message[]>(`/api/messages/${clientId}`),
    enabled: !!clientId,
  });
}

export function useUnreadCount() {
  return useQuery<Record<string, number>>({
    queryKey: ["messages-unread"],
    queryFn: () => api.get<Record<string, number>>("/api/messages/unread"),
    refetchInterval: 30000,
  });
}

export function useCheckIns(clientId: string | undefined) {
  return useQuery<CheckIn[]>({
    queryKey: ["check-ins", clientId],
    queryFn: () => api.get<CheckIn[]>(`/api/check-ins?clientId=${clientId}`),
    enabled: !!clientId,
  });
}

export function useCheckInTemplates() {
  return useQuery<CheckInTemplate[]>({
    queryKey: ["check-in-templates"],
    queryFn: () => api.get<CheckInTemplate[]>("/api/check-ins/templates"),
  });
}

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: ["notifications"],
    queryFn: () => api.get<AppNotification[]>("/api/notifications"),
    refetchInterval: 30000,
  });
}

// Phase 4: Scheduling & Groups

export function useBookingSlots(days = 14) {
  return useQuery<BookingSlot[]>({
    queryKey: ["booking-slots", days],
    queryFn: () => api.get<BookingSlot[]>(`/api/booking/slots?days=${days}`),
  });
}

export function useTrainingGroups() {
  return useQuery<TrainingGroup[]>({
    queryKey: ["training-groups"],
    queryFn: () => api.get<TrainingGroup[]>("/api/portal/training-groups"),
  });
}

export function useGroupSessions() {
  return useQuery<GroupSessionsResponse>({
    queryKey: ["group-sessions"],
    queryFn: () =>
      api.get<GroupSessionsResponse>("/api/portal/group-sessions"),
  });
}

export function usePayments() {
  return useQuery<PaymentResponse>({
    queryKey: ["payments"],
    queryFn: () => api.get<PaymentResponse>("/api/portal/payments"),
  });
}
