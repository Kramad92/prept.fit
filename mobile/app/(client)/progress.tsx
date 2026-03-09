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
  Dimensions,
  Modal,
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
import type { ProgressPhoto, MeasurementData } from "@/types/api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PHOTO_SIZE = (SCREEN_WIDTH - 48 - 8) / 3; // 3 cols, 16px padding each side, 4px gaps

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
      Alert.alert("Uploaded", "Progress photo added successfully.");
    },
    onError: (err) => {
      setUploading(false);
      haptics.error();
      Alert.alert("Error", err instanceof Error ? err.message : "Upload failed");
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
      { text: "Cancel", style: "cancel" },
    ]);
  }, [takePhoto, pickImage]);

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
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <ArrowLeft size={22} color="#111827" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Progress</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900">
          Progress
        </Text>
        {tab === "photos" && (
          <TouchableOpacity
            onPress={handleAddPhoto}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <Camera size={22} color="#059669" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Tab switcher */}
      <View className="flex-row px-4 pt-3 pb-1 bg-white">
        <TouchableOpacity
          className={`flex-1 py-2 items-center border-b-2 ${
            tab === "photos" ? "border-brand-600" : "border-transparent"
          }`}
          onPress={() => setTab("photos")}
        >
          <View className="flex-row items-center">
            <ImageIcon
              size={16}
              color={tab === "photos" ? "#059669" : "#6b7280"}
            />
            <Text
              className={`ml-1.5 font-medium ${
                tab === "photos" ? "text-brand-600" : "text-gray-500"
              }`}
            >
              Photos
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
              color={tab === "measurements" ? "#059669" : "#6b7280"}
            />
            <Text
              className={`ml-1.5 font-medium ${
                tab === "measurements" ? "text-brand-600" : "text-gray-500"
              }`}
            >
              Measurements
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
            tintColor="#059669"
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
                      : "bg-white border border-gray-200"
                  }`}
                  onPress={() => setCategoryFilter(cat)}
                >
                  <Text
                    className={`text-sm font-medium capitalize ${
                      categoryFilter === cat ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {photos.length === 0 ? (
              <View className="items-center py-16">
                <ImageIcon size={48} color="#d1d5db" />
                <Text className="text-gray-400 mt-3 text-base">
                  No progress photos yet
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
                      style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}
                      className="rounded-lg bg-gray-200"
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
              <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
                <Text className="text-sm font-medium text-gray-500 mb-3">
                  Latest — {formatFullDate(latestMeasurement.date)}
                </Text>
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  {latestMeasurement.weight != null && (
                    <MeasurementPill
                      icon={<Scale size={14} color="#059669" />}
                      label="Weight"
                      value={`${latestMeasurement.weight} kg`}
                    />
                  )}
                  {latestMeasurement.bodyFat != null && (
                    <MeasurementPill
                      icon={<TrendingUp size={14} color="#3b82f6" />}
                      label="Body Fat"
                      value={`${latestMeasurement.bodyFat}%`}
                    />
                  )}
                  {latestMeasurement.chest != null && (
                    <MeasurementPill
                      icon={<Ruler size={14} color="#8b5cf6" />}
                      label="Chest"
                      value={`${latestMeasurement.chest} cm`}
                    />
                  )}
                  {latestMeasurement.waist != null && (
                    <MeasurementPill
                      icon={<Ruler size={14} color="#f59e0b" />}
                      label="Waist"
                      value={`${latestMeasurement.waist} cm`}
                    />
                  )}
                  {latestMeasurement.hips != null && (
                    <MeasurementPill
                      icon={<Ruler size={14} color="#ec4899" />}
                      label="Hips"
                      value={`${latestMeasurement.hips} cm`}
                    />
                  )}
                  {latestMeasurement.arms != null && (
                    <MeasurementPill
                      icon={<Ruler size={14} color="#14b8a6" />}
                      label="Arms"
                      value={`${latestMeasurement.arms} cm`}
                    />
                  )}
                  {latestMeasurement.thighs != null && (
                    <MeasurementPill
                      icon={<Ruler size={14} color="#6366f1" />}
                      label="Thighs"
                      value={`${latestMeasurement.thighs} cm`}
                    />
                  )}
                </View>
              </View>
            )}

            {/* Weight trend chart */}
            {weightData.length >= 2 && (
              <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
                <Text className="text-base font-semibold text-gray-900 mb-3">
                  Weight Trend
                </Text>
                <LineChart
                  data={weightData}
                  width={SCREEN_WIDTH - 80}
                  height={180}
                  color={Colors.brand[600]}
                  dataPointsColor={Colors.brand[600]}
                  thickness={2}
                  startFillColor={Colors.brand[100]}
                  endFillColor={Colors.brand[50]}
                  areaChart
                  curved
                  hideRules
                  yAxisTextStyle={{ color: "#6b7280", fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: "#9ca3af", fontSize: 9 }}
                  spacing={(SCREEN_WIDTH - 100) / Math.max(weightData.length - 1, 1)}
                  noOfSections={4}
                  isAnimated
                />
              </View>
            )}

            {/* Body fat trend chart */}
            {bodyFatData.length >= 2 && (
              <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
                <Text className="text-base font-semibold text-gray-900 mb-3">
                  Body Fat Trend
                </Text>
                <LineChart
                  data={bodyFatData}
                  width={SCREEN_WIDTH - 80}
                  height={180}
                  color="#3b82f6"
                  dataPointsColor="#3b82f6"
                  thickness={2}
                  startFillColor="#bfdbfe"
                  endFillColor="#eff6ff"
                  areaChart
                  curved
                  hideRules
                  yAxisTextStyle={{ color: "#6b7280", fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: "#9ca3af", fontSize: 9 }}
                  spacing={(SCREEN_WIDTH - 100) / Math.max(bodyFatData.length - 1, 1)}
                  noOfSections={4}
                  isAnimated
                />
              </View>
            )}

            {/* All measurements table */}
            {measurements.length > 0 ? (
              <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                <Text className="text-base font-semibold text-gray-900 px-4 pt-4 pb-2">
                  History
                </Text>
                {[...measurements].reverse().map((m, i) => (
                  <View
                    key={m.id}
                    className={`px-4 py-3 ${
                      i < measurements.length - 1 ? "border-b border-gray-50" : ""
                    }`}
                  >
                    <Text className="text-sm font-medium text-gray-900 mb-1">
                      {formatFullDate(m.date)}
                    </Text>
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                      {m.weight != null && (
                        <Text className="text-xs text-gray-500">
                          Weight: {m.weight}kg
                        </Text>
                      )}
                      {m.bodyFat != null && (
                        <Text className="text-xs text-gray-500">
                          BF: {m.bodyFat}%
                        </Text>
                      )}
                      {m.chest != null && (
                        <Text className="text-xs text-gray-500">
                          Chest: {m.chest}cm
                        </Text>
                      )}
                      {m.waist != null && (
                        <Text className="text-xs text-gray-500">
                          Waist: {m.waist}cm
                        </Text>
                      )}
                      {m.hips != null && (
                        <Text className="text-xs text-gray-500">
                          Hips: {m.hips}cm
                        </Text>
                      )}
                      {m.arms != null && (
                        <Text className="text-xs text-gray-500">
                          Arms: {m.arms}cm
                        </Text>
                      )}
                      {m.thighs != null && (
                        <Text className="text-xs text-gray-500">
                          Thighs: {m.thighs}cm
                        </Text>
                      )}
                    </View>
                    {m.notes && (
                      <Text className="text-xs text-gray-400 mt-1">
                        {m.notes}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View className="items-center py-16">
                <TrendingUp size={48} color="#d1d5db" />
                <Text className="text-gray-400 mt-3 text-base">
                  No measurements recorded yet
                </Text>
                <Text className="text-gray-400 text-sm mt-1">
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
                  width: SCREEN_WIDTH - 32,
                  height: SCREEN_WIDTH - 32,
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
    <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-2">
      {icon}
      <View className="ml-2">
        <Text className="text-xs text-gray-500">{label}</Text>
        <Text className="text-sm font-semibold text-gray-900">{value}</Text>
      </View>
    </View>
  );
}
