import { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
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
} from "lucide-react-native";
import { useClientDetail, useWorkoutPlans, useMealPlans, useHabitTemplates } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { AppBottomSheet } from "@/components/app-bottom-sheet";

type Tab = "overview" | "workouts" | "nutrition" | "progress";

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: client, isLoading, error, refetch, isRefetching } =
    useClientDetail(id);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showEditClient, setShowEditClient] = useState(false);
  const [showAssignWorkout, setShowAssignWorkout] = useState(false);
  const [showAssignMeal, setShowAssignMeal] = useState(false);

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
            <WorkoutsTab plans={client.assignedPlans || []} onAssign={() => setShowAssignWorkout(true)} />
          )}
          {activeTab === "nutrition" && (
            <NutritionTab plans={client.assignedMealPlans || []} onAssign={() => setShowAssignMeal(true)} />
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

function WorkoutsTab({ plans, onAssign }: { plans: any[]; onAssign: () => void }) {
  return (
    <View>
      <TouchableOpacity
        className="flex-row items-center justify-center border-2 border-dashed border-brand-300 rounded-xl py-2.5 mb-3"
        onPress={onAssign}
        activeOpacity={0.6}
      >
        <Plus size={16} color="#059669" />
        <Text className="text-sm font-medium text-brand-600 ml-1">Assign Workout Plan</Text>
      </TouchableOpacity>
      {plans.length === 0 ? (
        <View className="items-center py-8">
          <Dumbbell size={36} color="#d1d5db" />
          <Text className="text-gray-400 text-sm mt-2">No plans assigned yet</Text>
        </View>
      ) : null}
      {plans.map((p) => (
        <View
          key={p.id}
          className="bg-white rounded-xl border border-gray-100 p-4 mb-3"
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-base font-medium text-gray-900 flex-1" numberOfLines={1}>
              {p.customName || p.workoutPlan?.name || "Workout Plan"}
            </Text>
            <View
              className={`px-2 py-0.5 rounded-full ${
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
        </View>
      ))}
    </View>
  );
}

function NutritionTab({ plans, onAssign }: { plans: any[]; onAssign: () => void }) {
  return (
    <View>
      <TouchableOpacity
        className="flex-row items-center justify-center border-2 border-dashed border-brand-300 rounded-xl py-2.5 mb-3"
        onPress={onAssign}
        activeOpacity={0.6}
      >
        <Plus size={16} color="#059669" />
        <Text className="text-sm font-medium text-brand-600 ml-1">Assign Meal Plan</Text>
      </TouchableOpacity>
      {plans.length === 0 ? (
        <View className="items-center py-8">
          <UtensilsCrossed size={36} color="#d1d5db" />
          <Text className="text-gray-400 text-sm mt-2">No plans assigned yet</Text>
        </View>
      ) : null}
      {plans.map((p) => {
        const mp = p.mealPlan;
        return (
          <View
            key={p.id}
            className="bg-white rounded-xl border border-gray-100 p-4 mb-3"
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-base font-medium text-gray-900 flex-1" numberOfLines={1}>
                {p.customName || mp?.name || "Meal Plan"}
              </Text>
              <View
                className={`px-2 py-0.5 rounded-full ${
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
          </View>
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
      snapPoints={["50%", "85%"]}
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
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={name} onChangeText={setName} />
      <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Text className="text-sm font-medium text-gray-700 mb-1">Phone</Text>
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Text className="text-sm font-medium text-gray-700 mb-1">Goals</Text>
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={goals} onChangeText={setGoals} multiline />
      <Text className="text-sm font-medium text-gray-700 mb-1">Notes</Text>
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={notes} onChangeText={setNotes} multiline />
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
      snapPoints={["50%", "85%"]}
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
      snapPoints={["50%", "85%"]}
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
