import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ChevronRight,
  Check,
} from "lucide-react-native";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { useBookingSlots, useClientProfile } from "@/hooks/use-client-data";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { BookingSlot } from "@/types/api";

export default function BookSessionScreen() {
  const queryClient = useQueryClient();
  const { data: slots, isLoading } = useBookingSlots();
  const { data: profile } = useClientProfile();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [notes, setNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const t = useT();
  const colors = useThemeColors();

  // Group slots by date
  const groupedSlots = useMemo(() => {
    if (!slots) return [];
    const groups: { date: string; label: string; slots: BookingSlot[] }[] = [];
    const map = new Map<string, BookingSlot[]>();

    for (const slot of slots) {
      const existing = map.get(slot.date);
      if (existing) {
        existing.push(slot);
      } else {
        map.set(slot.date, [slot]);
      }
    }

    for (const [date, dateSlots] of map) {
      const d = new Date(date + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let label: string;
      if (d.getTime() === today.getTime()) {
        label = t.common.today;
      } else if (d.getTime() === tomorrow.getTime()) {
        label = t.common.tomorrow;
      } else {
        label = d.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
      }
      groups.push({ date, label, slots: dateSlots });
    }

    return groups.sort((a, b) => a.date.localeCompare(b.date));
  }, [slots, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["booking-slots"] });
    setRefreshing(false);
  }, [queryClient]);

  const bookMutation = useMutation({
    mutationFn: (slot: BookingSlot) =>
      api.post("/api/booking", {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["booking-slots"] });
      queryClient.invalidateQueries({ queryKey: ["client-profile"] });
      setSelectedSlot(null);
      setShowConfirm(false);
      setNotes("");
      Alert.alert(t.portalBook.booked);
    },
    onError: (err) => {
      haptics.error();
      Alert.alert(
        "Booking Failed",
        err instanceof Error ? err.message : "Could not book this slot."
      );
    },
  });

  const handleSelectSlot = useCallback((slot: BookingSlot) => {
    setSelectedSlot(slot);
    setShowConfirm(true);
  }, []);

  const handleConfirmBooking = useCallback(() => {
    if (!selectedSlot) return;
    bookMutation.mutate(selectedSlot);
  }, [selectedSlot, bookMutation]);

  // Upcoming sessions from profile
  const upcomingSessions = useMemo(() => {
    if (!profile?.schedules) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return profile.schedules
      .filter(
        (s) => s.status === "scheduled" && new Date(s.date) >= now
      )
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      .slice(0, 3);
  }, [profile?.schedules]);

  // Confirmation view
  if (showConfirm && selectedSlot) {
    const d = new Date(selectedSlot.date + "T00:00:00");
    const dateLabel = d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
          <TouchableOpacity
            onPress={() => {
              setShowConfirm(false);
              setSelectedSlot(null);
            }}
            className="mr-3 p-1"
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50">
            {t.common.confirm} Booking
          </Text>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">
            <View className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700/40 mb-4">
              <View className="items-center mb-4">
                <View className="w-16 h-16 rounded-full bg-brand-50 items-center justify-center mb-3">
                  <Calendar size={28} color={colors.brand} />
                </View>
                <Text className="text-xl font-bold text-gray-900 dark:text-slate-50">
                  {dateLabel}
                </Text>
                <Text className="text-lg text-brand-600 font-semibold mt-1">
                  {selectedSlot.startTime} - {selectedSlot.endTime}
                </Text>
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                {t.common.notes} ({t.common.optional.toLowerCase()})
              </Text>
              <TextInput
                className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-slate-50 border border-gray-200 dark:border-slate-700 min-h-[80px]"
                placeholder="Anything your coach should know..."
                placeholderTextColor={colors.iconMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700/40">
            <TouchableOpacity
              className={`rounded-xl py-3.5 items-center ${
                bookMutation.isPending ? "bg-brand-400" : "bg-brand-600"
              }`}
              onPress={handleConfirmBooking}
              disabled={bookMutation.isPending}
              activeOpacity={0.7}
            >
              {bookMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="flex-row items-center">
                  <Check size={18} color="#fff" />
                  <Text className="text-white font-semibold text-base ml-2">
                    {t.common.confirm} Booking
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50">
          {t.portalBook.title}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
      >
        {/* Upcoming sessions */}
        {upcomingSessions.length > 0 && (
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">
              {t.portal.upcomingSessions}
            </Text>
            {upcomingSessions.map((session) => (
              <View
                key={session.id}
                className="bg-brand-50 rounded-xl p-3 mb-2 border border-brand-100 flex-row items-center"
              >
                <Calendar size={18} color={colors.brand} />
                <View className="flex-1 ml-3">
                  <Text className="text-sm font-semibold text-gray-900 dark:text-slate-50">
                    {session.title}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-slate-400">
                    {new Date(session.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at {session.startTime}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Available slots */}
        <Text className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">
          {t.portalBook.availableSlots}
        </Text>

        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : groupedSlots.length === 0 ? (
          <View className="items-center py-16">
            <Calendar size={48} color={colors.iconMuted} />
            <Text className="text-gray-400 dark:text-slate-500 mt-3 text-base">
              {t.portalBook.noSlots}
            </Text>
            <Text className="text-gray-400 dark:text-slate-500 text-sm mt-1">
              Check back later for new availability
            </Text>
          </View>
        ) : (
          groupedSlots.map((group) => (
            <View key={group.date} className="mb-4">
              <Text className="text-base font-semibold text-gray-900 dark:text-slate-50 mb-2">
                {group.label}
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {group.slots.map((slot, i) => (
                  <TouchableOpacity
                    key={`${slot.date}-${slot.startTime}-${i}`}
                    className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-slate-700"
                    onPress={() => handleSelectSlot(slot)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      <Clock size={14} color={colors.brand} />
                      <Text className="text-sm font-medium text-gray-900 dark:text-slate-50 ml-1.5">
                        {slot.startTime}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      {slot.startTime} - {slot.endTime}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
