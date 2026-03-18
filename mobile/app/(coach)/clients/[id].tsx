import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
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
} from "lucide-react-native";
import { useClientDetail } from "@/hooks/use-coach-data";
import { QueryError } from "@/components/query-error";

type Tab = "overview" | "workouts" | "nutrition" | "progress";

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: client, isLoading, error, refetch, isRefetching } =
    useClientDetail(id);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

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

          {/* Quick Action */}
          <TouchableOpacity
            className="flex-row items-center justify-center mt-4 bg-brand-600 rounded-lg py-2.5"
            onPress={() =>
              router.push(`/(coach)/messages/${id}` as never)
            }
            activeOpacity={0.7}
          >
            <MessageCircle size={16} color="#fff" />
            <Text className="text-white font-semibold text-sm ml-2">
              Message
            </Text>
          </TouchableOpacity>
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
            <WorkoutsTab plans={client.assignedPlans || []} />
          )}
          {activeTab === "nutrition" && (
            <NutritionTab plans={client.assignedMealPlans || []} />
          )}
          {activeTab === "progress" && (
            <ProgressTab
              photos={client.progressPhotos || []}
              measurements={client.measurements || []}
            />
          )}
        </View>
      </ScrollView>
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

function WorkoutsTab({ plans }: { plans: any[] }) {
  if (plans.length === 0) {
    return (
      <View className="items-center py-12">
        <Dumbbell size={36} color="#d1d5db" />
        <Text className="text-gray-400 text-sm mt-2">
          No workout plans assigned
        </Text>
      </View>
    );
  }

  return (
    <View>
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

function NutritionTab({ plans }: { plans: any[] }) {
  if (plans.length === 0) {
    return (
      <View className="items-center py-12">
        <UtensilsCrossed size={36} color="#d1d5db" />
        <Text className="text-gray-400 text-sm mt-2">
          No meal plans assigned
        </Text>
      </View>
    );
  }

  return (
    <View>
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
