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
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";

export default function LandingPageScreen() {
  const t = useT();
  const colors = useThemeColors();
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
      Alert.alert(t.common.success, t.settings.settingsSaved);
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message),
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
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Header saving={false} disabled={true} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Header saving={false} disabled={true} />
        <QueryError message={t.errors.failedToLoad} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <Header onSave={handleSave} saving={saveMutation.isPending} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
        >
          {/* Enable Toggle */}
          <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-4 mb-5 flex-row items-center justify-between">
            <Text className="text-base font-medium text-gray-900 dark:text-slate-50">{t.settings.landingPage} Enabled</Text>
            <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: "#059669" }} />
          </View>

          {/* Specialties */}
          <Text className="text-sm font-semibold text-gray-900 dark:text-slate-50 mb-2">Specialties</Text>
          <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-4 mb-5">
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
                className="flex-1 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50 mr-2"
                value={newSpecialty}
                onChangeText={setNewSpecialty}
                placeholder="Add specialty..."
                placeholderTextColor={colors.iconMuted}
                onSubmitEditing={addSpecialty}
              />
              <TouchableOpacity className="bg-brand-600 rounded-lg px-3 justify-center" onPress={addSpecialty}>
                <Plus size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Social Links */}
          <Text className="text-sm font-semibold text-gray-900 dark:text-slate-50 mb-2">Social Links</Text>
          <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-4 mb-5">
            {["instagram", "facebook", "tiktok", "youtube", "linkedin"].map((platform) => (
              <View key={platform} className="mb-3">
                <Text className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 capitalize">{platform}</Text>
                <TextInput
                  className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-50"
                  value={socialLinks[platform] || ""}
                  onChangeText={(v) => setSocialLinks({ ...socialLinks, [platform]: v })}
                  placeholder={`https://${platform}.com/...`}
                  placeholderTextColor={colors.iconMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            ))}
          </View>

          {/* Certificates */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-gray-900 dark:text-slate-50">Certificates</Text>
            <TouchableOpacity onPress={() => setShowCertForm(true)}>
              <Plus size={18} color={colors.brand} />
            </TouchableOpacity>
          </View>
          <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 overflow-hidden mb-5">
            {(certificates || []).length === 0 ? (
              <View className="p-4 items-center">
                <Text className="text-xs text-gray-400 dark:text-slate-500">No certificates added</Text>
              </View>
            ) : (
              (certificates || []).map((cert, i) => (
                <View key={cert.id} className={`flex-row items-center px-4 py-3 ${i < (certificates?.length || 0) - 1 ? "border-b border-gray-50 dark:border-slate-700/40" : ""}`}>
                  <Award size={16} color={colors.icon} />
                  <View className="flex-1 ml-2">
                    <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">{cert.name}</Text>
                    {cert.issuer && <Text className="text-xs text-gray-500 dark:text-slate-400">{cert.issuer}{cert.year ? ` (${cert.year})` : ""}</Text>}
                  </View>
                  <TouchableOpacity
                    onPress={() => Alert.alert(t.common.delete, "Remove this certificate?", [
                      { text: t.common.cancel, style: "cancel" },
                      { text: t.common.delete, style: "destructive", onPress: () => deleteCertMutation.mutate(cert.id) },
                    ])}
                  >
                    <Trash2 size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Packages */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-gray-900 dark:text-slate-50">Packages</Text>
            <TouchableOpacity onPress={() => setShowPackageForm(true)}>
              <Plus size={18} color={colors.brand} />
            </TouchableOpacity>
          </View>
          <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 overflow-hidden mb-5">
            {(packages || []).length === 0 ? (
              <View className="p-4 items-center">
                <Text className="text-xs text-gray-400 dark:text-slate-500">No packages added</Text>
              </View>
            ) : (
              (packages || []).map((pkg, i) => (
                <View key={pkg.id} className={`flex-row items-center px-4 py-3 ${i < (packages?.length || 0) - 1 ? "border-b border-gray-50 dark:border-slate-700/40" : ""}`}>
                  <Package size={16} color={colors.icon} />
                  <View className="flex-1 ml-2">
                    <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">{pkg.name}</Text>
                    <Text className="text-xs text-gray-500 dark:text-slate-400">{pkg.currency} {pkg.price.toFixed(2)}{pkg.duration ? ` / ${pkg.duration}` : ""}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => Alert.alert(t.common.delete, "Remove this package?", [
                      { text: t.common.cancel, style: "cancel" },
                      { text: t.common.delete, style: "destructive", onPress: () => deletePackageMutation.mutate(pkg.id) },
                    ])}
                  >
                    <Trash2 size={16} color={colors.destructive} />
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
  const t = useT();
  const colors = useThemeColors();
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
    onError: (err: any) => Alert.alert(t.common.error, err.message),
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
            if (!name.trim()) return Alert.alert(t.common.required, t.common.name);
            mutation.mutate({ name: name.trim(), issuer: issuer.trim() || null, year: year ? parseInt(year) : null });
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{t.common.add}</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.name} *</Text>
      <TextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={name} onChangeText={setName} placeholder="e.g. NASM CPT" placeholderTextColor={colors.iconMuted} />
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Issuer</Text>
      <TextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={issuer} onChangeText={setIssuer} placeholder="e.g. NASM" placeholderTextColor={colors.iconMuted} />
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Year</Text>
      <TextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={year} onChangeText={setYear} placeholder="2024" placeholderTextColor={colors.iconMuted} keyboardType="number-pad" />
    </AppBottomSheet>
  );
}

function PackageFormModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();
  const colors = useThemeColors();
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
    onError: (err: any) => Alert.alert(t.common.error, err.message),
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
            if (!name.trim()) return Alert.alert(t.common.required, t.common.name);
            const p = parseFloat(price);
            if (isNaN(p) || p < 0) return Alert.alert(t.common.required, "Valid price is required");
            mutation.mutate({ name: name.trim(), price: p, duration: duration.trim() || null, description: description.trim() || null });
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{t.common.add}</Text>}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.name} *</Text>
      <TextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={name} onChangeText={setName} placeholder="e.g. Monthly Coaching" placeholderTextColor={colors.iconMuted} />
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Price *</Text>
      <TextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={price} onChangeText={setPrice} placeholder="99.00" placeholderTextColor={colors.iconMuted} keyboardType="decimal-pad" />
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Duration</Text>
      <TextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={duration} onChangeText={setDuration} placeholder="e.g. monthly, 12 sessions" placeholderTextColor={colors.iconMuted} />
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.description}</Text>
      <TextInput className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50" value={description} onChangeText={setDescription} placeholder="What's included..." placeholderTextColor={colors.iconMuted} multiline numberOfLines={3} textAlignVertical="top" style={{ minHeight: 80 }} />
    </AppBottomSheet>
  );
}

function Header({ onSave, saving, disabled }: { onSave?: () => void; saving?: boolean; disabled?: boolean }) {
  const t = useT();
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
      <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
        <ArrowLeft size={22} color={colors.text} />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50 flex-1">{t.settings.landingPage}</Text>
      {onSave && !disabled && (
        <TouchableOpacity onPress={onSave} disabled={saving} className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center" activeOpacity={0.7}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={14} color="#fff" /><Text className="text-white text-xs font-semibold ml-1">{t.common.save}</Text></>}
        </TouchableOpacity>
      )}
    </View>
  );
}
