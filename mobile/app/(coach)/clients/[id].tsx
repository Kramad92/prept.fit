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
} from "lucide-react-native";
import { useClientDetail, useWorkoutPlans, useMealPlans, useHabitTemplates } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { AppBottomSheet, BottomSheetTextInput } from "@/components/app-bottom-sheet";

type Tab = "overview" | "workouts" | "nutrition" | "progress";

export default function ClientDetailScreen() {
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
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <Header />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !client) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <Header />
        <QueryError message="Failed to load client" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const isActive = client.status === "ACTIVE" || client.status === "active";
  const latestWeight = client.measurements?.[0]?.weight;
  const activePlans = client.assignedPlans?.filter((p) => p.isActive).length || 0;
  const activeMealPlans = client.assignedMealPlans?.filter((p) => p.isActive).length || 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Header title={client.name} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#059669"
          />
        }
      >
        {/* Profile Header */}
        <View className="bg-white px-4 py-5 border-b border-gray-100">
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-brand-50 items-center justify-center mr-4">
              <Text className="text-brand-700 font-bold text-xl">
                {client.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-xl font-bold text-gray-900 mr-2">
                  {client.name}
                </Text>
                <View
                  className={`px-2 py-0.5 rounded-full ${
                    isActive ? "bg-green-50" : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      isActive ? "text-green-700" : "text-gray-500"
                    }`}
                  >
                    {client.status}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center mt-1">
                {client.email && (
                  <View className="flex-row items-center mr-4">
                    <Mail size={12} color="#9ca3af" />
                    <Text className="text-xs text-gray-500 ml-1">
                      {client.email}
                    </Text>
                  </View>
                )}
                {client.phone && (
                  <View className="flex-row items-center">
                    <Phone size={12} color="#9ca3af" />
                    <Text className="text-xs text-gray-500 ml-1">
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
              onPress={() => router.push(`/(coach)/messages/${id}` as never)}
              activeOpacity={0.7}
            >
              <MessageCircle size={16} color="#fff" />
              <Text className="text-white font-semibold text-sm ml-2">Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center justify-center bg-white border border-gray-200 rounded-lg py-2.5 px-4"
              onPress={() => setShowEditClient(true)}
              activeOpacity={0.7}
            >
              <Edit3 size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Bar */}
        <View className="flex-row bg-white border-b border-gray-100">
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
                    activeTab === tab ? "text-brand-600" : "text-gray-500"
                  }`}
                >
                  {tab}
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
  return (
    <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
      <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
        <ArrowLeft size={22} color="#111827" />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-gray-900" numberOfLines={1}>
        {title || "Client"}
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
  return (
    <View>
      {/* Quick Stats */}
      <View className="flex-row flex-wrap -mx-1.5 mb-4">
        <View className="w-1/3 px-1.5 mb-3">
          <View className="bg-white rounded-xl border border-gray-100 p-3 items-center">
            <Dumbbell size={16} color="#059669" />
            <Text className="text-lg font-bold text-gray-900 mt-1">
              {activePlans}
            </Text>
            <Text className="text-[10px] text-gray-500">Plans</Text>
          </View>
        </View>
        <View className="w-1/3 px-1.5 mb-3">
          <View className="bg-white rounded-xl border border-gray-100 p-3 items-center">
            <UtensilsCrossed size={16} color="#059669" />
            <Text className="text-lg font-bold text-gray-900 mt-1">
              {activeMealPlans}
            </Text>
            <Text className="text-[10px] text-gray-500">Meal Plans</Text>
          </View>
        </View>
        <View className="w-1/3 px-1.5 mb-3">
          <View className="bg-white rounded-xl border border-gray-100 p-3 items-center">
            <Ruler size={16} color="#059669" />
            <Text className="text-lg font-bold text-gray-900 mt-1">
              {latestWeight != null ? `${latestWeight}` : "—"}
            </Text>
            <Text className="text-[10px] text-gray-500">Weight (kg)</Text>
          </View>
        </View>
      </View>

      {/* Details */}
      {client.height != null && (
        <InfoRow icon={Ruler} label="Height" value={`${client.height} cm`} />
      )}
      {client.goals && (
        <InfoRow icon={Target} label="Goals" value={client.goals} />
      )}
      {client.injuries && (
        <InfoRow icon={AlertCircle} label="Injuries" value={client.injuries} />
      )}
      {client.fitnessLevel && (
        <InfoRow
          icon={Dumbbell}
          label="Fitness Level"
          value={client.fitnessLevel}
        />
      )}
      {client.notes && (
        <InfoRow icon={Target} label="Notes" value={client.notes} />
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
  return (
    <View className="bg-white rounded-xl border border-gray-100 px-4 py-3 mb-3">
      <View className="flex-row items-center mb-1">
        <Icon size={14} color="#9ca3af" />
        <Text className="text-xs font-medium text-gray-500 ml-1.5">
          {label}
        </Text>
      </View>
      <Text className="text-sm text-gray-900">{value}</Text>
    </View>
  );
}

function WorkoutsTab({ plans, onAssign, onOpen, onCreate }: { plans: any[]; onAssign: () => void; onOpen: (plan: any) => void; onCreate: () => void }) {
  return (
    <View>
      <View className="flex-row mb-3">
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center border-2 border-dashed border-brand-300 rounded-xl py-2.5 mr-2"
          onPress={onAssign}
          activeOpacity={0.6}
        >
          <Plus size={16} color="#059669" />
          <Text className="text-sm font-medium text-brand-600 ml-1">Assign</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center bg-brand-600 rounded-xl py-2.5"
          onPress={onCreate}
          activeOpacity={0.6}
        >
          <Plus size={16} color="#fff" />
          <Text className="text-sm font-medium text-white ml-1">Create Custom</Text>
        </TouchableOpacity>
      </View>
      {plans.length === 0 ? (
        <View className="items-center py-8">
          <Dumbbell size={36} color="#d1d5db" />
          <Text className="text-gray-400 text-sm mt-2">No plans assigned yet</Text>
        </View>
      ) : null}
      {plans.map((p) => (
        <TouchableOpacity
          key={p.id}
          className="bg-white rounded-xl border border-gray-100 p-4 mb-3"
          onPress={() => onOpen(p)}
          activeOpacity={0.6}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-base font-medium text-gray-900 flex-1" numberOfLines={1}>
              {p.customName || p.workoutPlan?.name || "Workout Plan"}
            </Text>
            <View className="flex-row items-center">
              <View
                className={`px-2 py-0.5 rounded-full mr-2 ${
                  p.isActive ? "bg-green-50" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-[10px] font-medium ${
                    p.isActive ? "text-green-700" : "text-gray-500"
                  }`}
                >
                  {p.isActive ? "Active" : "Inactive"}
                </Text>
              </View>
              <ChevronRight size={16} color="#9ca3af" />
            </View>
          </View>
          {p.workoutPlan?.exercises && (
            <Text className="text-xs text-gray-500">
              {p.workoutPlan.exercises.length} exercises
            </Text>
          )}
          {p.endDate && (
            <Text className="text-xs text-gray-400 mt-1">
              Ends {new Date(p.endDate).toLocaleDateString()}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function NutritionTab({ plans, onAssign, onOpen, onCreate }: { plans: any[]; onAssign: () => void; onOpen: (plan: any) => void; onCreate: () => void }) {
  return (
    <View>
      <View className="flex-row mb-3">
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center border-2 border-dashed border-brand-300 rounded-xl py-2.5 mr-2"
          onPress={onAssign}
          activeOpacity={0.6}
        >
          <Plus size={16} color="#059669" />
          <Text className="text-sm font-medium text-brand-600 ml-1">Assign</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center bg-brand-600 rounded-xl py-2.5"
          onPress={onCreate}
          activeOpacity={0.6}
        >
          <Plus size={16} color="#fff" />
          <Text className="text-sm font-medium text-white ml-1">Create Custom</Text>
        </TouchableOpacity>
      </View>
      {plans.length === 0 ? (
        <View className="items-center py-8">
          <UtensilsCrossed size={36} color="#d1d5db" />
          <Text className="text-gray-400 text-sm mt-2">No plans assigned yet</Text>
        </View>
      ) : null}
      {plans.map((p) => {
        const mp = p.mealPlan;
        return (
          <TouchableOpacity
            key={p.id}
            className="bg-white rounded-xl border border-gray-100 p-4 mb-3"
            onPress={() => onOpen(p)}
            activeOpacity={0.6}
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-base font-medium text-gray-900 flex-1" numberOfLines={1}>
                {p.customName || mp?.name || "Meal Plan"}
              </Text>
              <View className="flex-row items-center">
                <View
                  className={`px-2 py-0.5 rounded-full mr-2 ${
                    p.isActive ? "bg-green-50" : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-medium ${
                      p.isActive ? "text-green-700" : "text-gray-500"
                    }`}
                  >
                    {p.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
                <ChevronRight size={16} color="#9ca3af" />
              </View>
            </View>
            {mp && (
              <View className="flex-row flex-wrap mt-1">
                {mp.targetCalories != null && (
                  <Text className="text-xs text-gray-500 mr-3">
                    {mp.targetCalories} cal
                  </Text>
                )}
                {mp.targetProtein != null && (
                  <Text className="text-xs text-gray-500 mr-3">
                    P: {mp.targetProtein}g
                  </Text>
                )}
                {mp.targetCarbs != null && (
                  <Text className="text-xs text-gray-500 mr-3">
                    C: {mp.targetCarbs}g
                  </Text>
                )}
                {mp.targetFat != null && (
                  <Text className="text-xs text-gray-500">
                    F: {mp.targetFat}g
                  </Text>
                )}
              </View>
            )}
            {mp?.meals && (
              <Text className="text-xs text-gray-400 mt-1">
                {mp.meals.length} meals
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
  return (
    <View>
      {/* Photos */}
      <Text className="text-sm font-semibold text-gray-700 mb-2">
        Progress Photos ({photos.length})
      </Text>
      {photos.length === 0 ? (
        <View className="bg-white rounded-xl border border-gray-100 p-6 items-center mb-4">
          <Camera size={28} color="#d1d5db" />
          <Text className="text-gray-400 text-xs mt-1">No photos yet</Text>
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
              className="w-24 h-24 rounded-lg overflow-hidden mr-2 bg-gray-100"
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
      <Text className="text-sm font-semibold text-gray-700 mb-2">
        Measurements ({measurements.length})
      </Text>
      {measurements.length === 0 ? (
        <View className="bg-white rounded-xl border border-gray-100 p-6 items-center">
          <Ruler size={28} color="#d1d5db" />
          <Text className="text-gray-400 text-xs mt-1">
            No measurements yet
          </Text>
        </View>
      ) : (
        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {measurements.slice(0, 5).map((m, i) => (
            <View
              key={m.id}
              className={`px-4 py-3 ${
                i < Math.min(measurements.length, 5) - 1
                  ? "border-b border-gray-50"
                  : ""
              }`}
            >
              <Text className="text-xs text-gray-500 mb-1">
                {new Date(m.date).toLocaleDateString()}
              </Text>
              <View className="flex-row flex-wrap">
                {m.weight != null && (
                  <Text className="text-sm text-gray-900 mr-4">
                    Weight: {m.weight}kg
                  </Text>
                )}
                {m.bodyFat != null && (
                  <Text className="text-sm text-gray-900 mr-4">
                    BF: {m.bodyFat}%
                  </Text>
                )}
                {m.chest != null && (
                  <Text className="text-sm text-gray-900 mr-4">
                    Chest: {m.chest}
                  </Text>
                )}
                {m.waist != null && (
                  <Text className="text-sm text-gray-900 mr-4">
                    Waist: {m.waist}
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
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["92%"]}
      title="Edit Client"
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => {
            if (!name.trim()) return Alert.alert("Required", "Name is required");
            mutation.mutate({ name: name.trim(), email: email.trim() || null, phone: phone.trim() || null, goals: goals.trim() || null, notes: notes.trim() || null, status });
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Save Changes</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 mb-1">Name *</Text>
      <BottomSheetTextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={name} onChangeText={setName} />
      <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
      <BottomSheetTextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Text className="text-sm font-medium text-gray-700 mb-1">Phone</Text>
      <BottomSheetTextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Text className="text-sm font-medium text-gray-700 mb-1">Goals</Text>
      <BottomSheetTextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={goals} onChangeText={setGoals} multiline />
      <Text className="text-sm font-medium text-gray-700 mb-1">Notes</Text>
      <BottomSheetTextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={notes} onChangeText={setNotes} multiline />
      <Text className="text-sm font-medium text-gray-700 mb-1">Status</Text>
      <View className="flex-row">
        {["active", "paused", "archived"].map((s) => (
          <TouchableOpacity key={s} className={`mr-2 px-3 py-1.5 rounded-full ${status === s ? "bg-brand-600" : "bg-white border border-gray-200"}`} onPress={() => setStatus(s)}>
            <Text className={`text-xs font-medium capitalize ${status === s ? "text-white" : "text-gray-600"}`}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </AppBottomSheet>
  );
}

function AssignWorkoutModal({ visible, clientId, onClose, onSuccess }: { visible: boolean; clientId: string; onClose: () => void; onSuccess: () => void }) {
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
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={() => { setSelectedId(""); onClose(); }}
      title="Assign Workout Plan"
      footer={selectedId ? (
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => mutation.mutate({ clientId, workoutPlanId: selectedId })}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Assign Plan</Text>}
        </TouchableOpacity>
      ) : undefined}
    >
      {(plans || []).length === 0 ? (
        <View className="items-center py-12"><Text className="text-sm text-gray-400">No plans to assign. Create one first.</Text></View>
      ) : (plans || []).map((p) => (
        <TouchableOpacity key={p.id} className={`bg-white rounded-xl border px-4 py-3 mb-2 ${selectedId === p.id ? "border-brand-600 bg-brand-50" : "border-gray-100"}`} onPress={() => setSelectedId(p.id)}>
          <Text className="text-sm font-medium text-gray-900">{p.name}</Text>
          <Text className="text-xs text-gray-500">{p.exerciseCount} exercises</Text>
        </TouchableOpacity>
      ))}
    </AppBottomSheet>
  );
}

function AssignMealModal({ visible, clientId, onClose, onSuccess }: { visible: boolean; clientId: string; onClose: () => void; onSuccess: () => void }) {
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
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={() => { setSelectedId(""); onClose(); }}
      title="Assign Meal Plan"
      footer={selectedId ? (
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => mutation.mutate({ clientId, mealPlanId: selectedId })}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Assign Plan</Text>}
        </TouchableOpacity>
      ) : undefined}
    >
      {(plans || []).length === 0 ? (
        <View className="items-center py-12"><Text className="text-sm text-gray-400">No plans to assign. Create one first.</Text></View>
      ) : (plans || []).map((p) => (
        <TouchableOpacity key={p.id} className={`bg-white rounded-xl border px-4 py-3 mb-2 ${selectedId === p.id ? "border-brand-600 bg-brand-50" : "border-gray-100"}`} onPress={() => setSelectedId(p.id)}>
          <Text className="text-sm font-medium text-gray-900">{p.name}</Text>
          <Text className="text-xs text-gray-500">{p.mealCount} meals{p.targetCalories ? ` · ${p.targetCalories} kcal` : ""}</Text>
        </TouchableOpacity>
      ))}
    </AppBottomSheet>
  );
}

/* ─── Workout Plan Detail / Edit Sheet ─── */
function WorkoutPlanDetailSheet({ visible, plan, clientId, onClose, onRefresh }: { visible: boolean; plan: any; clientId: string; onClose: () => void; onRefresh: () => void }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editExercises, setEditExercises] = useState<{ name: string; sets: string; reps: string; weight: string; restSeconds: string; notes: string }[]>([]);

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
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () => api.put(`/api/clients/${clientId}/workouts/${plan?.id}`, { isActive: !plan?.isActive }),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      onRefresh();
      onClose();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/clients/${clientId}/workouts/${plan?.id}`),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      onRefresh();
      onClose();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
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
    Alert.alert("Delete Plan", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
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
      title={plan.customName || plan.workoutPlan?.name || "Workout Plan"}
      footer={
        isEditing ? (
          <View className="flex-row">
            <TouchableOpacity className="flex-1 rounded-lg py-3 items-center bg-gray-100 mr-2" onPress={() => setIsEditing(false)}>
              <Text className="text-gray-700 font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity className={`flex-1 rounded-lg py-3 items-center ${saveMutation.isPending ? "bg-brand-400" : "bg-brand-600"}`} onPress={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-sm">Save Changes</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row">
            <TouchableOpacity className="flex-1 rounded-lg py-3 items-center bg-brand-600 mr-2" onPress={() => setIsEditing(true)}>
              <Text className="text-white font-semibold text-sm">Edit Plan</Text>
            </TouchableOpacity>
            <TouchableOpacity className="rounded-lg py-3 px-4 items-center bg-gray-100 mr-2" onPress={() => toggleActiveMutation.mutate()}>
              {plan.isActive ? <Pause size={18} color="#6b7280" /> : <Play size={18} color="#059669" />}
            </TouchableOpacity>
            <TouchableOpacity className="rounded-lg py-3 px-4 items-center bg-red-50" onPress={handleDelete}>
              <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )
      }
    >
      {isEditing ? (
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Plan Name</Text>
          <BottomSheetTextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={editName} onChangeText={setEditName} />

          <Text className="text-sm font-semibold text-gray-700 mb-2">Exercises</Text>
          {editExercises.map((ex, i) => (
            <View key={i} className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-medium text-gray-500">Exercise {i + 1}</Text>
                <TouchableOpacity onPress={() => removeExercise(i)} hitSlop={8}>
                  <X size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
              <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 mb-2 text-sm text-gray-900" placeholder="Exercise name" value={ex.name} onChangeText={(v) => updateExercise(i, "name", v)} />
              <View className="flex-row">
                <View className="flex-1 mr-2">
                  <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" placeholder="Sets" value={ex.sets} onChangeText={(v) => updateExercise(i, "sets", v)} keyboardType="numeric" />
                </View>
                <View className="flex-1 mr-2">
                  <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" placeholder="Reps" value={ex.reps} onChangeText={(v) => updateExercise(i, "reps", v)} />
                </View>
                <View className="flex-1">
                  <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" placeholder="Weight" value={ex.weight} onChangeText={(v) => updateExercise(i, "weight", v)} />
                </View>
              </View>
              <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 mt-2 text-sm text-gray-900" placeholder="Notes (optional)" value={ex.notes} onChangeText={(v) => updateExercise(i, "notes", v)} />
            </View>
          ))}
          <TouchableOpacity className="flex-row items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-2.5" onPress={addExercise}>
            <Plus size={16} color="#6b7280" />
            <Text className="text-sm font-medium text-gray-500 ml-1">Add Exercise</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {/* Status */}
          <View className="flex-row items-center mb-4">
            <View className={`px-2.5 py-1 rounded-full ${plan.isActive ? "bg-green-50" : "bg-gray-100"}`}>
              <Text className={`text-xs font-medium ${plan.isActive ? "text-green-700" : "text-gray-500"}`}>
                {plan.isActive ? "Active" : "Inactive"}
              </Text>
            </View>
            {plan.pausedAt && (
              <View className="px-2.5 py-1 rounded-full bg-yellow-50 ml-2">
                <Text className="text-xs font-medium text-yellow-700">Paused</Text>
              </View>
            )}
            {plan.endDate && (
              <Text className="text-xs text-gray-400 ml-2">
                Ends {new Date(plan.endDate).toLocaleDateString()}
              </Text>
            )}
          </View>

          {/* Exercise List */}
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Exercises ({exercises.length})
          </Text>
          {exercises.map((ex: any, i: number) => (
            <View key={ex.id || i} className="bg-gray-50 rounded-xl px-4 py-3 mb-2 border border-gray-100">
              <Text className="text-sm font-medium text-gray-900">{ex.name}</Text>
              <View className="flex-row mt-1">
                {ex.sets != null && <Text className="text-xs text-gray-500 mr-3">{ex.sets} sets</Text>}
                {ex.reps && <Text className="text-xs text-gray-500 mr-3">{ex.reps} reps</Text>}
                {ex.weight && <Text className="text-xs text-gray-500 mr-3">{ex.weight}</Text>}
                {ex.restSeconds != null && <Text className="text-xs text-gray-500">{ex.restSeconds}s rest</Text>}
              </View>
              {ex.notes && <Text className="text-xs text-gray-400 mt-1">{ex.notes}</Text>}
            </View>
          ))}
        </View>
      )}
    </AppBottomSheet>
  );
}

/* ─── Meal Plan Detail / Edit Sheet ─── */
function MealPlanDetailSheet({ visible, plan, clientId, onClose, onRefresh }: { visible: boolean; plan: any; clientId: string; onClose: () => void; onRefresh: () => void }) {
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
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () => api.put(`/api/clients/${clientId}/nutrition/${plan?.id}`, { isActive: !plan?.isActive }),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      onRefresh();
      onClose();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/clients/${clientId}/nutrition/${plan?.id}`),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      onRefresh();
      onClose();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
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
    Alert.alert("Delete Meal Plan", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
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
      title={plan.customName || mp?.name || "Meal Plan"}
      footer={
        isEditing ? (
          <View className="flex-row">
            <TouchableOpacity className="flex-1 rounded-lg py-3 items-center bg-gray-100 mr-2" onPress={() => setIsEditing(false)}>
              <Text className="text-gray-700 font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity className={`flex-1 rounded-lg py-3 items-center ${saveMutation.isPending ? "bg-brand-400" : "bg-brand-600"}`} onPress={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-sm">Save Changes</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row">
            <TouchableOpacity className="flex-1 rounded-lg py-3 items-center bg-brand-600 mr-2" onPress={() => setIsEditing(true)}>
              <Text className="text-white font-semibold text-sm">Edit Plan</Text>
            </TouchableOpacity>
            <TouchableOpacity className="rounded-lg py-3 px-4 items-center bg-gray-100 mr-2" onPress={() => toggleActiveMutation.mutate()}>
              {plan.isActive ? <Pause size={18} color="#6b7280" /> : <Play size={18} color="#059669" />}
            </TouchableOpacity>
            <TouchableOpacity className="rounded-lg py-3 px-4 items-center bg-red-50" onPress={handleDelete}>
              <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )
      }
    >
      {isEditing ? (
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Plan Name</Text>
          <BottomSheetTextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={editName} onChangeText={setEditName} />

          <Text className="text-sm font-semibold text-gray-700 mb-2">Nutrition Targets</Text>
          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-gray-500 mb-1">Calories</Text>
              <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" value={editCalories} onChangeText={setEditCalories} keyboardType="numeric" placeholder="kcal" />
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-xs text-gray-500 mb-1">Protein</Text>
              <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" value={editProtein} onChangeText={setEditProtein} keyboardType="numeric" placeholder="g" />
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-xs text-gray-500 mb-1">Carbs</Text>
              <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" value={editCarbs} onChangeText={setEditCarbs} keyboardType="numeric" placeholder="g" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Fat</Text>
              <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" value={editFat} onChangeText={setEditFat} keyboardType="numeric" placeholder="g" />
            </View>
          </View>

          <Text className="text-xs text-gray-400">Meal editing is available on the web app for now.</Text>
        </View>
      ) : (
        <View>
          {/* Macro Targets */}
          {mp && (mp.targetCalories || mp.targetProtein || mp.targetCarbs || mp.targetFat) && (
            <View className="flex-row bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100">
              {mp.targetCalories != null && (
                <View className="flex-1 items-center">
                  <Text className="text-lg font-bold text-gray-900">{mp.targetCalories}</Text>
                  <Text className="text-[10px] text-gray-500">cal</Text>
                </View>
              )}
              {mp.targetProtein != null && (
                <View className="flex-1 items-center">
                  <Text className="text-lg font-bold text-blue-600">{mp.targetProtein}g</Text>
                  <Text className="text-[10px] text-gray-500">protein</Text>
                </View>
              )}
              {mp.targetCarbs != null && (
                <View className="flex-1 items-center">
                  <Text className="text-lg font-bold text-amber-600">{mp.targetCarbs}g</Text>
                  <Text className="text-[10px] text-gray-500">carbs</Text>
                </View>
              )}
              {mp.targetFat != null && (
                <View className="flex-1 items-center">
                  <Text className="text-lg font-bold text-red-500">{mp.targetFat}g</Text>
                  <Text className="text-[10px] text-gray-500">fat</Text>
                </View>
              )}
            </View>
          )}

          {/* Status */}
          <View className="flex-row items-center mb-4">
            <View className={`px-2.5 py-1 rounded-full ${plan.isActive ? "bg-green-50" : "bg-gray-100"}`}>
              <Text className={`text-xs font-medium ${plan.isActive ? "text-green-700" : "text-gray-500"}`}>
                {plan.isActive ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>

          {/* Meals */}
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Meals ({meals.length})
          </Text>
          {meals.map((meal: any, i: number) => (
            <View key={meal.id || i} className="bg-gray-50 rounded-xl px-4 py-3 mb-2 border border-gray-100">
              <Text className="text-sm font-medium text-gray-900">{meal.name}</Text>
              {meal.time && <Text className="text-xs text-gray-400">{meal.time}</Text>}
              {meal.foods?.map((food: any, fi: number) => (
                <View key={fi} className="flex-row items-center justify-between mt-1.5">
                  <Text className="text-xs text-gray-600 flex-1">{food.name}</Text>
                  <Text className="text-xs text-gray-400">
                    {food.calories ? `${Math.round(food.calories)} cal` : ""}
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

/* ─── Create Custom Workout Sheet ─── */
function CreateWorkoutSheet({ visible, clientId, onClose, onSuccess }: { visible: boolean; clientId: string; onClose: () => void; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<{ name: string; sets: string; reps: string; weight: string; restSeconds: string; notes: string }[]>([
    { name: "", sets: "", reps: "", weight: "", restSeconds: "", notes: "" },
  ]);

  useEffect(() => {
    if (visible) {
      setName("");
      setExercises([{ name: "", sets: "", reps: "", weight: "", restSeconds: "", notes: "" }]);
    }
  }, [visible]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post(`/api/clients/${clientId}/workouts`, data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-client-detail"] });
      onSuccess();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  function handleSubmit() {
    if (!name.trim()) return Alert.alert("Required", "Plan name is required");
    const validExercises = exercises.filter((ex) => ex.name.trim());
    if (validExercises.length === 0) return Alert.alert("Required", "Add at least one exercise");

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
      title="Create Custom Workout"
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Create Plan</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 mb-1">Plan Name *</Text>
      <BottomSheetTextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={name} onChangeText={setName} placeholder="e.g. Upper Body A" />

      <Text className="text-sm font-semibold text-gray-700 mb-2">Exercises</Text>
      {exercises.map((ex, i) => (
        <View key={i} className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-medium text-gray-500">Exercise {i + 1}</Text>
            {exercises.length > 1 && (
              <TouchableOpacity onPress={() => removeExercise(i)} hitSlop={8}>
                <X size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
          <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 mb-2 text-sm text-gray-900" placeholder="Exercise name *" value={ex.name} onChangeText={(v) => updateExercise(i, "name", v)} />
          <View className="flex-row">
            <View className="flex-1 mr-2">
              <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" placeholder="Sets" value={ex.sets} onChangeText={(v) => updateExercise(i, "sets", v)} keyboardType="numeric" />
            </View>
            <View className="flex-1 mr-2">
              <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" placeholder="Reps" value={ex.reps} onChangeText={(v) => updateExercise(i, "reps", v)} />
            </View>
            <View className="flex-1">
              <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" placeholder="Weight" value={ex.weight} onChangeText={(v) => updateExercise(i, "weight", v)} />
            </View>
          </View>
          <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 mt-2 text-sm text-gray-900" placeholder="Notes (optional)" value={ex.notes} onChangeText={(v) => updateExercise(i, "notes", v)} />
        </View>
      ))}
      <TouchableOpacity className="flex-row items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-2.5 mb-4" onPress={addExercise}>
        <Plus size={16} color="#6b7280" />
        <Text className="text-sm font-medium text-gray-500 ml-1">Add Exercise</Text>
      </TouchableOpacity>
    </AppBottomSheet>
  );
}

/* ─── Create Custom Meal Plan Sheet ─── */
function CreateMealPlanSheet({ visible, clientId, onClose, onSuccess }: { visible: boolean; clientId: string; onClose: () => void; onSuccess: () => void }) {
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
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  function handleSubmit() {
    if (!name.trim()) return Alert.alert("Required", "Plan name is required");
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
      title="Create Custom Meal Plan"
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Create Plan</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 mb-1">Plan Name *</Text>
      <BottomSheetTextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={name} onChangeText={setName} placeholder="e.g. High Protein Cut" />

      <Text className="text-sm font-semibold text-gray-700 mb-2">Nutrition Targets</Text>
      <View className="flex-row mb-4">
        <View className="flex-1 mr-2">
          <Text className="text-xs text-gray-500 mb-1">Calories</Text>
          <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder="kcal" />
        </View>
        <View className="flex-1 mr-2">
          <Text className="text-xs text-gray-500 mb-1">Protein</Text>
          <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" value={protein} onChangeText={setProtein} keyboardType="numeric" placeholder="g" />
        </View>
        <View className="flex-1 mr-2">
          <Text className="text-xs text-gray-500 mb-1">Carbs</Text>
          <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" value={carbs} onChangeText={setCarbs} keyboardType="numeric" placeholder="g" />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-gray-500 mb-1">Fat</Text>
          <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900" value={fat} onChangeText={setFat} keyboardType="numeric" placeholder="g" />
        </View>
      </View>

      <Text className="text-sm font-semibold text-gray-700 mb-2">Meals</Text>
      {meals.map((meal, i) => (
        <View key={i} className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-medium text-gray-500">Meal {i + 1}</Text>
            {meals.length > 1 && (
              <TouchableOpacity onPress={() => removeMeal(i)} hitSlop={8}>
                <X size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
          <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 mb-2 text-sm text-gray-900" placeholder="Meal name *" value={meal.name} onChangeText={(v) => updateMeal(i, "name", v)} />
          <BottomSheetTextInput className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900" placeholder="Time (optional, e.g. 8:00 AM)" value={meal.time} onChangeText={(v) => updateMeal(i, "time", v)} />
        </View>
      ))}
      <TouchableOpacity className="flex-row items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-2.5 mb-4" onPress={addMeal}>
        <Plus size={16} color="#6b7280" />
        <Text className="text-sm font-medium text-gray-500 ml-1">Add Meal</Text>
      </TouchableOpacity>

      <Text className="text-xs text-gray-400 mb-2">You can add individual foods to meals from the web app.</Text>
    </AppBottomSheet>
  );
}
