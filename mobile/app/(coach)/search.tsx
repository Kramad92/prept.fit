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
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";

export default function GlobalSearchScreen() {
  const t = useT();
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const { data, isLoading } = useGlobalSearch(query);

  const hasResults = data && (
    data.clients.length > 0 ||
    data.exercises.length > 0 ||
    data.workoutPlans.length > 0 ||
    data.mealPlans.length > 0
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center bg-gray-50 dark:bg-slate-950 rounded-lg px-3">
          <Search size={16} color={colors.iconMuted} />
          <TextInput
            className="flex-1 py-2 px-2 text-sm text-gray-900 dark:text-slate-50"
            value={query}
            onChangeText={setQuery}
            placeholder={t.common.search + "..."}
            placeholderTextColor={colors.iconMuted}
            autoFocus
          />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {query.length < 2 && (
          <View className="items-center py-16">
            <Search size={40} color={colors.iconMuted} />
            <Text className="text-gray-400 dark:text-slate-500 text-sm mt-3">Type at least 2 characters</Text>
          </View>
        )}

        {isLoading && query.length >= 2 && (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        )}

        {data && !isLoading && !hasResults && query.length >= 2 && (
          <View className="items-center py-16">
            <Text className="text-gray-400 dark:text-slate-500 text-sm">{t.common.noResults}</Text>
          </View>
        )}

        {data?.clients && data.clients.length > 0 && (
          <Section title={t.clients.title} icon={Users} iconColor="#3b82f6">
            {data.clients.map((c) => (
              <TouchableOpacity
                key={c.id}
                className="flex-row items-center px-3 py-2.5 border-b border-gray-50 dark:border-slate-700/40"
                onPress={() => router.push({ pathname: "/(coach)/clients/[id]", params: { id: c.id } } as any)}
                activeOpacity={0.6}
              >
                <View className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/25 items-center justify-center mr-3">
                  <Text className="text-blue-700 dark:text-blue-300 font-semibold text-xs">
                    {c.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-900 dark:text-slate-50">{c.name}</Text>
                  <Text className="text-xs text-gray-500 dark:text-slate-400">{c.email}</Text>
                </View>
                <View className={`px-2 py-0.5 rounded-full ${c.status === "active" || c.status === "ACTIVE" ? "bg-green-50 dark:bg-green-900/25" : "bg-gray-100 dark:bg-slate-700"}`}>
                  <Text className={`text-[10px] capitalize ${c.status === "active" || c.status === "ACTIVE" ? "text-green-700 dark:text-green-300" : "text-gray-500 dark:text-slate-400"}`}>{c.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Section>
        )}

        {data?.exercises && data.exercises.length > 0 && (
          <Section title={t.exerciseLibrary.title} icon={Dumbbell} iconColor="#8b5cf6">
            {data.exercises.map((e) => (
              <View key={e.id} className="px-3 py-2.5 border-b border-gray-50 dark:border-slate-700/40">
                <Text className="text-sm text-gray-900 dark:text-slate-50">{e.name}</Text>
                <Text className="text-xs text-gray-500 dark:text-slate-400">{[e.category, e.muscleGroup].filter(Boolean).join(" · ")}</Text>
              </View>
            ))}
          </Section>
        )}

        {data?.workoutPlans && data.workoutPlans.length > 0 && (
          <Section title={t.workouts.title} icon={Dumbbell} iconColor="#059669">
            {data.workoutPlans.map((p) => (
              <View key={p.id} className="px-3 py-2.5 border-b border-gray-50 dark:border-slate-700/40">
                <Text className="text-sm text-gray-900 dark:text-slate-50">{p.name}</Text>
                {p.description && <Text className="text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>{p.description}</Text>}
              </View>
            ))}
          </Section>
        )}

        {data?.mealPlans && data.mealPlans.length > 0 && (
          <Section title={t.nutrition.title} icon={UtensilsCrossed} iconColor="#f59e0b">
            {data.mealPlans.map((p) => (
              <View key={p.id} className="px-3 py-2.5 border-b border-gray-50 dark:border-slate-700/40">
                <Text className="text-sm text-gray-900 dark:text-slate-50">{p.name}</Text>
                {p.description && <Text className="text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>{p.description}</Text>}
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
        <Text className="text-xs font-semibold text-gray-900 dark:text-slate-50 ml-1.5">{title}</Text>
      </View>
      <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 overflow-hidden">
        {children}
      </View>
    </View>
  );
}
