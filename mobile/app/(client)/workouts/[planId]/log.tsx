import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { ArrowLeft, Check, ChevronRight, Timer, Plus, Trophy } from "lucide-react-native";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useClientProfile } from "@/hooks/use-client-data";
import { QueryError } from "@/components/query-error";
import type { ClientExercise, Exercise } from "@/types/api";

interface SetLog {
  reps: string;
  weight: string;
  completed: boolean;
}

interface ExerciseLog {
  exerciseId: string;
  name: string;
  sets: SetLog[];
}

export default function WorkoutLogScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const queryClient = useQueryClient();
  const startTime = useRef(Date.now());
  const t = useT();
  const colors = useThemeColors();

  const { data: profile, isError: profileError } = useClientProfile();

  const plan = useMemo(
    () => profile?.assignedPlans?.find((p) => p.id === planId),
    [profile, planId]
  );

  const exercises: (ClientExercise | Exercise)[] = useMemo(() => {
    if (!plan) return [];
    const list = plan.clientExercises.length > 0
      ? plan.clientExercises
      : plan.workoutPlan.exercises;
    return [...list].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [plan]);

  const originalExercises = useMemo(() => {
    if (!plan) return [];
    return [...plan.workoutPlan.exercises].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [plan]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [notes, setNotes] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (exercises.length > 0 && exerciseLogs.length === 0) {
      const logs = exercises.map((ex) => ({
        exerciseId: originalExercises.find((oe) => oe.id === ex.id)?.id || ex.id,
        name: ex.name,
        sets: Array.from({ length: ex.sets || 3 }, () => ({
          reps: ex.reps || "",
          weight: ex.weight || "",
          completed: false,
        })),
      }));
      setExerciseLogs(logs);
    }
  }, [exercises, originalExercises]);

  const currentExercise = exercises[currentIndex];
  const currentLog = exerciseLogs[currentIndex];

  useEffect(() => {
    if (isResting && restTimer > 0) {
      timerRef.current = setInterval(() => {
        setRestTimer((t) => {
          if (t <= 1) {
            setIsResting(false);
            clearInterval(timerRef.current!);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isResting]);

  const startRest = useCallback(() => {
    if (isResting) return;
    const restSecs = currentExercise?.restSeconds || 60;
    setRestTimer(restSecs);
    setIsResting(true);
  }, [currentExercise, isResting]);

  const skipRest = useCallback(() => {
    setIsResting(false);
    setRestTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const toggleSet = useCallback(
    (setIdx: number) => {
      haptics.light();
      const wasCompleted = exerciseLogs[currentIndex]?.sets[setIdx]?.completed;
      setExerciseLogs((prev) => {
        const next = [...prev];
        const log = { ...next[currentIndex] };
        const sets = [...log.sets];
        sets[setIdx] = { ...sets[setIdx], completed: !sets[setIdx].completed };
        log.sets = sets;
        next[currentIndex] = log;
        return next;
      });
      if (!wasCompleted) startRest();
    },
    [currentIndex, exerciseLogs, startRest]
  );

  const updateSet = useCallback(
    (setIdx: number, field: "reps" | "weight", value: string) => {
      setExerciseLogs((prev) => {
        const next = [...prev];
        const log = { ...next[currentIndex] };
        const sets = [...log.sets];
        sets[setIdx] = { ...sets[setIdx], [field]: value };
        log.sets = sets;
        next[currentIndex] = log;
        return next;
      });
    },
    [currentIndex]
  );

  const addSet = useCallback(() => {
    setExerciseLogs((prev) => {
      const next = [...prev];
      const log = { ...next[currentIndex] };
      log.sets = [
        ...log.sets,
        { reps: currentExercise?.reps || "", weight: currentExercise?.weight || "", completed: false },
      ];
      next[currentIndex] = log;
      return next;
    });
  }, [currentIndex, currentExercise]);

  const goNext = useCallback(() => {
    skipRest();
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setShowSummary(true);
    }
  }, [currentIndex, exercises.length, skipRest]);

  const goPrev = useCallback(() => {
    skipRest();
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex, skipRest]);

  const handleBack = useCallback(() => {
    Alert.alert("Discard Workout?", "Your progress will be lost.", [
      { text: "Keep Going", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  }, []);

  const [durationMinutes, setDurationMinutes] = useState(0);
  useEffect(() => {
    if (showSummary) {
      setDurationMinutes(Math.round((Date.now() - startTime.current) / 60000));
    }
  }, [showSummary]);

  const totalSetsCompleted = useMemo(
    () => exerciseLogs.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0),
    [exerciseLogs]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = exerciseLogs.flatMap((ex) =>
        ex.sets
          .filter((s) => s.completed)
          .map((s, idx) => ({
            exerciseId: ex.exerciseId,
            setNumber: idx + 1,
            repsCompleted: parseInt(s.reps) || null,
            weightUsed: s.weight || null,
            completed: true,
          }))
      );
      return api.post("/api/workout-logs", {
        workoutPlanId: plan!.workoutPlan.id,
        completed: true,
        duration: durationMinutes,
        notes: notes || undefined,
        entries,
      });
    },
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["workout-logs"] });
      queryClient.invalidateQueries({ queryKey: ["client-profile"] });
      router.replace("/(client)/(tabs)/workouts");
    },
  });

  if (profileError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <QueryError message="Failed to load workout" onRetry={() => queryClient.invalidateQueries({ queryKey: ["client-profile"] })} />
      </SafeAreaView>
    );
  }

  if (!plan || exercises.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (showSummary) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <ScrollView className="flex-1 px-4 pt-8" keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-full bg-brand-100 items-center justify-center mb-4">
              <Trophy size={32} color={colors.brand} />
            </View>
            <Text className="text-2xl font-bold text-gray-900 dark:text-slate-50">Workout Complete!</Text>
          </View>

          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700/40 items-center">
              <Text className="text-2xl font-bold text-brand-600">{durationMinutes}</Text>
              <Text className="text-xs text-gray-500 dark:text-slate-400">Minutes</Text>
            </View>
            <View className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700/40 items-center">
              <Text className="text-2xl font-bold text-brand-600">{exercises.length}</Text>
              <Text className="text-xs text-gray-500 dark:text-slate-400">{t.workouts.exercises}</Text>
            </View>
            <View className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700/40 items-center">
              <Text className="text-2xl font-bold text-brand-600">{totalSetsCompleted}</Text>
              <Text className="text-xs text-gray-500 dark:text-slate-400">{t.workouts.sets}</Text>
            </View>
          </View>

          {exerciseLogs.map((ex) => {
            const done = ex.sets.filter((s) => s.completed).length;
            return (
              <View key={ex.exerciseId} className="bg-white dark:bg-slate-800 rounded-xl p-3 mb-2 border border-gray-100 dark:border-slate-700/40 flex-row items-center">
                <Check size={16} color={done > 0 ? colors.brand : colors.iconMuted} />
                <Text className="flex-1 ml-2 text-sm text-gray-900 dark:text-slate-50">{ex.name}</Text>
                <Text className="text-sm text-gray-500 dark:text-slate-400">{done}/{ex.sets.length} {t.workouts.sets}</Text>
              </View>
            );
          })}

          <TextInput
            className="bg-white dark:bg-slate-800 rounded-xl p-4 mt-4 border border-gray-100 dark:border-slate-700/40 text-base text-gray-900 dark:text-slate-50 min-h-[80px]"
            placeholder="Add workout notes (optional)"
            placeholderTextColor={colors.iconMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
          />
          <View className="h-24" />
        </ScrollView>

        <View className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 dark:bg-slate-950">
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${saveMutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
            activeOpacity={0.8}
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">{t.workoutLog.saveLog}</Text>
            )}
          </TouchableOpacity>
          {saveMutation.isError && (
            <Text className="text-red-500 text-center text-sm mt-2">Failed to save. Tap to retry.</Text>
          )}
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={handleBack} className="mr-3 p-2.5">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-sm text-gray-500 dark:text-slate-400">{t.workoutLog.exercise} {currentIndex + 1} of {exercises.length}</Text>
          <View className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full mt-1">
            <View className="h-1.5 bg-brand-500 rounded-full" style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }} />
          </View>
        </View>
      </View>

      {isResting && (
        <View className="absolute top-0 left-0 right-0 bottom-0 z-50 bg-gray-900/80 items-center justify-center">
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-8 mx-8 items-center">
            <Timer size={32} color={colors.brand} />
            <Text className="text-5xl font-bold text-gray-900 dark:text-slate-50 mt-4">
              {Math.floor(restTimer / 60)}:{(restTimer % 60).toString().padStart(2, "0")}
            </Text>
            <Text className="text-gray-500 dark:text-slate-400 mt-2">Rest Time</Text>
            <TouchableOpacity className="mt-6 bg-brand-600 rounded-xl px-8 py-3" onPress={skipRest}>
              <Text className="text-white font-semibold">Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        <Text className="text-xl font-bold text-gray-900 dark:text-slate-50 mb-1">{currentExercise.name}</Text>
        {currentExercise.notes && (
          <Text className="text-sm text-gray-500 dark:text-slate-400 mb-3">{currentExercise.notes}</Text>
        )}
        <View className="flex-row gap-3 mb-4">
          {currentExercise.sets != null && (
            <View className="bg-brand-50 rounded-lg px-3 py-1.5">
              <Text className="text-xs text-brand-700 font-medium">{currentExercise.sets} {t.portalWorkouts.sets}</Text>
            </View>
          )}
          {currentExercise.reps && (
            <View className="bg-brand-50 rounded-lg px-3 py-1.5">
              <Text className="text-xs text-brand-700 font-medium">{currentExercise.reps} {t.portalWorkouts.reps}</Text>
            </View>
          )}
          {currentExercise.weight && (
            <View className="bg-brand-50 rounded-lg px-3 py-1.5">
              <Text className="text-xs text-brand-700 font-medium">{currentExercise.weight}</Text>
            </View>
          )}
        </View>

        <View className="mb-2">
          <View className="flex-row mb-2 px-1">
            <Text className="text-xs text-gray-400 dark:text-slate-500 w-12">SET</Text>
            <Text className="text-xs text-gray-400 dark:text-slate-500 flex-1 text-center">REPS</Text>
            <Text className="text-xs text-gray-400 dark:text-slate-500 flex-1 text-center">WEIGHT</Text>
            <View className="w-11" />
          </View>

          {currentLog?.sets.map((set, idx) => (
            <View
              key={idx}
              className={`flex-row items-center rounded-xl p-3 mb-2 border ${set.completed ? "bg-brand-50 border-brand-200" : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700/40"}`}
            >
              <Text className="text-sm font-bold text-gray-500 dark:text-slate-400 w-12">{idx + 1}</Text>
              <TextInput
                className="flex-1 text-center text-base text-gray-900 dark:text-slate-50 bg-gray-50 dark:bg-slate-950 rounded-lg py-2 mx-1"
                value={set.reps}
                onChangeText={(v) => updateSet(idx, "reps", v)}
                keyboardType="numeric"
                placeholder="-"
                placeholderTextColor={colors.iconMuted}
              />
              <TextInput
                className="flex-1 text-center text-base text-gray-900 dark:text-slate-50 bg-gray-50 dark:bg-slate-950 rounded-lg py-2 mx-1"
                value={set.weight}
                onChangeText={(v) => updateSet(idx, "weight", v)}
                placeholder="-"
                placeholderTextColor={colors.iconMuted}
              />
              <TouchableOpacity
                className={`w-11 h-11 rounded-full items-center justify-center ${set.completed ? "bg-brand-500" : "bg-gray-100 dark:bg-slate-700"}`}
                onPress={() => toggleSet(idx)}
              >
                <Check size={18} color={set.completed ? "white" : colors.iconMuted} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity className="flex-row items-center justify-center py-2 mt-1" onPress={addSet}>
            <Plus size={16} color={colors.brand} />
            <Text className="text-brand-600 text-sm font-medium ml-1">Add Set</Text>
          </TouchableOpacity>
        </View>
        <View className="h-24" />
      </ScrollView>
      </KeyboardAvoidingView>

      <View className="flex-row gap-3 p-4 bg-gray-50 dark:bg-slate-950">
        {currentIndex > 0 && (
          <TouchableOpacity className="flex-1 rounded-xl py-3.5 items-center border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800" onPress={goPrev}>
            <Text className="text-gray-700 dark:text-slate-200 font-semibold">{t.common.back}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          className="flex-1 rounded-xl py-3.5 items-center bg-brand-600 flex-row justify-center"
          activeOpacity={0.8}
          onPress={goNext}
        >
          <Text className="text-white font-bold">
            {currentIndex < exercises.length - 1 ? "Next Exercise" : t.workoutLog.finishWorkout}
          </Text>
          <ChevronRight size={18} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
