import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
  Globe,
  Phone,
  Mail,
  Building2,
  Clock,
  Languages,
  Ruler,
  DollarSign,
  FileText,
  Calendar,
  Megaphone,
  MessageSquare,
  ChevronRight,
} from "lucide-react-native";
import { useSettings } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Sarajevo",
  "Asia/Dubai", "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland",
];

const LOCALES = [
  { value: "en", label: "English" },
  { value: "bs", label: "Bosanski" },
  { value: "sr", label: "Srpski" },
  { value: "hr", label: "Hrvatski" },
];

const UNITS = [
  { value: "metric", label: "Metric (kg, cm)" },
  { value: "imperial", label: "Imperial (lbs, in)" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "BAM", "RSD", "HRK", "AUD", "CAD"];

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, error, refetch, isRefetching } = useSettings();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [timezone, setTimezone] = useState("");
  const [locale, setLocale] = useState("");
  const [units, setUnits] = useState("");
  const [currency, setCurrency] = useState("");
  const [showTimezones, setShowTimezones] = useState(false);

  useEffect(() => {
    if (settings) {
      setName(settings.name || "");
      setBio(settings.bio || "");
      setEmail(settings.email || "");
      setPhone(settings.phone || "");
      setWebsite(settings.website || "");
      setTimezone(settings.timezone || "");
      setLocale(settings.locale || "en");
      setUnits(settings.units || "metric");
      setCurrency(settings.currency || "USD");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.put("/api/settings", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      Alert.alert("Saved", "Settings updated successfully");
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to save"),
  });

  const handleSave = () => {
    saveMutation.mutate({
      name: name.trim(),
      bio: bio.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      timezone,
      locale,
      units,
      currency,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <Header onSave={handleSave} saving={false} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <Header onSave={handleSave} saving={false} />
        <QueryError message="Failed to load settings" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Header onSave={handleSave} saving={saveMutation.isPending} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />
          }
        >
          {/* Quick Links */}
          <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
            <NavLink icon={Calendar} label="Availability" href="/(coach)/settings-availability" />
            <NavLink icon={Megaphone} label="Landing Page" href="/(coach)/settings-landing" />
            <NavLink icon={MessageSquare} label="Inquiries" href="/(coach)/settings-inquiries" last />
          </View>

          {/* Business Info */}
          <SectionTitle icon={Building2} title="Business Info" />
          <View className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
            <Label text="Business Name" />
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-base text-gray-900 mb-3"
              value={name}
              onChangeText={setName}
              placeholder="Your business name"
              placeholderTextColor="#9ca3af"
            />
            <Label text="Bio" />
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-base text-gray-900"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell clients about yourself..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 80 }}
            />
          </View>

          {/* Contact */}
          <SectionTitle icon={Phone} title="Contact" />
          <View className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
            <Label text="Email" />
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-base text-gray-900 mb-3"
              value={email}
              onChangeText={setEmail}
              placeholder="contact@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Label text="Phone" />
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-base text-gray-900 mb-3"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555-0123"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />
            <Label text="Website" />
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-base text-gray-900"
              value={website}
              onChangeText={setWebsite}
              placeholder="https://yoursite.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* Preferences */}
          <SectionTitle icon={Globe} title="Preferences" />
          <View className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
            <Label text="Timezone" />
            <TouchableOpacity
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-1"
              onPress={() => setShowTimezones(!showTimezones)}
            >
              <Text className="text-base text-gray-900">
                {timezone || "Select timezone..."}
              </Text>
            </TouchableOpacity>
            {showTimezones && (
              <View className="bg-white border border-gray-200 rounded-lg mb-3 max-h-48">
                <ScrollView nestedScrollEnabled>
                  {TIMEZONES.map((tz) => (
                    <TouchableOpacity
                      key={tz}
                      className={`px-3 py-2.5 border-b border-gray-50 ${tz === timezone ? "bg-brand-50" : ""}`}
                      onPress={() => { setTimezone(tz); setShowTimezones(false); }}
                    >
                      <Text className="text-sm text-gray-900">{tz}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {!showTimezones && <View className="mb-2" />}

            <Label text="Language" />
            <View className="flex-row flex-wrap mb-3">
              {LOCALES.map((l) => (
                <TouchableOpacity
                  key={l.value}
                  className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${locale === l.value ? "bg-brand-600" : "bg-gray-100"}`}
                  onPress={() => setLocale(l.value)}
                >
                  <Text className={`text-xs font-medium ${locale === l.value ? "text-white" : "text-gray-700"}`}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Label text="Units" />
            <View className="flex-row mb-3">
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u.value}
                  className={`mr-2 px-3 py-1.5 rounded-full ${units === u.value ? "bg-brand-600" : "bg-gray-100"}`}
                  onPress={() => setUnits(u.value)}
                >
                  <Text className={`text-xs font-medium ${units === u.value ? "text-white" : "text-gray-700"}`}>
                    {u.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Label text="Currency" />
            <View className="flex-row flex-wrap">
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${currency === c ? "bg-brand-600" : "bg-gray-100"}`}
                  onPress={() => setCurrency(c)}
                >
                  <Text className={`text-xs font-medium ${currency === c ? "text-white" : "text-gray-700"}`}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
      <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
        <ArrowLeft size={22} color="#111827" />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-gray-900 flex-1">Settings</Text>
      <TouchableOpacity
        onPress={onSave}
        disabled={saving}
        className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center"
        activeOpacity={0.7}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Save size={14} color="#fff" />
            <Text className="text-white text-xs font-semibold ml-1">Save</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function NavLink({ icon: Icon, label, href, last }: { icon: any; label: string; href: string; last?: boolean }) {
  return (
    <TouchableOpacity
      className={`flex-row items-center px-4 py-3.5 ${last ? "" : "border-b border-gray-100"}`}
      onPress={() => router.push(href as never)}
      activeOpacity={0.6}
    >
      <Icon size={20} color="#6b7280" />
      <Text className="flex-1 ml-3 text-base text-gray-900">{label}</Text>
      <ChevronRight size={18} color="#d1d5db" />
    </TouchableOpacity>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <View className="flex-row items-center mb-2">
      <Icon size={16} color="#059669" />
      <Text className="text-sm font-semibold text-gray-900 ml-1.5">{title}</Text>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text className="text-xs font-medium text-gray-500 mb-1">{text}</Text>;
}
