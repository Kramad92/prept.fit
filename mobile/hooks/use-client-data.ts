import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ClientProfile, AssignedHabit, WorkoutLog } from "@/types/api";

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
