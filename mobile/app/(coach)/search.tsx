import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Search, Users, Dumbbell, UtensilsCrossed } from "lucide-react-native";
import { useGlobalSearch } from "@/hooks/use-coach-data";

export default function GlobalSearchScreen() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useGlobalSearch(query);

  const hasResults = data && (
    data.clients.length > 0 ||
    data.exercises.length > 0 ||
    data.workoutPlans.length > 0 ||
    data.mealPlans.length > 0
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center bg-gray-50 rounded-lg px-3">
          <Search size={16} color="#9ca3af" />
          <TextInput
            className="flex-1 py-2 px-2 text-sm text-gray-900"
            value={query}
            onChangeText={setQuery}
            placeholder="Search clients, exercises, plans..."
            placeholderTextColor="#9ca3af"
            autoFocus
          />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {query.length < 2 && (
          <View className="items-center py-16">
            <Search size={40} color="#d1d5db" />
            <Text className="text-gray-400 text-sm mt-3">Type at least 2 characters</Text>
          </View>
        )}

        {isLoading && query.length >= 2 && (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#059669" />
          </View>
        )}

        {data && !isLoading && !hasResults && query.length >= 2 && (
          <View className="items-center py-16">
            <Text className="text-gray-400 text-sm">No results found</Text>
          </View>
        )}

        {data?.clients && data.clients.length > 0 && (
          <Section title="Clients" icon={Users} iconColor="#3b82f6">
            {data.clients.map((c) => (
              <TouchableOpacity
                key={c.id}
                className="flex-row items-center px-3 py-2.5 border-b border-gray-50"
                onPress={() => router.push(`/(coach)/clients/${c.id}` as never)}
                activeOpacity={0.6}
              >
                <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center mr-3">
                  <Text className="text-blue-700 font-semibold text-xs">
                    {c.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-900">{c.name}</Text>
                  <Text className="text-xs text-gray-500">{c.email}</Text>
                </View>
                <View className={`px-2 py-0.5 rounded-full ${c.status === "active" || c.status === "ACTIVE" ? "bg-green-50" : "bg-gray-100"}`}>
                  <Text className={`text-[10px] capitalize ${c.status === "active" || c.status === "ACTIVE" ? "text-green-700" : "text-gray-500"}`}>{c.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Section>
        )}

        {data?.exercises && data.exercises.length > 0 && (
          <Section title="Exercises" icon={Dumbbell} iconColor="#8b5cf6">
            {data.exercises.map((e) => (
              <View key={e.id} className="px-3 py-2.5 border-b border-gray-50">
                <Text className="text-sm text-gray-900">{e.name}</Text>
                <Text className="text-xs text-gray-500">{[e.category, e.muscleGroup].filter(Boolean).join(" · ")}</Text>
              </View>
            ))}
          </Section>
        )}

        {data?.workoutPlans && data.workoutPlans.length > 0 && (
          <Section title="Workout Plans" icon={Dumbbell} iconColor="#059669">
            {data.workoutPlans.map((p) => (
              <View key={p.id} className="px-3 py-2.5 border-b border-gray-50">
                <Text className="text-sm text-gray-900">{p.name}</Text>
                {p.description && <Text className="text-xs text-gray-500" numberOfLines={1}>{p.description}</Text>}
              </View>
            ))}
          </Section>
        )}

        {data?.mealPlans && data.mealPlans.length > 0 && (
          <Section title="Meal Plans" icon={UtensilsCrossed} iconColor="#f59e0b">
            {data.mealPlans.map((p) => (
              <View key={p.id} className="px-3 py-2.5 border-b border-gray-50">
                <Text className="text-sm text-gray-900">{p.name}</Text>
                {p.description && <Text className="text-xs text-gray-500" numberOfLines={1}>{p.description}</Text>}
              </View>
            ))}
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, icon: Icon, iconColor, children }: { title: string; icon: any; iconColor: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <View className="flex-row items-center mb-1.5">
        <Icon size={14} color={iconColor} />
        <Text className="text-xs font-semibold text-gray-900 ml-1.5">{title}</Text>
      </View>
      <View className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {children}
      </View>
    </View>
  );
}
