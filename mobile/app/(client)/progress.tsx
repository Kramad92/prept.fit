import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  Camera,
  TrendingUp,
  Image as ImageIcon,
  X,
  Scale,
  Ruler,
} from "lucide-react-native";
import { LineChart } from "react-native-gifted-charts";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { useClientProfile } from "@/hooks/use-client-data";
import { Colors } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { ProgressPhoto, MeasurementData } from "@/types/api";

const CATEGORIES = ["All", "front", "back", "side"];

type Tab = "photos" | "measurements";

export default function ProgressScreen() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isRefetching } = useClientProfile();
  const [tab, setTab] = useState<Tab>("photos");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [viewingPhoto, setViewingPhoto] = useState<ProgressPhoto | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const t = useT();
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const photoSize = (screenWidth - 32 - 8) / 3;

  const photos = useMemo(() => {
    const all = profile?.progressPhotos || [];
    const sorted = [...all].sort(
      (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
    );
    if (categoryFilter === "All") return sorted;
    return sorted.filter((p) => p.category === categoryFilter);
  }, [profile?.progressPhotos, categoryFilter]);

  const measurements = useMemo(() => {
    return [...(profile?.measurements || [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [profile?.measurements]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["client-profile"] });
    setRefreshing(false);
  }, [queryClient]);

  const uploadMutation = useMutation({
    mutationFn: async (uri: string) => {
      setUploading(true);
      const fileName = uri.split("/").pop() || "photo.jpg";
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: fileName,
        type: "image/jpeg",
      } as unknown as Blob);
      formData.append("folder", "progress-photos");

      const upload = await api.upload<{ key: string; url: string }>(
        "/api/upload",
        formData
      );
      await api.post("/api/portal/photos", { key: upload.key });
    },
    onSuccess: () => {
      setUploading(false);
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["client-profile"] });
      Alert.alert("Uploaded", t.photos.photoUploaded);
    },
    onError: (err) => {
      setUploading(false);
      haptics.error();
      Alert.alert(t.common.error, err instanceof Error ? err.message : "Upload failed");
    },
  });

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera roll access is required to upload photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      uploadMutation.mutate(result.assets[0].uri);
    }
  }, [uploadMutation]);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      uploadMutation.mutate(result.assets[0].uri);
    }
  }, [uploadMutation]);

  const handleAddPhoto = useCallback(() => {
    Alert.alert("Add Progress Photo", "Choose a source", [
      { text: "Camera", onPress: takePhoto },
      { text: "Photo Library", onPress: pickImage },
      { text: t.common.cancel, style: "cancel" },
    ]);
  }, [takePhoto, pickImage, t]);

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, []);

  const formatFullDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  // Chart data
  const weightData = useMemo(() => {
    return measurements
      .filter((m) => m.weight != null)
      .map((m) => ({
        value: m.weight!,
        label: formatDate(m.date),
        dataPointText: `${m.weight}`,
      }));
  }, [measurements, formatDate]);

  const bodyFatData = useMemo(() => {
    return measurements
      .filter((m) => m.bodyFat != null)
      .map((m) => ({
        value: m.bodyFat!,
        label: formatDate(m.date),
        dataPointText: `${m.bodyFat}%`,
      }));
  }, [measurements, formatDate]);

  const latestMeasurement = measurements.length > 0
    ? measurements[measurements.length - 1]
    : null;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50">{t.nav.progress}</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
          {t.nav.progress}
        </Text>
        {tab === "photos" && (
          <TouchableOpacity
            onPress={handleAddPhoto}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <Camera size={22} color={colors.brand} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Tab switcher */}
      <View className="flex-row px-4 pt-3 pb-1 bg-white dark:bg-slate-800">
        <TouchableOpacity
          className={`flex-1 py-2 items-center border-b-2 ${
            tab === "photos" ? "border-brand-600" : "border-transparent"
          }`}
          onPress={() => setTab("photos")}
        >
          <View className="flex-row items-center">
            <ImageIcon
              size={16}
              color={tab === "photos" ? colors.brand : colors.icon}
            />
            <Text
              className={`ml-1.5 font-medium ${
                tab === "photos" ? "text-brand-600" : "text-gray-500 dark:text-slate-400"
              }`}
            >
              {t.photos.title}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 items-center border-b-2 ${
            tab === "measurements" ? "border-brand-600" : "border-transparent"
          }`}
          onPress={() => setTab("measurements")}
        >
          <View className="flex-row items-center">
            <TrendingUp
              size={16}
              color={tab === "measurements" ? colors.brand : colors.icon}
            />
            <Text
              className={`ml-1.5 font-medium ${
                tab === "measurements" ? "text-brand-600" : "text-gray-500 dark:text-slate-400"
              }`}
            >
              {t.measurements.title}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
      >
        {tab === "photos" ? (
          <View className="px-4 pt-3">
            {/* Category filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  className={`mr-2 px-4 py-1.5 rounded-full ${
                    categoryFilter === cat
                      ? "bg-brand-600"
                      : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
                  }`}
                  onPress={() => setCategoryFilter(cat)}
                >
                  <Text
                    className={`text-sm font-medium capitalize ${
                      categoryFilter === cat ? "text-white" : "text-gray-600 dark:text-slate-300"
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {photos.length === 0 ? (
              <View className="items-center py-16">
                <ImageIcon size={48} color={colors.iconMuted} />
                <Text className="text-gray-400 dark:text-slate-500 mt-3 text-base">
                  {t.photos.noPhotos}
                </Text>
                <TouchableOpacity
                  className="mt-4 bg-brand-600 rounded-xl px-6 py-3"
                  onPress={handleAddPhoto}
                  activeOpacity={0.7}
                >
                  <Text className="text-white font-semibold">
                    Add Your First Photo
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row flex-wrap" style={{ gap: 4 }}>
                {photos.map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    onPress={() => setViewingPhoto(photo)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: photo.url }}
                      style={{ width: photoSize, height: photoSize }}
                      className="rounded-lg bg-gray-200 dark:bg-slate-700"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View className="h-8" />
          </View>
        ) : (
          <View className="px-4 pt-3">
            {/* Latest measurements summary */}
            {latestMeasurement && (
              <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4 border border-gray-100 dark:border-slate-700/40">
                <Text className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-3">
                  Latest — {formatFullDate(latestMeasurement.date)}
                </Text>
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  {latestMeasurement.weight != null && (
                    <MeasurementPill
                      icon={<Scale size={14} color={colors.brand} />}
                      label={t.measurements.weight}
                      value={`${latestMeasurement.weight} ${t.measurements.kg}`}
                    />
                  )}
                  {latestMeasurement.bodyFat != null && (
                    <MeasurementPill
                      icon={<TrendingUp size={14} color="#3b82f6" />}
                      label={t.measurements.bodyFat}
                      value={`${latestMeasurement.bodyFat}%`}
                    />
                  )}
                  {latestMeasurement.chest != null && (
                    <MeasurementPill
                      icon={<Ruler size={14} color="#8b5cf6" />}
                      label={t.measurements.chest}
                      value={`${latestMeasurement.chest} ${t.measurements.cm}`}
                    />
                  )}
                  {latestMeasurement.waist != null && (
                    <MeasurementPill
                      icon={<Ruler size={14} color="#f59e0b" />}
                      label={t.measurements.waist}
                      value={`${latestMeasurement.waist} ${t.measurements.cm}`}
                    />
                  )}
                  {latestMeasurement.hips != null && (
                    <MeasurementPill
                      icon={<Ruler size={14} color="#ec4899" />}
                      label={t.measurements.hips}
                      value={`${latestMeasurement.hips} ${t.measurements.cm}`}
                    />
                  )}
                  {latestMeasurement.arms != null && (
                    <MeasurementPill
                      icon={<Ruler size={14} color="#14b8a6" />}
                      label={t.measurements.arms}
                      value={`${latestMeasurement.arms} ${t.measurements.cm}`}
                    />
                  )}
                  {latestMeasurement.thighs != null && (
                    <MeasurementPill
                      icon={<Ruler size={14} color="#6366f1" />}
                      label={t.measurements.thighs}
                      value={`${latestMeasurement.thighs} ${t.measurements.cm}`}
                    />
                  )}
                </View>
              </View>
            )}

            {/* Weight trend chart */}
            {weightData.length >= 2 && (
              <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4 border border-gray-100 dark:border-slate-700/40">
                <Text className="text-base font-semibold text-gray-900 dark:text-slate-50 mb-3">
                  Weight Trend
                </Text>
                <LineChart
                  data={weightData}
                  width={screenWidth - 80}
                  height={180}
                  color={Colors.brand[600]}
                  dataPointsColor={Colors.brand[600]}
                  thickness={2}
                  startFillColor={Colors.brand[100]}
                  endFillColor={Colors.brand[50]}
                  areaChart
                  curved
                  hideRules
                  yAxisTextStyle={{ color: colors.icon, fontSize: 11 }}
                  xAxisLabelTextStyle={{ color: colors.iconMuted, fontSize: 11 }}
                  spacing={(screenWidth - 100) / Math.max(weightData.length - 1, 1)}
                  noOfSections={4}
                  isAnimated
                />
              </View>
            )}

            {/* Body fat trend chart */}
            {bodyFatData.length >= 2 && (
              <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4 border border-gray-100 dark:border-slate-700/40">
                <Text className="text-base font-semibold text-gray-900 dark:text-slate-50 mb-3">
                  Body Fat Trend
                </Text>
                <LineChart
                  data={bodyFatData}
                  width={screenWidth - 80}
                  height={180}
                  color="#3b82f6"
                  dataPointsColor="#3b82f6"
                  thickness={2}
                  startFillColor="#bfdbfe"
                  endFillColor="#eff6ff"
                  areaChart
                  curved
                  hideRules
                  yAxisTextStyle={{ color: colors.icon, fontSize: 11 }}
                  xAxisLabelTextStyle={{ color: colors.iconMuted, fontSize: 11 }}
                  spacing={(screenWidth - 100) / Math.max(bodyFatData.length - 1, 1)}
                  noOfSections={4}
                  isAnimated
                />
              </View>
            )}

            {/* All measurements table */}
            {measurements.length > 0 ? (
              <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 overflow-hidden mb-4">
                <Text className="text-base font-semibold text-gray-900 dark:text-slate-50 px-4 pt-4 pb-2">
                  History
                </Text>
                {[...measurements].reverse().map((m, i) => (
                  <View
                    key={m.id}
                    className={`px-4 py-3 ${
                      i < measurements.length - 1 ? "border-b border-gray-50 dark:border-slate-700/40" : ""
                    }`}
                  >
                    <Text className="text-sm font-medium text-gray-900 dark:text-slate-50 mb-1">
                      {formatFullDate(m.date)}
                    </Text>
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                      {m.weight != null && (
                        <Text className="text-xs text-gray-500 dark:text-slate-400">
                          {t.measurements.weight}: {m.weight}{t.measurements.kg}
                        </Text>
                      )}
                      {m.bodyFat != null && (
                        <Text className="text-xs text-gray-500 dark:text-slate-400">
                          BF: {m.bodyFat}%
                        </Text>
                      )}
                      {m.chest != null && (
                        <Text className="text-xs text-gray-500 dark:text-slate-400">
                          {t.measurements.chest}: {m.chest}{t.measurements.cm}
                        </Text>
                      )}
                      {m.waist != null && (
                        <Text className="text-xs text-gray-500 dark:text-slate-400">
                          {t.measurements.waist}: {m.waist}{t.measurements.cm}
                        </Text>
                      )}
                      {m.hips != null && (
                        <Text className="text-xs text-gray-500 dark:text-slate-400">
                          {t.measurements.hips}: {m.hips}{t.measurements.cm}
                        </Text>
                      )}
                      {m.arms != null && (
                        <Text className="text-xs text-gray-500 dark:text-slate-400">
                          {t.measurements.arms}: {m.arms}{t.measurements.cm}
                        </Text>
                      )}
                      {m.thighs != null && (
                        <Text className="text-xs text-gray-500 dark:text-slate-400">
                          {t.measurements.thighs}: {m.thighs}{t.measurements.cm}
                        </Text>
                      )}
                    </View>
                    {m.notes && (
                      <Text className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                        {m.notes}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View className="items-center py-16">
                <TrendingUp size={48} color={colors.iconMuted} />
                <Text className="text-gray-400 dark:text-slate-500 mt-3 text-base">
                  {t.measurements.noMeasurements}
                </Text>
                <Text className="text-gray-400 dark:text-slate-500 text-sm mt-1">
                  Your coach will add these during sessions
                </Text>
              </View>
            )}
            <View className="h-8" />
          </View>
        )}
      </ScrollView>

      {/* Full-screen photo viewer modal */}
      <Modal visible={!!viewingPhoto} transparent animationType="fade">
        <View className="flex-1 bg-black/90 items-center justify-center">
          <TouchableOpacity
            className="absolute top-14 right-4 z-10 w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            onPress={() => setViewingPhoto(null)}
          >
            <X size={22} color="#fff" />
          </TouchableOpacity>
          {viewingPhoto && (
            <View className="items-center">
              <Image
                source={{ uri: viewingPhoto.url }}
                style={{
                  width: screenWidth - 32,
                  height: screenWidth - 32,
                }}
                resizeMode="contain"
              />
              <View className="mt-4 items-center">
                {viewingPhoto.caption && (
                  <Text className="text-white text-base mb-1">
                    {viewingPhoto.caption}
                  </Text>
                )}
                <Text className="text-white/60 text-sm">
                  {formatFullDate(viewingPhoto.takenAt)}
                  {viewingPhoto.category
                    ? ` · ${viewingPhoto.category}`
                    : ""}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MeasurementPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center bg-gray-50 dark:bg-slate-950 rounded-lg px-3 py-2">
      {icon}
      <View className="ml-2">
        <Text className="text-xs text-gray-500 dark:text-slate-400">{label}</Text>
        <Text className="text-sm font-semibold text-gray-900 dark:text-slate-50">{value}</Text>
      </View>
    </View>
  );
}
