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
  TenantSettings,
  Certificate,
  CoachPackage,
  Inquiry,
  ExerciseLibraryItem,
  ExerciseCategory,
  EquipmentType,
  WorkoutPlanListItem,
  WorkoutPlanDetail,
  MealPlanListItem,
  MealPlanDetail,
  HabitTemplate,
  CheckInTemplate,
  ProgramListItem,
  NutritionProgramListItem,
  SearchResults,
  AvailabilitySlot,
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

// Settings
export function useSettings() {
  return useQuery<TenantSettings>({
    queryKey: ["settings"],
    queryFn: () => api.get<TenantSettings>("/api/settings"),
  });
}

export function useCertificates() {
  return useQuery<Certificate[]>({
    queryKey: ["certificates"],
    queryFn: () => api.get<Certificate[]>("/api/settings/certificates"),
  });
}

export function usePackages() {
  return useQuery<CoachPackage[]>({
    queryKey: ["packages"],
    queryFn: () => api.get<CoachPackage[]>("/api/settings/packages"),
  });
}

export function useInquiries() {
  return useQuery<Inquiry[]>({
    queryKey: ["inquiries"],
    queryFn: () => api.get<Inquiry[]>("/api/settings/inquiries"),
  });
}

export function useAvailability() {
  return useQuery<AvailabilitySlot[]>({
    queryKey: ["availability"],
    queryFn: () => api.get<AvailabilitySlot[]>("/api/availability"),
  });
}

// Exercise library
export function useExerciseLibrary(search?: string, category?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  const qs = params.toString();
  return useQuery<ExerciseLibraryItem[]>({
    queryKey: ["exercise-library", search, category],
    queryFn: () => api.get<ExerciseLibraryItem[]>(`/api/exercise-library${qs ? `?${qs}` : ""}`),
  });
}

export function useExerciseCategories() {
  return useQuery<ExerciseCategory[]>({
    queryKey: ["exercise-categories"],
    queryFn: () => api.get<ExerciseCategory[]>("/api/exercise-categories"),
  });
}

export function useEquipmentTypes() {
  return useQuery<EquipmentType[]>({
    queryKey: ["equipment-types"],
    queryFn: () => api.get<EquipmentType[]>("/api/equipment-types"),
  });
}

// Workout plans
export function useWorkoutPlans() {
  return useQuery<WorkoutPlanListItem[]>({
    queryKey: ["workout-plans"],
    queryFn: () => api.get<WorkoutPlanListItem[]>("/api/workouts"),
  });
}

export function useWorkoutPlanDetail(id: string | undefined) {
  return useQuery<WorkoutPlanDetail>({
    queryKey: ["workout-plan-detail", id],
    queryFn: () => api.get<WorkoutPlanDetail>(`/api/workouts/${id}`),
    enabled: !!id,
  });
}

// Meal plans
export function useMealPlans() {
  return useQuery<MealPlanListItem[]>({
    queryKey: ["meal-plans"],
    queryFn: () => api.get<MealPlanListItem[]>("/api/meal-plans"),
  });
}

export function useMealPlanDetail(id: string | undefined) {
  return useQuery<MealPlanDetail>({
    queryKey: ["meal-plan-detail", id],
    queryFn: () => api.get<MealPlanDetail>(`/api/meal-plans/${id}`),
    enabled: !!id,
  });
}

// Habits
export function useHabitTemplates() {
  return useQuery<HabitTemplate[]>({
    queryKey: ["habit-templates"],
    queryFn: () => api.get<HabitTemplate[]>("/api/habits"),
  });
}

// Check-in templates
export function useCheckInTemplates() {
  return useQuery<CheckInTemplate[]>({
    queryKey: ["checkin-templates"],
    queryFn: () => api.get<CheckInTemplate[]>("/api/check-ins/templates"),
  });
}

// Programs
export function usePrograms() {
  return useQuery<ProgramListItem[]>({
    queryKey: ["programs"],
    queryFn: () => api.get<ProgramListItem[]>("/api/programs"),
  });
}

export function useNutritionPrograms() {
  return useQuery<NutritionProgramListItem[]>({
    queryKey: ["nutrition-programs"],
    queryFn: () => api.get<NutritionProgramListItem[]>("/api/nutrition-programs"),
  });
}

// Search
export function useGlobalSearch(query: string) {
  return useQuery<SearchResults>({
    queryKey: ["global-search", query],
    queryFn: () => api.get<SearchResults>(`/api/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
}
