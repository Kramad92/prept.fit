import { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
} from "react-native";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MessageCircle,
  Dumbbell,
  UtensilsCrossed,
  Camera,
  Ruler,
  Mail,
  Phone,
  Target,
  AlertCircle,
  Edit3,
  Plus,
  ChevronRight,
  Trash2,
  X,
  Pause,
  Play,
  Search,
  Sparkles,
} from "lucide-react-native";
import { useClientDetail, useWorkoutPlans, useMealPlans, useHabitTemplates, useExerciseLibrary, useExerciseCategories, useEquipmentTypes } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { AppBottomSheet, BottomSheetTextInput } from "@/components/app-bottom-sheet";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";

type Tab = "overview" | "workouts" | "nutrition" | "progress";

export default function ClientDetailScreen() {
  const t = useT();
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: client, isLoading, error, refetch, isRefetching } =
    useClientDetail(id);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showEditClient, setShowEditClient] = useState(false);
  const [showAssignWorkout, setShowAssignWorkout] = useState(false);
  const [showAssignMeal, setShowAssignMeal] = useState(false);
  const [selectedWorkoutPlan, setSelectedWorkoutPlan] = useState<any>(null);
  const [selectedMealPlan, setSelectedMealPlan] = useState<any>(null);
  const [showCreateWorkout, setShowCreateWorkout] = useState(false);
  const [showCreateMealPlan, setShowCreateMealPlan] = useState(false);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Header />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !client) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Header />
        <QueryError message={t.errors.failedToLoad} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const isActive = client.status === "ACTIVE" || client.status === "active";
  const latestWeight = client.measurements?.[0]?.weight;
  const activePlans = client.assignedPlans?.filter((p) => p.isActive).length || 0;
  const activeMealPlans = client.assignedMealPlans?.filter((p) => p.isActive).length || 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <Header title={client.name} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand}
          />
        }
      >
        {/* Profile Header */}
        <View className="bg-white dark:bg-slate-800 px-4 py-5 border-b border-gray-100 dark:border-slate-700/40">
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-brand-50 items-center justify-center mr-4">
              <Text className="text-brand-700 font-bold text-xl">
                {client.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-xl font-bold text-gray-900 dark:text-slate-50 mr-2">
                  {client.name}
                </Text>
                <View
                  className={`px-2 py-0.5 rounded-full ${
                    isActive ? "bg-green-50 dark:bg-green-900/25" : "bg-gray-100 dark:bg-slate-700"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      isActive ? "text-green-700 dark:text-green-300" : "text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    {client.status}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center mt-1">
                {client.email && (
                  <View className="flex-row items-center mr-4">
                    <Mail size={12} color={colors.iconMuted} />
                    <Text className="text-xs text-gray-500 dark:text-slate-400 ml-1">
                      {client.email}
                    </Text>
                  </View>
                )}
                {client.phone && (
                  <View className="flex-row items-center">
                    <Phone size={12} color={colors.iconMuted} />
                    <Text className="text-xs text-gray-500 dark:text-slate-400 ml-1">
                      {client.phone}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="flex-row mt-4">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center bg-brand-600 rounded-lg py-2.5 mr-2"
              onPress={() => router.push({ pathname: "/(coach)/messages/[clientId]", params: { clientId: id } } as any)}
              activeOpacity={0.7}
            >
              <MessageCircle size={16} color="#fff" />
              <Text className="text-white font-semibold text-sm ml-2">{t.messages.title}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg py-2.5 px-4"
              onPress={() => setShowEditClient(true)}
              activeOpacity={0.7}
            >
              <Edit3 size={16} color={colors.icon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Bar */}
        <View className="flex-row bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
          {(["overview", "workouts", "nutrition", "progress"] as Tab[]).map(
            (tab) => (
              <TouchableOpacity
                key={tab}
                className={`flex-1 py-3 items-center border-b-2 ${
                  activeTab === tab
                    ? "border-brand-600"
                    : "border-transparent"
                }`}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.6}
              >
                <Text
                  className={`text-sm font-medium capitalize ${
                    activeTab === tab ? "text-brand-600" : "text-gray-500 dark:text-slate-400"
                  }`}
                >
                  {tab === "overview" ? t.clients.overview :
                   tab === "workouts" ? t.clients.workouts :
                   tab === "nutrition" ? t.clients.nutrition :
                   t.nav.progress}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Tab Content */}
        <View className="px-4 pt-4">
          {activeTab === "overview" && (
            <OverviewTab
              client={client}
              latestWeight={latestWeight}
              activePlans={activePlans}
              activeMealPlans={activeMealPlans}
            />
          )}
          {activeTab === "workouts" && (
            <WorkoutsTab
              plans={client.assignedPlans || []}
              onAssign={() => setShowAssignWorkout(true)}
              onOpen={setSelectedWorkoutPlan}
              onCreate={() => setShowCreateWorkout(true)}
            />
          )}
          {activeTab === "nutrition" && (
            <NutritionTab
              plans={client.assignedMealPlans || []}
              onAssign={() => setShowAssignMeal(true)}
              onOpen={setSelectedMealPlan}
              onCreate={() => setShowCreateMealPlan(true)}
            />
          )}
          {activeTab === "progress" && (
            <ProgressTab
              photos={client.progressPhotos || []}
              measurements={client.measurements || []}
            />
          )}
        </View>
      </ScrollView>

      {client && (
        <>
          <EditClientModal visible={showEditClient} client={client} onClose={() => setShowEditClient(false)} onSuccess={() => { setShowEditClient(false); refetch(); }} />
          <AssignWorkoutModal visible={showAssignWorkout} clientId={id!} onClose={() => setShowAssignWorkout(false)} onSuccess={() => { setShowAssignWorkout(false); refetch(); }} />
          <AssignMealModal visible={showAssignMeal} clientId={id!} onClose={() => setShowAssignMeal(false)} onSuccess={() => { setShowAssignMeal(false); refetch(); }} />
          <WorkoutPlanDetailSheet
            visible={!!selectedWorkoutPlan}
            plan={selectedWorkoutPlan}
            clientId={id!}
            onClose={() => setSelectedWorkoutPlan(null)}
            onRefresh={refetch}
          />
          <MealPlanDetailSheet
            visible={!!selectedMealPlan}
            plan={selectedMealPlan}
            clientId={id!}
            onClose={() => setSelectedMealPlan(null)}
            onRefresh={refetch}
          />
          <CreateWorkoutSheet
            visible={showCreateWorkout}
            clientId={id!}
            onClose={() => setShowCreateWorkout(false)}
            onSuccess={() => { setShowCreateWorkout(false); refetch(); }}
          />
          <CreateMealPlanSheet
            visible={showCreateMealPlan}
            clientId={id!}
            onClose={() => setShowCreateMealPlan(false)}
            onSuccess={() => { setShowCreateMealPlan(false); refetch(); }}
          />
        </>
      )}
    </SafeAreaView>
  );
}

function Header({ title }: { title?: string }) {
  const t = useT();
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
      <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
        <ArrowLeft size={22} color={colors.text} />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50" numberOfLines={1}>
        {title || t.schedule.client}
      </Text>
    </View>
  );
}

function OverviewTab({
  client,
  latestWeight,
  activePlans,
  activeMealPlans,
}: {
  client: any;
  latestWeight: number | null | undefined;
  activePlans: number;
  activeMealPlans: number;
}) {
  const t = useT();
  const colors = useThemeColors();
  return (
    <View>
      {/* Quick Stats */}
      <View className="flex-row flex-wrap -mx-1.5 mb-4">
        <View className="w-1/3 px-1.5 mb-3">
          <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-3 items-center">
            <Dumbbell size={16} color={colors.brand} />
            <Text className="text-lg font-bold text-gray-900 dark:text-slate-50 mt-1">
              {activePlans}
            </Text>
            <Text className="text-[10px] text-gray-500 dark:text-slate-400">{t.workouts.title}</Text>
          </View>
        </View>
        <View className="w-1/3 px-1.5 mb-3">
          <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-3 items-center">
            <UtensilsCrossed size={16} color={colors.brand} />
            <Text className="text-lg font-bold text-gray-900 dark:text-slate-50 mt-1">
              {activeMealPlans}
            </Text>
            <Text className="text-[10px] text-gray-500 dark:text-slate-400">{t.nutrition.mealPlans}</Text>
          </View>
        </View>
        <View className="w-1/3 px-1.5 mb-3">
          <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-3 items-center">
            <Ruler size={16} color={colors.brand} />
            <Text className="text-lg font-bold text-gray-900 dark:text-slate-50 mt-1">
              {latestWeight != null ? `${latestWeight}` : "\u2014"}
            </Text>
            <Text className="text-[10px] text-gray-500 dark:text-slate-400">{t.measurements.weight} ({t.measurements.kg})</Text>
          </View>
        </View>
      </View>

      {/* Details */}
      {client.height != null && (
        <InfoRow icon={Ruler} label={t.clients.height} value={`${client.height} ${t.measurements.cm}`} />
      )}
      {client.goals && (
        <InfoRow icon={Target} label={t.clients.goals} value={client.goals} />
      )}
      {client.injuries && (
        <InfoRow icon={AlertCircle} label={t.clients.injuries} value={client.injuries} />
      )}
      {client.fitnessLevel && (
        <InfoRow
          icon={Dumbbell}
          label={t.clients.fitnessLevel}
          value={client.fitnessLevel}
        />
      )}
      {client.notes && (
        <InfoRow icon={Target} label={t.common.notes} value={client.notes} />
      )}
    </View>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  const colors = useThemeColors();
  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 px-4 py-3 mb-3">
      <View className="flex-row items-center mb-1">
        <Icon size={14} color={colors.iconMuted} />
        <Text className="text-xs font-medium text-gray-500 dark:text-slate-400 ml-1.5">
          {label}
        </Text>
      </View>
      <Text className="text-sm text-gray-900 dark:text-slate-50">{value}</Text>
    </View>
  );
}

function WorkoutsTab({ plans, onAssign, onOpen, onCreate }: { plans: any[]; onAssign: () => void; onOpen: (plan: any) => void; onCreate: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  return (
    <View>
      <View className="flex-row mb-3">
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center border-2 border-dashed border-brand-300 rounded-xl py-2.5 mr-2"
          onPress={onAssign}
          activeOpacity={0.6}
        >
          <Plus size={16} color={colors.brand} />
          <Text className="text-sm font-medium text-brand-600 ml-1">{t.workouts.assign}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center bg-brand-600 rounded-xl py-2.5"
          onPress={onCreate}
          activeOpacity={0.6}
        >
          <Plus size={16} color="#fff" />
          <Text className="text-sm font-medium text-white ml-1">{t.workouts.customPlan}</Text>
        </TouchableOpacity>
      </View>
      {plans.length === 0 ? (
        <View className="items-center py-8">
          <Dumbbell size={36} color={colors.iconMuted} />
          <Text className="text-gray-400 dark:text-slate-500 text-sm mt-2">{t.workouts.noPlansAssigned}</Text>
        </View>
      ) : null}
      {plans.map((p) => (
        <TouchableOpacity
          key={p.id}
          className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-4 mb-3"
          onPress={() => onOpen(p)}
          activeOpacity={0.6}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-base font-medium text-gray-900 dark:text-slate-50 flex-1" numberOfLines={1}>
              {p.customName || p.workoutPlan?.name || t.workouts.title}
            </Text>
            <View className="flex-row items-center">
              <View
                className={`px-2 py-0.5 rounded-full mr-2 ${
                  p.isActive ? "bg-green-50 dark:bg-green-900/25" : "bg-gray-100 dark:bg-slate-700"
                }`}
              >
                <Text
                  className={`text-[10px] font-medium ${
                    p.isActive ? "text-green-700 dark:text-green-300" : "text-gray-500 dark:text-slate-400"
                  }`}
                >
                  {p.isActive ? t.clients.active : t.clients.inactive}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.iconMuted} />
            </View>
          </View>
          {p.workoutPlan?.exercises && (
            <Text className="text-xs text-gray-500 dark:text-slate-400">
              {p.workoutPlan.exercises.length} {t.workouts.exercises_count}
            </Text>
          )}
          {p.endDate && (
            <Text className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              {new Date(p.endDate).toLocaleDateString()}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function NutritionTab({ plans, onAssign, onOpen, onCreate }: { plans: any[]; onAssign: () => void; onOpen: (plan: any) => void; onCreate: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  return (
    <View>
      <View className="flex-row mb-3">
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center border-2 border-dashed border-brand-300 rounded-xl py-2.5 mr-2"
          onPress={onAssign}
          activeOpacity={0.6}
        >
          <Plus size={16} color={colors.brand} />
          <Text className="text-sm font-medium text-brand-600 ml-1">{t.workouts.assign}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center bg-brand-600 rounded-xl py-2.5"
          onPress={onCreate}
          activeOpacity={0.6}
        >
          <Plus size={16} color="#fff" />
          <Text className="text-sm font-medium text-white ml-1">{t.workouts.customPlan}</Text>
        </TouchableOpacity>
      </View>
      {plans.length === 0 ? (
        <View className="items-center py-8">
          <UtensilsCrossed size={36} color={colors.iconMuted} />
          <Text className="text-gray-400 dark:text-slate-500 text-sm mt-2">{t.nutrition.noPlansAssigned}</Text>
        </View>
      ) : null}
      {plans.map((p) => {
        const mp = p.mealPlan;
        return (
          <TouchableOpacity
            key={p.id}
            className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-4 mb-3"
            onPress={() => onOpen(p)}
            activeOpacity={0.6}
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-base font-medium text-gray-900 dark:text-slate-50 flex-1" numberOfLines={1}>
                {p.customName || mp?.name || t.nutrition.title}
              </Text>
              <View className="flex-row items-center">
                <View
                  className={`px-2 py-0.5 rounded-full mr-2 ${
                    p.isActive ? "bg-green-50 dark:bg-green-900/25" : "bg-gray-100 dark:bg-slate-700"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-medium ${
                      p.isActive ? "text-green-700 dark:text-green-300" : "text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    {p.isActive ? t.clients.active : t.clients.inactive}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.iconMuted} />
              </View>
            </View>
            {mp && (
              <View className="flex-row flex-wrap mt-1">
                {mp.targetCalories != null && (
                  <Text className="text-xs text-gray-500 dark:text-slate-400 mr-3">
                    {mp.targetCalories} {t.nutrition.kcal}
                  </Text>
                )}
                {mp.targetProtein != null && (
                  <Text className="text-xs text-gray-500 dark:text-slate-400 mr-3">
                    P: {mp.targetProtein}{t.nutrition.gram}
                  </Text>
                )}
                {mp.targetCarbs != null && (
                  <Text className="text-xs text-gray-500 dark:text-slate-400 mr-3">
                    C: {mp.targetCarbs}{t.nutrition.gram}
                  </Text>
                )}
                {mp.targetFat != null && (
                  <Text className="text-xs text-gray-500 dark:text-slate-400">
                    F: {mp.targetFat}{t.nutrition.gram}
                  </Text>
                )}
              </View>
            )}
            {mp?.meals && (
              <Text className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                {mp.meals.length} {t.nutrition.meals.toLowerCase()}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ProgressTab({
  photos,
  measurements,
}: {
  photos: any[];
  measurements: any[];
}) {
  const t = useT();
  const colors = useThemeColors();
  return (
    <View>
      {/* Photos */}
      <Text className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
        {t.photos.title} ({photos.length})
      </Text>
      {photos.length === 0 ? (
        <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-6 items-center mb-4">
          <Camera size={28} color={colors.iconMuted} />
          <Text className="text-gray-400 dark:text-slate-500 text-xs mt-1">{t.photos.noPhotos}</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
        >
          {photos.slice(0, 10).map((p) => (
            <View
              key={p.id}
              className="w-24 h-24 rounded-lg overflow-hidden mr-2 bg-gray-100 dark:bg-slate-700"
            >
              <Image
                source={{ uri: p.url }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>
      )}

      {/* Measurements */}
      <Text className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
        {t.measurements.title} ({measurements.length})
      </Text>
      {measurements.length === 0 ? (
        <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-6 items-center">
          <Ruler size={28} color={colors.iconMuted} />
          <Text className="text-gray-400 dark:text-slate-500 text-xs mt-1">
            {t.measurements.noMeasurements}
          </Text>
        </View>
      ) : (
        <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 overflow-hidden">
          {measurements.slice(0, 5).map((m, i) => (
            <View
              key={m.id}
              className={`px-4 py-3 ${
                i < Math.min(measurements.length, 5) - 1
                  ? "border-b border-gray-50 dark:border-slate-700/40"
                  : ""
              }`}
            >
              <Text className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                {new Date(m.date).toLocaleDateString()}
              </Text>
              <View className="flex-row flex-wrap">
                {m.weight != null && (
                  <Text className="text-sm text-gray-900 dark:text-slate-50 mr-4">
                    {t.measurements.weight}: {m.weight}{t.measurements.kg}
                  </Text>
                )}
                {m.bodyFat != null && (
                  <Text className="text-sm text-gray-900 dark:text-slate-50 mr-4">
                    {t.measurements.bodyFat}: {m.bodyFat}%
                  </Text>
                )}
                {m.chest != null && (
                  <Text className="text-sm text-gray-900 dark:text-slate-50 mr-4">
                    {t.measurements.chest}: {m.chest}
                  </Text>
                )}
                {m.waist != null && (
                  <Text className="text-sm text-gray-900 dark:text-slate-50 mr-4">
                    {t.measurements.waist}: {m.waist}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function EditClientModal({ visible, client, onClose, onSuccess }: { visible: boolean; client: any; onClose: () => void; onSuccess: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [name, setName] = useState(client.name || "");
  const [email, setEmail] = useState(client.email || "");
  const [phone, setPhone] = useState(client.phone || "");
  const [goals, setGoals] = useState(client.goals || "");
  const [notes, setNotes] = useState(client.notes || "");
  const [status, setStatus] = useState(client.status?.toLowerCase() || "active");

  useEffect(() => {
    setName(client.name || "");
    setEmail(client.email || "");
    setPhone(client.phone || "");
    setGoals(client.goals || "");
    setNotes(client.notes || "");
    setStatus(client.status?.toLowerCase() || "active");
  }, [client]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.put(`/api/clients/${client.id}`, data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      queryClient.invalidateQueries({ queryKey: ["coach-clients"] });
      onSuccess();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["92%"]}
      title={t.clients.editClient}
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => {
            if (!name.trim()) return Alert.alert(t.common.required, t.clients.clientName);
            mutation.mutate({ name: name.trim(), email: email.trim() || null, phone: phone.trim() || null, goals: goals.trim() || null, notes: notes.trim() || null, status });
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{t.clients.saveChanges}</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.name} *</Text>
      <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={name} onChangeText={setName} />
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.email}</Text>
      <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.phone}</Text>
      <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.clients.goals}</Text>
      <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={goals} onChangeText={setGoals} multiline />
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.notes}</Text>
      <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={notes} onChangeText={setNotes} multiline />
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.status}</Text>
      <View className="flex-row">
        {["active", "paused", "archived"].map((s) => (
          <TouchableOpacity key={s} className={`mr-2 px-3 py-1.5 rounded-full ${status === s ? "bg-brand-600" : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"}`} onPress={() => setStatus(s)}>
            <Text className={`text-xs font-medium capitalize ${status === s ? "text-white" : "text-gray-600 dark:text-slate-300"}`}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </AppBottomSheet>
  );
}

function AssignWorkoutModal({ visible, clientId, onClose, onSuccess }: { visible: boolean; clientId: string; onClose: () => void; onSuccess: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { data: plans } = useWorkoutPlans();
  const [selectedId, setSelectedId] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/api/workouts/assign", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      setSelectedId("");
      onSuccess();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={() => { setSelectedId(""); onClose(); }}
      title={t.workouts.assignPlan}
      footer={selectedId ? (
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => mutation.mutate({ clientId, workoutPlanId: selectedId })}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{t.workouts.assignPlan}</Text>}
        </TouchableOpacity>
      ) : undefined}
    >
      {(plans || []).length === 0 ? (
        <View className="items-center py-12"><Text className="text-sm text-gray-400 dark:text-slate-500">{t.workouts.noPlans}</Text></View>
      ) : (plans || []).map((p) => (
        <TouchableOpacity key={p.id} className={`bg-white dark:bg-slate-800 rounded-xl border px-4 py-3 mb-2 ${selectedId === p.id ? "border-brand-600 bg-brand-50" : "border-gray-100 dark:border-slate-700/40"}`} onPress={() => setSelectedId(p.id)}>
          <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">{p.name}</Text>
          <Text className="text-xs text-gray-500 dark:text-slate-400">{p.exerciseCount} {t.workouts.exercises_count}</Text>
        </TouchableOpacity>
      ))}
    </AppBottomSheet>
  );
}

function AssignMealModal({ visible, clientId, onClose, onSuccess }: { visible: boolean; clientId: string; onClose: () => void; onSuccess: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { data: plans } = useMealPlans();
  const [selectedId, setSelectedId] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/api/meal-plans/assign", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      setSelectedId("");
      onSuccess();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={() => { setSelectedId(""); onClose(); }}
      title={t.nutrition.title}
      footer={selectedId ? (
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => mutation.mutate({ clientId, mealPlanId: selectedId })}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{t.workouts.assignPlan}</Text>}
        </TouchableOpacity>
      ) : undefined}
    >
      {(plans || []).length === 0 ? (
        <View className="items-center py-12"><Text className="text-sm text-gray-400 dark:text-slate-500">{t.nutrition.noPlans}</Text></View>
      ) : (plans || []).map((p) => (
        <TouchableOpacity key={p.id} className={`bg-white dark:bg-slate-800 rounded-xl border px-4 py-3 mb-2 ${selectedId === p.id ? "border-brand-600 bg-brand-50" : "border-gray-100 dark:border-slate-700/40"}`} onPress={() => setSelectedId(p.id)}>
          <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">{p.name}</Text>
          <Text className="text-xs text-gray-500 dark:text-slate-400">{p.mealCount} {t.nutrition.meals.toLowerCase()}{p.targetCalories ? ` · ${p.targetCalories} ${t.nutrition.kcal}` : ""}</Text>
        </TouchableOpacity>
      ))}
    </AppBottomSheet>
  );
}

/* --- Workout Plan Detail / Edit Sheet --- */
function WorkoutPlanDetailSheet({ visible, plan, clientId, onClose, onRefresh }: { visible: boolean; plan: any; clientId: string; onClose: () => void; onRefresh: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editExercises, setEditExercises] = useState<{ name: string; sets: string; reps: string; weight: string; restSeconds: string; notes: string }[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [browseTargetIndex, setBrowseTargetIndex] = useState<number>(0);

  useEffect(() => {
    if (plan) {
      const exercises = plan.clientExercises?.length > 0 ? plan.clientExercises : plan.workoutPlan?.exercises || [];
      setEditName(plan.customName || plan.workoutPlan?.name || "");
      setEditExercises(exercises.map((ex: any) => ({
        name: ex.name || "",
        sets: ex.sets?.toString() || "",
        reps: ex.reps || "",
        weight: ex.weight || "",
        restSeconds: ex.restSeconds?.toString() || "",
        notes: ex.notes || "",
      })));
      setIsEditing(false);
    }
  }, [plan]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.put(`/api/clients/${clientId}/workouts/${plan?.id}`, data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      setIsEditing(false);
      onRefresh();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () => api.put(`/api/clients/${clientId}/workouts/${plan?.id}`, { isActive: !plan?.isActive }),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      onRefresh();
      onClose();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/clients/${clientId}/workouts/${plan?.id}`),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      onRefresh();
      onClose();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  function handleSave() {
    saveMutation.mutate({
      customName: editName,
      exercises: editExercises.filter((ex) => ex.name.trim()).map((ex, i) => ({
        name: ex.name,
        sets: ex.sets ? parseInt(ex.sets) : null,
        reps: ex.reps || null,
        weight: ex.weight || null,
        restSeconds: ex.restSeconds ? parseInt(ex.restSeconds) : null,
        notes: ex.notes || null,
        orderIndex: i,
      })),
    });
  }

  function handleDelete() {
    Alert.alert(t.common.delete, t.workouts.deleteConfirm, [
      { text: t.common.cancel, style: "cancel" },
      { text: t.common.delete, style: "destructive", onPress: () => deleteMutation.mutate() },
    ]);
  }

  function addExercise() {
    setEditExercises([...editExercises, { name: "", sets: "", reps: "", weight: "", restSeconds: "", notes: "" }]);
  }

  function updateExercise(index: number, field: string, value: string) {
    setEditExercises(editExercises.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  }

  function removeExercise(index: number) {
    setEditExercises(editExercises.filter((_, i) => i !== index));
  }

  if (!plan) return null;

  const exercises = plan.clientExercises?.length > 0 ? plan.clientExercises : plan.workoutPlan?.exercises || [];

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["92%"]}
      title={plan.customName || plan.workoutPlan?.name || t.workouts.title}
      footer={
        isEditing ? (
          <View className="flex-row">
            <TouchableOpacity className="flex-1 rounded-lg py-3 items-center bg-gray-100 dark:bg-slate-700 mr-2" onPress={() => setIsEditing(false)}>
              <Text className="text-gray-700 dark:text-slate-200 font-semibold text-sm">{t.common.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity className={`flex-1 rounded-lg py-3 items-center ${saveMutation.isPending ? "bg-brand-400" : "bg-brand-600"}`} onPress={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-sm">{t.workouts.saveChanges}</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row">
            <TouchableOpacity className="flex-1 rounded-lg py-3 items-center bg-brand-600 mr-2" onPress={() => setIsEditing(true)}>
              <Text className="text-white font-semibold text-sm">{t.common.edit}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="rounded-lg py-3 px-4 items-center bg-gray-100 dark:bg-slate-700 mr-2" onPress={() => toggleActiveMutation.mutate()}>
              {plan.isActive ? <Pause size={18} color={colors.icon} /> : <Play size={18} color={colors.brand} />}
            </TouchableOpacity>
            <TouchableOpacity className="rounded-lg py-3 px-4 items-center bg-red-50 dark:bg-red-900/25" onPress={handleDelete}>
              <Trash2 size={18} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        )
      }
    >
      {isEditing ? (
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.workouts.planName}</Text>
          <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={editName} onChangeText={setEditName} />

          <Text className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">{t.workouts.exercises}</Text>
          {editExercises.map((ex, i) => (
            <View key={i} className="bg-gray-50 dark:bg-slate-950 rounded-xl p-3 mb-3 border border-gray-100 dark:border-slate-700/40">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.workouts.exerciseName} {i + 1}</Text>
                <TouchableOpacity onPress={() => removeExercise(i)} hitSlop={8}>
                  <X size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
              <ExerciseNameInput value={ex.name} onChangeText={(v) => updateExercise(i, "name", v)} onBrowse={() => { setBrowseTargetIndex(i); setShowExercisePicker(true); }} />
              <View className="flex-row">
                <View className="flex-1 mr-2">
                  <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50" placeholder={t.workouts.sets} value={ex.sets} onChangeText={(v) => updateExercise(i, "sets", v)} keyboardType="numeric" />
                </View>
                <View className="flex-1 mr-2">
                  <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50" placeholder={t.workouts.reps} value={ex.reps} onChangeText={(v) => updateExercise(i, "reps", v)} />
                </View>
                <View className="flex-1">
                  <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50" placeholder={t.workouts.weight} value={ex.weight} onChangeText={(v) => updateExercise(i, "weight", v)} />
                </View>
              </View>
              <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 mt-2 text-sm text-gray-900 dark:text-slate-50" placeholder={t.workouts.formCues} value={ex.notes} onChangeText={(v) => updateExercise(i, "notes", v)} />
            </View>
          ))}
          <View className="flex-row mt-1">
            <TouchableOpacity className="flex-1 flex-row items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl py-2.5 mr-2" onPress={addExercise}>
              <Plus size={16} color={colors.icon} />
              <Text className="text-sm font-medium text-gray-500 dark:text-slate-400 ml-1">{t.workouts.addBlank}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 flex-row items-center justify-center border-2 border-dashed border-brand-300 dark:border-brand-700 rounded-xl py-2.5 bg-brand-50 dark:bg-brand-900/15" onPress={() => { setBrowseTargetIndex(editExercises.length); addExercise(); setShowExercisePicker(true); }}>
              <Search size={16} color={colors.brand} />
              <Text className="text-sm font-medium text-brand-600 dark:text-brand-400 ml-1">{t.workouts.fromLibrary}</Text>
            </TouchableOpacity>
          </View>
          <ExercisePickerSheet
            visible={showExercisePicker}
            onClose={() => setShowExercisePicker(false)}
            onSelect={(name) => { updateExercise(browseTargetIndex, "name", name); setShowExercisePicker(false); }}
          />
        </View>
      ) : (
        <View>
          {/* Status */}
          <View className="flex-row items-center mb-4">
            <View className={`px-2.5 py-1 rounded-full ${plan.isActive ? "bg-green-50 dark:bg-green-900/25" : "bg-gray-100 dark:bg-slate-700"}`}>
              <Text className={`text-xs font-medium ${plan.isActive ? "text-green-700 dark:text-green-300" : "text-gray-500 dark:text-slate-400"}`}>
                {plan.isActive ? t.clients.active : t.clients.inactive}
              </Text>
            </View>
            {plan.pausedAt && (
              <View className="px-2.5 py-1 rounded-full bg-yellow-50 dark:bg-amber-900/25 ml-2">
                <Text className="text-xs font-medium text-yellow-700 dark:text-amber-300">{t.clients.paused}</Text>
              </View>
            )}
            {plan.endDate && (
              <Text className="text-xs text-gray-400 dark:text-slate-500 ml-2">
                {new Date(plan.endDate).toLocaleDateString()}
              </Text>
            )}
          </View>

          {/* Exercise List */}
          <Text className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
            {t.workouts.exercises} ({exercises.length})
          </Text>
          {exercises.map((ex: any, i: number) => (
            <View key={ex.id || i} className="bg-gray-50 dark:bg-slate-950 rounded-xl px-4 py-3 mb-2 border border-gray-100 dark:border-slate-700/40">
              <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">{ex.name}</Text>
              <View className="flex-row mt-1">
                {ex.sets != null && <Text className="text-xs text-gray-500 dark:text-slate-400 mr-3">{ex.sets} {t.workouts.setsLabel}</Text>}
                {ex.reps && <Text className="text-xs text-gray-500 dark:text-slate-400 mr-3">{ex.reps} {t.workouts.repsLabel}</Text>}
                {ex.weight && <Text className="text-xs text-gray-500 dark:text-slate-400 mr-3">{ex.weight}</Text>}
                {ex.restSeconds != null && <Text className="text-xs text-gray-500 dark:text-slate-400">{ex.restSeconds}s {t.workouts.restLabel}</Text>}
              </View>
              {ex.notes && <Text className="text-xs text-gray-400 dark:text-slate-500 mt-1">{ex.notes}</Text>}
            </View>
          ))}
        </View>
      )}
    </AppBottomSheet>
  );
}

/* --- Meal Plan Detail / Edit Sheet --- */
function MealPlanDetailSheet({ visible, plan, clientId, onClose, onRefresh }: { visible: boolean; plan: any; clientId: string; onClose: () => void; onRefresh: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCalories, setEditCalories] = useState("");
  const [editProtein, setEditProtein] = useState("");
  const [editCarbs, setEditCarbs] = useState("");
  const [editFat, setEditFat] = useState("");

  useEffect(() => {
    if (plan) {
      const mp = plan.mealPlan;
      setEditName(plan.customName || mp?.name || "");
      setEditCalories(mp?.targetCalories?.toString() || "");
      setEditProtein(mp?.targetProtein?.toString() || "");
      setEditCarbs(mp?.targetCarbs?.toString() || "");
      setEditFat(mp?.targetFat?.toString() || "");
      setIsEditing(false);
    }
  }, [plan]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.put(`/api/clients/${clientId}/nutrition/${plan?.id}`, data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      setIsEditing(false);
      onRefresh();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () => api.put(`/api/clients/${clientId}/nutrition/${plan?.id}`, { isActive: !plan?.isActive }),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      onRefresh();
      onClose();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/clients/${clientId}/nutrition/${plan?.id}`),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      onRefresh();
      onClose();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  function handleSave() {
    saveMutation.mutate({
      customName: editName,
      targetCalories: editCalories ? parseInt(editCalories) : null,
      targetProtein: editProtein ? parseInt(editProtein) : null,
      targetCarbs: editCarbs ? parseInt(editCarbs) : null,
      targetFat: editFat ? parseInt(editFat) : null,
    });
  }

  function handleDelete() {
    Alert.alert(t.common.delete, t.workouts.deleteConfirm, [
      { text: t.common.cancel, style: "cancel" },
      { text: t.common.delete, style: "destructive", onPress: () => deleteMutation.mutate() },
    ]);
  }

  if (!plan) return null;

  const mp = plan.mealPlan;
  const meals = mp?.meals || [];

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["92%"]}
      title={plan.customName || mp?.name || t.nutrition.title}
      footer={
        isEditing ? (
          <View className="flex-row">
            <TouchableOpacity className="flex-1 rounded-lg py-3 items-center bg-gray-100 dark:bg-slate-700 mr-2" onPress={() => setIsEditing(false)}>
              <Text className="text-gray-700 dark:text-slate-200 font-semibold text-sm">{t.common.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity className={`flex-1 rounded-lg py-3 items-center ${saveMutation.isPending ? "bg-brand-400" : "bg-brand-600"}`} onPress={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-sm">{t.workouts.saveChanges}</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row">
            <TouchableOpacity className="flex-1 rounded-lg py-3 items-center bg-brand-600 mr-2" onPress={() => setIsEditing(true)}>
              <Text className="text-white font-semibold text-sm">{t.common.edit}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="rounded-lg py-3 px-4 items-center bg-gray-100 dark:bg-slate-700 mr-2" onPress={() => toggleActiveMutation.mutate()}>
              {plan.isActive ? <Pause size={18} color={colors.icon} /> : <Play size={18} color={colors.brand} />}
            </TouchableOpacity>
            <TouchableOpacity className="rounded-lg py-3 px-4 items-center bg-red-50 dark:bg-red-900/25" onPress={handleDelete}>
              <Trash2 size={18} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        )
      }
    >
      {isEditing ? (
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.workouts.planName}</Text>
          <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={editName} onChangeText={setEditName} />

          <Text className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">{t.nutrition.title}</Text>
          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t.nutrition.calories}</Text>
              <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50" value={editCalories} onChangeText={setEditCalories} keyboardType="numeric" placeholder={t.nutrition.kcal} />
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t.nutrition.protein}</Text>
              <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50" value={editProtein} onChangeText={setEditProtein} keyboardType="numeric" placeholder={t.nutrition.gram} />
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t.nutrition.carbs}</Text>
              <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50" value={editCarbs} onChangeText={setEditCarbs} keyboardType="numeric" placeholder={t.nutrition.gram} />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t.nutrition.fat}</Text>
              <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50" value={editFat} onChangeText={setEditFat} keyboardType="numeric" placeholder={t.nutrition.gram} />
            </View>
          </View>

          <Text className="text-xs text-gray-400 dark:text-slate-500">{t.nutrition.title}</Text>
        </View>
      ) : (
        <View>
          {/* Macro Targets */}
          {mp && (mp.targetCalories || mp.targetProtein || mp.targetCarbs || mp.targetFat) && (
            <View className="flex-row bg-gray-50 dark:bg-slate-950 rounded-xl p-3 mb-4 border border-gray-100 dark:border-slate-700/40">
              {mp.targetCalories != null && (
                <View className="flex-1 items-center">
                  <Text className="text-lg font-bold text-gray-900 dark:text-slate-50">{mp.targetCalories}</Text>
                  <Text className="text-[10px] text-gray-500 dark:text-slate-400">{t.nutrition.kcal}</Text>
                </View>
              )}
              {mp.targetProtein != null && (
                <View className="flex-1 items-center">
                  <Text className="text-lg font-bold text-blue-600 dark:text-blue-300">{mp.targetProtein}{t.nutrition.gram}</Text>
                  <Text className="text-[10px] text-gray-500 dark:text-slate-400">{t.nutrition.protein.toLowerCase()}</Text>
                </View>
              )}
              {mp.targetCarbs != null && (
                <View className="flex-1 items-center">
                  <Text className="text-lg font-bold text-amber-600 dark:text-amber-300">{mp.targetCarbs}{t.nutrition.gram}</Text>
                  <Text className="text-[10px] text-gray-500 dark:text-slate-400">{t.nutrition.carbs.toLowerCase()}</Text>
                </View>
              )}
              {mp.targetFat != null && (
                <View className="flex-1 items-center">
                  <Text className="text-lg font-bold text-red-500 dark:text-red-400">{mp.targetFat}{t.nutrition.gram}</Text>
                  <Text className="text-[10px] text-gray-500 dark:text-slate-400">{t.nutrition.fat.toLowerCase()}</Text>
                </View>
              )}
            </View>
          )}

          {/* Status */}
          <View className="flex-row items-center mb-4">
            <View className={`px-2.5 py-1 rounded-full ${plan.isActive ? "bg-green-50 dark:bg-green-900/25" : "bg-gray-100 dark:bg-slate-700"}`}>
              <Text className={`text-xs font-medium ${plan.isActive ? "text-green-700 dark:text-green-300" : "text-gray-500 dark:text-slate-400"}`}>
                {plan.isActive ? t.clients.active : t.clients.inactive}
              </Text>
            </View>
          </View>

          {/* Meals */}
          <Text className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
            {t.nutrition.meals} ({meals.length})
          </Text>
          {meals.map((meal: any, i: number) => (
            <View key={meal.id || i} className="bg-gray-50 dark:bg-slate-950 rounded-xl px-4 py-3 mb-2 border border-gray-100 dark:border-slate-700/40">
              <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">{meal.name}</Text>
              {meal.time && <Text className="text-xs text-gray-400 dark:text-slate-500">{meal.time}</Text>}
              {meal.foods?.map((food: any, fi: number) => (
                <View key={fi} className="flex-row items-center justify-between mt-1.5">
                  <Text className="text-xs text-gray-600 dark:text-slate-300 flex-1">{food.name}</Text>
                  <Text className="text-xs text-gray-400 dark:text-slate-500">
                    {food.calories ? `${Math.round(food.calories)} ${t.nutrition.kcal}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </AppBottomSheet>
  );
}

/* --- Exercise Name Input with Library Autocomplete --- */
function ExerciseNameInput({ value, onChangeText, onBrowse }: { value: string; onChangeText: (v: string) => void; onBrowse: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);
  const searchQuery = value.length >= 2 ? value : undefined;
  const { data: suggestions } = useExerciseLibrary(searchQuery);
  const showSuggestions = focused && value.length >= 2 && suggestions && suggestions.length > 0;

  return (
    <View>
      <View className="flex-row items-center">
        <View className="flex-1">
          <BottomSheetTextInput
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-slate-50"
            placeholder={t.exerciseLibrary.searchPlaceholder}
            placeholderTextColor={colors.textTertiary}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
          />
        </View>
        <TouchableOpacity onPress={onBrowse} className="ml-2 bg-brand-50 border border-brand-200 rounded-lg p-2.5">
          <Search size={16} color={colors.brand} />
        </TouchableOpacity>
      </View>
      {showSuggestions && (
        <View className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg mt-1 max-h-36 overflow-hidden">
          {suggestions.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item.id}
              className="px-3 py-2 border-b border-gray-50 dark:border-slate-700/40"
              onPress={() => { onChangeText(item.name); setFocused(false); }}
            >
              <Text className="text-sm text-gray-900 dark:text-slate-50">{item.name}</Text>
              {(item.category || item.muscleGroup) && (
                <Text className="text-[10px] text-gray-400 dark:text-slate-500">{[item.category, item.muscleGroup, item.equipment].filter(Boolean).join(" · ")}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

/* --- Filter Chip --- */
function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-2.5 py-1 rounded-full mr-1.5 mb-1.5 border ${active ? "bg-brand-600 border-brand-600" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"}`}
    >
      <Text className={`text-xs ${active ? "text-white font-medium" : "text-gray-600 dark:text-slate-300"}`}>{label}</Text>
    </TouchableOpacity>
  );
}

/* --- Exercise Picker Sheet with Filters --- */
function ExercisePickerSheet({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (name: string) => void }) {
  const t = useT();
  const colors = useThemeColors();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | undefined>();
  const [selectedEquipment, setSelectedEquipment] = useState<string | undefined>();

  const { data: categories } = useExerciseCategories();
  const { data: equipmentTypes } = useEquipmentTypes();
  const { data: exercises } = useExerciseLibrary(
    search.length >= 2 ? search : undefined,
    selectedCategory,
    { difficulty: selectedDifficulty, equipment: selectedEquipment }
  );

  const difficulties = ["Beginner", "Novice", "Intermediate", "Advanced", "Expert"];

  useEffect(() => {
    if (visible) {
      setSearch("");
      setSelectedCategory(undefined);
      setSelectedDifficulty(undefined);
      setSelectedEquipment(undefined);
    }
  }, [visible]);

  const hasFilters = selectedCategory || selectedDifficulty || selectedEquipment;

  const stickyHeader = (
    <>
      {/* Search */}
      <View className="flex-row items-center bg-gray-50 dark:bg-slate-950 rounded-lg px-3 mb-3">
        <Search size={16} color={colors.iconMuted} />
        <BottomSheetTextInput
          className="flex-1 py-2.5 px-2 text-sm text-gray-900 dark:text-slate-50"
          value={search}
          onChangeText={setSearch}
          placeholder={t.exerciseLibrary.searchPlaceholder}
          placeholderTextColor={colors.textTertiary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <X size={14} color={colors.iconMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filters */}
      {categories && categories.length > 0 && (
        <View className="mb-2">
          <Text className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">{t.exerciseLibrary.category}</Text>
          <GHScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            {categories.map((cat) => (
              <FilterChip
                key={cat.id}
                label={cat.name}
                active={selectedCategory === cat.name}
                onPress={() => setSelectedCategory(selectedCategory === cat.name ? undefined : cat.name)}
              />
            ))}
          </GHScrollView>
        </View>
      )}

      {/* Difficulty filters */}
      <View className="mb-2">
        <Text className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">{t.exerciseLibrary.difficulty}</Text>
        <GHScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
          {difficulties.map((d) => (
            <FilterChip
              key={d}
              label={d}
              active={selectedDifficulty === d}
              onPress={() => setSelectedDifficulty(selectedDifficulty === d ? undefined : d)}
            />
          ))}
        </GHScrollView>
      </View>

      {/* Equipment filters */}
      {equipmentTypes && equipmentTypes.length > 0 && (
        <View className="mb-2">
          <Text className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">{t.exerciseLibrary.equipment}</Text>
          <GHScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            {equipmentTypes.map((eq) => (
              <FilterChip
                key={eq.id}
                label={eq.name}
                active={selectedEquipment === eq.name}
                onPress={() => setSelectedEquipment(selectedEquipment === eq.name ? undefined : eq.name)}
              />
            ))}
          </GHScrollView>
        </View>
      )}

      {/* Clear filters */}
      {hasFilters && (
        <TouchableOpacity
          className="mb-2"
          onPress={() => { setSelectedCategory(undefined); setSelectedDifficulty(undefined); setSelectedEquipment(undefined); }}
        >
          <Text className="text-xs text-brand-600 font-medium">{t.common.clearFilters}</Text>
        </TouchableOpacity>
      )}

      <View className="border-t border-gray-100 dark:border-slate-700/40 pt-1">
        <Text className="text-[10px] text-gray-400 dark:text-slate-500">{exercises?.length ?? 0} {t.exerciseLibrary.exerciseCount}</Text>
      </View>
    </>
  );

  return (
    <AppBottomSheet visible={visible} onClose={onClose} snapPoints={["85%"]} title={t.exerciseLibrary.browseLibrary} stickyHeader={stickyHeader}>
      {(exercises || []).length === 0 ? (
        <View className="items-center py-10">
          <Text className="text-sm text-gray-400 dark:text-slate-500">{t.exerciseLibrary.noExercisesFound}</Text>
        </View>
      ) : (
        (exercises || []).slice(0, 50).map((item) => (
          <TouchableOpacity
            key={item.id}
            className="py-2.5 border-b border-gray-50 dark:border-slate-700/40"
            onPress={() => { onSelect(item.name); }}
            activeOpacity={0.6}
          >
            <Text className="text-sm text-gray-900 dark:text-slate-50">{item.name}</Text>
            <Text className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
              {[item.category, item.muscleGroup, item.equipment, item.difficulty].filter(Boolean).join(" · ")}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </AppBottomSheet>
  );
}

/* --- Create Custom Workout Sheet --- */
function CreateWorkoutSheet({ visible, clientId, onClose, onSuccess }: { visible: boolean; clientId: string; onClose: () => void; onSuccess: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<{ name: string; sets: string; reps: string; weight: string; restSeconds: string; notes: string }[]>([
    { name: "", sets: "", reps: "", weight: "", restSeconds: "", notes: "" },
  ]);

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [browseTargetIndex, setBrowseTargetIndex] = useState<number | null>(null);

  // AI generation state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiHasGenerated, setAiHasGenerated] = useState(false);
  const [aiRefinement, setAiRefinement] = useState("");
  const [aiRefinements, setAiRefinements] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setName("");
      setDescription("");
      setExercises([{ name: "", sets: "", reps: "", weight: "", restSeconds: "", notes: "" }]);
      setShowExercisePicker(false);
      setBrowseTargetIndex(null);
      setAiLoading(false);
      setAiError("");
      setAiHasGenerated(false);
      setAiRefinement("");
      setAiRefinements([]);
    }
  }, [visible]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post(`/api/clients/${clientId}/workouts`, data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      onSuccess();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  async function handleAiGenerate() {
    if (!description.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    try {
      const allRefinements = [...aiRefinements];
      if (aiRefinement.trim()) allRefinements.push(aiRefinement.trim());
      const fullPrompt = allRefinements.length > 0
        ? `${description.trim()}\n\nAdditional instructions:\n${allRefinements.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
        : description.trim();

      const res = await api.post<{
        name: string;
        description: string;
        exercises: Array<{ name: string; sets: number; reps: string; weight: string; restSeconds: number; notes: string }>;
      }>("/api/ai/generate-workout-plan", { prompt: fullPrompt, locale: "en", includeVideos: false });

      if (!name.trim()) setName(res.name);
      setExercises(
        res.exercises.map((ex) => ({
          name: ex.name,
          sets: ex.sets?.toString() || "3",
          reps: ex.reps || "8-12",
          weight: ex.weight || "",
          restSeconds: ex.restSeconds?.toString() || "60",
          notes: ex.notes || "",
        }))
      );
      if (aiRefinement.trim()) setAiRefinements((prev) => [...prev, aiRefinement.trim()]);
      setAiHasGenerated(true);
      setAiRefinement("");
      haptics.success();
    } catch (e: any) {
      setAiError(e.message || t.workouts.aiError);
    } finally {
      setAiLoading(false);
    }
  }

  function handleSubmit() {
    if (!name.trim()) return Alert.alert(t.common.required, t.workouts.planName);
    const validExercises = exercises.filter((ex) => ex.name.trim());
    if (validExercises.length === 0) return Alert.alert(t.common.required, t.workouts.exercises);

    mutation.mutate({
      name: name.trim(),
      mode: "solo",
      exercises: validExercises.map((ex, i) => ({
        name: ex.name,
        sets: ex.sets ? parseInt(ex.sets) : null,
        reps: ex.reps || null,
        weight: ex.weight || null,
        restSeconds: ex.restSeconds ? parseInt(ex.restSeconds) : null,
        notes: ex.notes || null,
        orderIndex: i,
      })),
    });
  }

  function addExercise() {
    setExercises([...exercises, { name: "", sets: "", reps: "", weight: "", restSeconds: "", notes: "" }]);
  }

  function updateExercise(index: number, field: string, value: string) {
    setExercises(exercises.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  }

  function removeExercise(index: number) {
    if (exercises.length <= 1) return;
    setExercises(exercises.filter((_, i) => i !== index));
  }

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["92%"]}
      title={t.workouts.createCustomPlan}
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{t.workouts.createPlan}</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.workouts.planName} *</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-3 text-base text-gray-900 dark:text-slate-50"
        value={name}
        onChangeText={setName}
        placeholder={t.workouts.planNamePlaceholder}
        placeholderTextColor={colors.textTertiary}
      />

      {/* AI Generation */}
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.description}</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 mb-2 text-sm text-gray-900 dark:text-slate-50"
        value={description}
        onChangeText={setDescription}
        placeholder={t.workouts.aiPromptPlaceholder}
        placeholderTextColor={colors.textTertiary}
        multiline
      />
      <View className="flex-row items-center mb-3">
        <TouchableOpacity
          className={`flex-row items-center rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/25 px-3 py-2 ${!description.trim() || aiLoading ? "opacity-50" : ""}`}
          onPress={handleAiGenerate}
          disabled={!description.trim() || aiLoading}
          activeOpacity={0.7}
        >
          {aiLoading ? <ActivityIndicator size="small" color={colors.brand} /> : <Sparkles size={14} color={colors.brand} />}
          <Text className="text-xs font-medium text-emerald-700 dark:text-emerald-300 ml-1.5">
            {aiLoading ? t.workouts.generating : aiHasGenerated ? t.workouts.regenerateWithAI : t.workouts.generateWithAI}
          </Text>
        </TouchableOpacity>
      </View>
      {aiError ? <Text className="text-xs text-red-500 mb-2">{aiError}</Text> : null}
      {aiHasGenerated && (
        <View className="mb-3">
          <BottomSheetTextInput
            className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-slate-200"
            value={aiRefinement}
            onChangeText={setAiRefinement}
            placeholder={t.workouts.refinePromptPlaceholder}
            placeholderTextColor={colors.textTertiary}
            returnKeyType="go"
            onSubmitEditing={handleAiGenerate}
          />
          {aiRefinements.length > 0 && (
            <View className="flex-row flex-wrap mt-1.5">
              {aiRefinements.map((r, i) => (
                <View key={i} className="flex-row items-center bg-gray-100 dark:bg-slate-700 rounded-md px-2 py-1 mr-1 mb-1">
                  <Text className="text-[10px] text-gray-600 dark:text-slate-300 mr-1">{r}</Text>
                  <TouchableOpacity onPress={() => setAiRefinements((prev) => prev.filter((_, j) => j !== i))}>
                    <X size={10} color={colors.iconMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <Text className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">{t.workouts.exercises}</Text>
      {exercises.map((ex, i) => (
        <View key={i} className="bg-gray-50 dark:bg-slate-950 rounded-xl p-3 mb-3 border border-gray-100 dark:border-slate-700/40">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.workouts.exerciseName} {i + 1}</Text>
            {exercises.length > 1 && (
              <TouchableOpacity onPress={() => removeExercise(i)} hitSlop={8}>
                <X size={16} color={colors.destructive} />
              </TouchableOpacity>
            )}
          </View>
          <ExerciseNameInput value={ex.name} onChangeText={(v) => updateExercise(i, "name", v)} onBrowse={() => { setBrowseTargetIndex(i); setShowExercisePicker(true); }} />
          <View className="flex-row mt-2">
            <View className="flex-1 mr-2">
              <Text className="text-[10px] text-gray-500 dark:text-slate-400 mb-0.5">{t.workouts.sets}</Text>
              <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50 text-center" placeholder="3" placeholderTextColor={colors.textTertiary} value={ex.sets} onChangeText={(v) => updateExercise(i, "sets", v)} keyboardType="numeric" />
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-[10px] text-gray-500 dark:text-slate-400 mb-0.5">{t.workouts.reps}</Text>
              <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50 text-center" placeholder="8-12" placeholderTextColor={colors.textTertiary} value={ex.reps} onChangeText={(v) => updateExercise(i, "reps", v)} />
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-[10px] text-gray-500 dark:text-slate-400 mb-0.5">{t.workouts.weight}</Text>
              <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50 text-center" placeholder="kg" placeholderTextColor={colors.textTertiary} value={ex.weight} onChangeText={(v) => updateExercise(i, "weight", v)} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] text-gray-500 dark:text-slate-400 mb-0.5">{t.workouts.restSec}</Text>
              <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50 text-center" placeholder="60" placeholderTextColor={colors.textTertiary} value={ex.restSeconds} onChangeText={(v) => updateExercise(i, "restSeconds", v)} keyboardType="numeric" />
            </View>
          </View>
          <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 mt-2 text-sm text-gray-900 dark:text-slate-50" placeholder={t.workouts.formCues} placeholderTextColor={colors.textTertiary} value={ex.notes} onChangeText={(v) => updateExercise(i, "notes", v)} />
        </View>
      ))}
      <View className="flex-row mb-4">
        <TouchableOpacity className="flex-1 flex-row items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl py-2.5 mr-2" onPress={addExercise}>
          <Plus size={16} color={colors.icon} />
          <Text className="text-sm font-medium text-gray-500 dark:text-slate-400 ml-1">{t.workouts.addBlank}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 flex-row items-center justify-center border-2 border-dashed border-brand-300 rounded-xl py-2.5" onPress={() => { setBrowseTargetIndex(null); setShowExercisePicker(true); }}>
          <Search size={16} color={colors.brand} />
          <Text className="text-sm font-medium text-brand-600 ml-1">{t.workouts.fromLibrary}</Text>
        </TouchableOpacity>
      </View>

      <ExercisePickerSheet
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelect={(selectedName) => {
          if (browseTargetIndex !== null) {
            updateExercise(browseTargetIndex, "name", selectedName);
          } else {
            setExercises((prev) => [...prev, { name: selectedName, sets: "", reps: "", weight: "", restSeconds: "", notes: "" }]);
          }
          setShowExercisePicker(false);
        }}
      />
    </AppBottomSheet>
  );
}

/* --- Create Custom Meal Plan Sheet --- */
function CreateMealPlanSheet({ visible, clientId, onClose, onSuccess }: { visible: boolean; clientId: string; onClose: () => void; onSuccess: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [meals, setMeals] = useState<{ name: string; time: string }[]>([
    { name: "Breakfast", time: "" },
    { name: "Lunch", time: "" },
    { name: "Dinner", time: "" },
  ]);

  useEffect(() => {
    if (visible) {
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setMeals([
        { name: "Breakfast", time: "" },
        { name: "Lunch", time: "" },
        { name: "Dinner", time: "" },
      ]);
    }
  }, [visible]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post(`/api/clients/${clientId}/nutrition`, data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      onSuccess();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
  });

  function handleSubmit() {
    if (!name.trim()) return Alert.alert(t.common.required, t.workouts.planName);
    mutation.mutate({
      name: name.trim(),
      targetCalories: calories ? parseInt(calories) : null,
      targetProtein: protein ? parseInt(protein) : null,
      targetCarbs: carbs ? parseInt(carbs) : null,
      targetFat: fat ? parseInt(fat) : null,
      meals: meals.filter((m) => m.name.trim()).map((m, i) => ({
        name: m.name,
        time: m.time || null,
        orderIndex: i,
        foods: [],
      })),
    });
  }

  function addMeal() {
    setMeals([...meals, { name: "", time: "" }]);
  }

  function updateMeal(index: number, field: string, value: string) {
    setMeals(meals.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

  function removeMeal(index: number) {
    if (meals.length <= 1) return;
    setMeals(meals.filter((_, i) => i !== index));
  }

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["92%"]}
      title={t.nutrition.createMealPlan}
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{t.nutrition.createPlan}</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.nutrition.planName} *</Text>
      <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={name} onChangeText={setName} placeholder={t.nutrition.planNamePlaceholder} />

      <Text className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">{t.nutrition.title}</Text>
      <View className="flex-row mb-4">
        <View className="flex-1 mr-2">
          <Text className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t.nutrition.calories}</Text>
          <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50" value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder={t.nutrition.kcal} />
        </View>
        <View className="flex-1 mr-2">
          <Text className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t.nutrition.protein}</Text>
          <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50" value={protein} onChangeText={setProtein} keyboardType="numeric" placeholder={t.nutrition.gram} />
        </View>
        <View className="flex-1 mr-2">
          <Text className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t.nutrition.carbs}</Text>
          <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50" value={carbs} onChangeText={setCarbs} keyboardType="numeric" placeholder={t.nutrition.gram} />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 dark:text-slate-400 mb-1">{t.nutrition.fat}</Text>
          <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50" value={fat} onChangeText={setFat} keyboardType="numeric" placeholder={t.nutrition.gram} />
        </View>
      </View>

      <Text className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">{t.nutrition.meals}</Text>
      {meals.map((meal, i) => (
        <View key={i} className="bg-gray-50 dark:bg-slate-950 rounded-xl p-3 mb-3 border border-gray-100 dark:border-slate-700/40">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-medium text-gray-500 dark:text-slate-400">{t.nutrition.mealName} {i + 1}</Text>
            {meals.length > 1 && (
              <TouchableOpacity onPress={() => removeMeal(i)} hitSlop={8}>
                <X size={16} color={colors.destructive} />
              </TouchableOpacity>
            )}
          </View>
          <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 mb-2 text-sm text-gray-900 dark:text-slate-50" placeholder={`${t.nutrition.mealName} *`} value={meal.name} onChangeText={(v) => updateMeal(i, "name", v)} />
          <BottomSheetTextInput className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-slate-50" placeholder={`${t.common.optional}`} value={meal.time} onChangeText={(v) => updateMeal(i, "time", v)} />
        </View>
      ))}
      <TouchableOpacity className="flex-row items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl py-2.5 mb-4" onPress={addMeal}>
        <Plus size={16} color={colors.icon} />
        <Text className="text-sm font-medium text-gray-500 dark:text-slate-400 ml-1">{t.nutrition.addMeal}</Text>
      </TouchableOpacity>

      <Text className="text-xs text-gray-400 dark:text-slate-500 mb-2">{t.nutrition.title}</Text>
    </AppBottomSheet>
  );
}
