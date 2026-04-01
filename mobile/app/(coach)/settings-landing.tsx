import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Trash2,
  Award,
  Package,
  Instagram,
  Linkedin,
  Globe,
} from "lucide-react-native";
import { useSettings, useCertificates, usePackages } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { AppBottomSheet } from "@/components/app-bottom-sheet";

export default function LandingPageScreen() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, error, refetch, isRefetching } = useSettings();
  const { data: certificates } = useCertificates();
  const { data: packages } = usePackages();

  const [enabled, setEnabled] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [showCertForm, setShowCertForm] = useState(false);
  const [showPackageForm, setShowPackageForm] = useState(false);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.landingPageEnabled);
      setSpecialties(settings.specialties || []);
      setSocialLinks(settings.socialLinks || {});
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.put("/api/settings/landing-page", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      Alert.alert("Saved", "Landing page updated");
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const deleteCertMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/settings/certificates/${id}`),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/settings/packages/${id}`),
    onSuccess: () => {
      haptics.light();
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      landingPageEnabled: enabled,
      specialties: specialties.length > 0 ? specialties : null,
      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null,
    });
  };

  const addSpecialty = () => {
    const s = newSpecialty.trim();
    if (s && !specialties.includes(s)) {
      setSpecialties([...specialties, s]);
      setNewSpecialty("");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <Header saving={false} disabled={true} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <Header saving={false} disabled={true} />
        <QueryError message="Failed to load" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Header onSave={handleSave} saving={saveMutation.isPending} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />}
        >
          {/* Enable Toggle */}
          <View className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex-row items-center justify-between">
            <Text className="text-base font-medium text-gray-900">Landing Page Enabled</Text>
            <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: "#059669" }} />
          </View>

          {/* Specialties */}
          <Text className="text-sm font-semibold text-gray-900 mb-2">Specialties</Text>
          <View className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
            <View className="flex-row flex-wrap mb-2">
              {specialties.map((s, i) => (
                <View key={i} className="flex-row items-center bg-brand-50 rounded-full px-3 py-1 mr-2 mb-2">
                  <Text className="text-xs text-brand-700 mr-1">{s}</Text>
                  <TouchableOpacity onPress={() => setSpecialties(specialties.filter((_, j) => j !== i))}>
                    <X size={12} color="#059669" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View className="flex-row">
              <TextInput
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 mr-2"
                value={newSpecialty}
                onChangeText={setNewSpecialty}
                placeholder="Add specialty..."
                placeholderTextColor="#9ca3af"
                onSubmitEditing={addSpecialty}
              />
              <TouchableOpacity className="bg-brand-600 rounded-lg px-3 justify-center" onPress={addSpecialty}>
                <Plus size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Social Links */}
          <Text className="text-sm font-semibold text-gray-900 mb-2">Social Links</Text>
          <View className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
            {["instagram", "facebook", "tiktok", "youtube", "linkedin"].map((platform) => (
              <View key={platform} className="mb-3">
                <Text className="text-xs font-medium text-gray-500 mb-1 capitalize">{platform}</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
                  value={socialLinks[platform] || ""}
                  onChangeText={(v) => setSocialLinks({ ...socialLinks, [platform]: v })}
                  placeholder={`https://${platform}.com/...`}
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            ))}
          </View>

          {/* Certificates */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-gray-900">Certificates</Text>
            <TouchableOpacity onPress={() => setShowCertForm(true)}>
              <Plus size={18} color="#059669" />
            </TouchableOpacity>
          </View>
          <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-5">
            {(certificates || []).length === 0 ? (
              <View className="p-4 items-center">
                <Text className="text-xs text-gray-400">No certificates added</Text>
              </View>
            ) : (
              (certificates || []).map((cert, i) => (
                <View key={cert.id} className={`flex-row items-center px-4 py-3 ${i < (certificates?.length || 0) - 1 ? "border-b border-gray-50" : ""}`}>
                  <Award size={16} color="#6b7280" />
                  <View className="flex-1 ml-2">
                    <Text className="text-sm font-medium text-gray-900">{cert.name}</Text>
                    {cert.issuer && <Text className="text-xs text-gray-500">{cert.issuer}{cert.year ? ` (${cert.year})` : ""}</Text>}
                  </View>
                  <TouchableOpacity
                    onPress={() => Alert.alert("Delete", "Remove this certificate?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deleteCertMutation.mutate(cert.id) },
                    ])}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Packages */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-gray-900">Packages</Text>
            <TouchableOpacity onPress={() => setShowPackageForm(true)}>
              <Plus size={18} color="#059669" />
            </TouchableOpacity>
          </View>
          <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-5">
            {(packages || []).length === 0 ? (
              <View className="p-4 items-center">
                <Text className="text-xs text-gray-400">No packages added</Text>
              </View>
            ) : (
              (packages || []).map((pkg, i) => (
                <View key={pkg.id} className={`flex-row items-center px-4 py-3 ${i < (packages?.length || 0) - 1 ? "border-b border-gray-50" : ""}`}>
                  <Package size={16} color="#6b7280" />
                  <View className="flex-1 ml-2">
                    <Text className="text-sm font-medium text-gray-900">{pkg.name}</Text>
                    <Text className="text-xs text-gray-500">{pkg.currency} {pkg.price.toFixed(2)}{pkg.duration ? ` / ${pkg.duration}` : ""}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => Alert.alert("Delete", "Remove this package?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deletePackageMutation.mutate(pkg.id) },
                    ])}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CertificateFormModal visible={showCertForm} onClose={() => setShowCertForm(false)} />
      <PackageFormModal visible={showPackageForm} onClose={() => setShowPackageForm(false)} />
    </SafeAreaView>
  );
}

function CertificateFormModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [year, setYear] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/api/settings/certificates", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      setName(""); setIssuer(""); setYear("");
      onClose();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={() => { setName(""); setIssuer(""); setYear(""); onClose(); }}
      snapPoints={["50%", "85%"]}
      title="Add Certificate"
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => {
            if (!name.trim()) return Alert.alert("Required", "Name is required");
            mutation.mutate({ name: name.trim(), issuer: issuer.trim() || null, year: year ? parseInt(year) : null });
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Add Certificate</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 mb-1">Name *</Text>
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={name} onChangeText={setName} placeholder="e.g. NASM CPT" placeholderTextColor="#9ca3af" />
      <Text className="text-sm font-medium text-gray-700 mb-1">Issuer</Text>
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={issuer} onChangeText={setIssuer} placeholder="e.g. NASM" placeholderTextColor="#9ca3af" />
      <Text className="text-sm font-medium text-gray-700 mb-1">Year</Text>
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={year} onChangeText={setYear} placeholder="2024" placeholderTextColor="#9ca3af" keyboardType="number-pad" />
    </AppBottomSheet>
  );
}

function PackageFormModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/api/settings/packages", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      setName(""); setPrice(""); setDuration(""); setDescription("");
      onClose();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  return (
    <AppBottomSheet
      visible={visible}
      onClose={() => { setName(""); setPrice(""); setDuration(""); setDescription(""); onClose(); }}
      snapPoints={["50%", "85%"]}
      title="Add Package"
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${mutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={() => {
            if (!name.trim()) return Alert.alert("Required", "Name is required");
            const p = parseFloat(price);
            if (isNaN(p) || p < 0) return Alert.alert("Required", "Valid price is required");
            mutation.mutate({ name: name.trim(), price: p, duration: duration.trim() || null, description: description.trim() || null });
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Add Package</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 mb-1">Name *</Text>
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={name} onChangeText={setName} placeholder="e.g. Monthly Coaching" placeholderTextColor="#9ca3af" />
      <Text className="text-sm font-medium text-gray-700 mb-1">Price *</Text>
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={price} onChangeText={setPrice} placeholder="99.00" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" />
      <Text className="text-sm font-medium text-gray-700 mb-1">Duration</Text>
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={duration} onChangeText={setDuration} placeholder="e.g. monthly, 12 sessions" placeholderTextColor="#9ca3af" />
      <Text className="text-sm font-medium text-gray-700 mb-1">Description</Text>
      <TextInput className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900" value={description} onChangeText={setDescription} placeholder="What's included..." placeholderTextColor="#9ca3af" multiline numberOfLines={3} textAlignVertical="top" style={{ minHeight: 80 }} />
    </AppBottomSheet>
  );
}

function Header({ onSave, saving, disabled }: { onSave?: () => void; saving?: boolean; disabled?: boolean }) {
  return (
    <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
      <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
        <ArrowLeft size={22} color="#111827" />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-gray-900 flex-1">Landing Page</Text>
      {onSave && !disabled && (
        <TouchableOpacity onPress={onSave} disabled={saving} className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center" activeOpacity={0.7}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={14} color="#fff" /><Text className="text-white text-xs font-semibold ml-1">Save</Text></>}
        </TouchableOpacity>
      )}
    </View>
  );
}
