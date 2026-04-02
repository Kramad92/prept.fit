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
import { useT, useLocale, type Locale } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useTheme, type ThemeMode } from "@/lib/theme-context";
import { Sun, Moon, Smartphone } from "lucide-react-native";

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
  const t = useT();
  const colors = useThemeColors();
  const { setLocale: setAppLocale } = useLocale();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
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
      Alert.alert(t.common.success, t.settings.settingsSaved);
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message || t.errors.failedToSave),
  });

  const handleSave = () => {
    saveMutation.mutate({
      name: name.trim(),
      bio: bio.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      website: website.trim() || undefined,
      timezone,
      locale,
      units,
      currency,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Header onSave={handleSave} saving={false} disabled={true} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Header onSave={handleSave} saving={false} disabled={true} />
        <QueryError message={t.errors.failedToLoad} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
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
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />
          }
        >
          {/* Quick Links */}
          <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 overflow-hidden mb-6">
            <NavLink icon={Calendar} label={t.settings.availability} href="/(coach)/settings-availability" />
            <NavLink icon={Megaphone} label={t.settings.landingPage} href="/(coach)/settings-landing" />
            <NavLink icon={MessageSquare} label="Inquiries" href="/(coach)/settings-inquiries" last />
          </View>

          {/* Business Info */}
          <SectionTitle icon={Building2} title={t.settings.businessName} />
          <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-4 mb-5">
            <Label text={t.settings.businessName} />
            <TextInput
              className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-base text-gray-900 dark:text-slate-50 mb-3"
              value={name}
              onChangeText={setName}
              placeholder={t.settings.businessNamePlaceholder}
              placeholderTextColor={colors.iconMuted}
            />
            <Label text={t.settings.bio} />
            <TextInput
              className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-base text-gray-900 dark:text-slate-50"
              value={bio}
              onChangeText={setBio}
              placeholder={t.settings.bioPlaceholder}
              placeholderTextColor={colors.iconMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 80 }}
            />
          </View>

          {/* Contact */}
          <SectionTitle icon={Phone} title={t.settings.contactInfo} />
          <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-4 mb-5">
            <Label text={t.common.email} />
            <TextInput
              className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-base text-gray-900 dark:text-slate-50 mb-3"
              value={email}
              onChangeText={setEmail}
              placeholder="contact@example.com"
              placeholderTextColor={colors.iconMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Label text={t.common.phone} />
            <TextInput
              className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-base text-gray-900 dark:text-slate-50 mb-3"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555-0123"
              placeholderTextColor={colors.iconMuted}
              keyboardType="phone-pad"
            />
            <Label text={t.settings.website} />
            <TextInput
              className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-base text-gray-900 dark:text-slate-50"
              value={website}
              onChangeText={setWebsite}
              placeholder="https://yoursite.com"
              placeholderTextColor={colors.iconMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* Appearance */}
          <SectionTitle icon={Sun} title={t.settings.appearance} />
          <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-4 mb-5">
            <Label text={t.common.theme} />
            <View className="flex-row mb-1">
              {([
                { value: "light" as ThemeMode, label: t.settings.lightMode, icon: Sun },
                { value: "dark" as ThemeMode, label: t.settings.darkMode, icon: Moon },
                { value: "system" as ThemeMode, label: t.settings.systemMode, icon: Smartphone },
              ]).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  className={`mr-2 px-3 py-1.5 rounded-full flex-row items-center ${themeMode === opt.value ? "bg-brand-600" : "bg-gray-100 dark:bg-slate-700"}`}
                  onPress={() => setThemeMode(opt.value)}
                >
                  <opt.icon size={12} color={themeMode === opt.value ? "#fff" : colors.icon} />
                  <Text className={`text-xs font-medium ml-1 ${themeMode === opt.value ? "text-white" : "text-gray-700 dark:text-slate-200"}`}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preferences */}
          <SectionTitle icon={Globe} title={t.settings.preferences} />
          <View className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/40 p-4 mb-5">
            <Label text={t.settings.timezone} />
            <TouchableOpacity
              className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 mb-1"
              onPress={() => setShowTimezones(!showTimezones)}
            >
              <Text className="text-base text-gray-900 dark:text-slate-50">
                {timezone || "Select timezone..."}
              </Text>
            </TouchableOpacity>
            {showTimezones && (
              <View className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg mb-3 max-h-48">
                <ScrollView nestedScrollEnabled>
                  {TIMEZONES.map((tz) => (
                    <TouchableOpacity
                      key={tz}
                      className={`px-3 py-2.5 border-b border-gray-50 dark:border-slate-700/40 ${tz === timezone ? "bg-brand-50 dark:bg-brand-900/20" : ""}`}
                      onPress={() => { setTimezone(tz); setShowTimezones(false); }}
                    >
                      <Text className="text-sm text-gray-900 dark:text-slate-50">{tz}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {!showTimezones && <View className="mb-2" />}

            <Label text={t.common.language} />
            <View className="flex-row flex-wrap mb-3">
              {LOCALES.map((l) => (
                <TouchableOpacity
                  key={l.value}
                  className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${locale === l.value ? "bg-brand-600" : "bg-gray-100 dark:bg-slate-700"}`}
                  onPress={() => { setLocale(l.value); setAppLocale(l.value as Locale); }}
                >
                  <Text className={`text-xs font-medium ${locale === l.value ? "text-white" : "text-gray-700 dark:text-slate-200"}`}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Label text={t.settings.units} />
            <View className="flex-row mb-3">
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u.value}
                  className={`mr-2 px-3 py-1.5 rounded-full ${units === u.value ? "bg-brand-600" : "bg-gray-100 dark:bg-slate-700"}`}
                  onPress={() => setUnits(u.value)}
                >
                  <Text className={`text-xs font-medium ${units === u.value ? "text-white" : "text-gray-700 dark:text-slate-200"}`}>
                    {u.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Label text={t.settings.currency} />
            <View className="flex-row flex-wrap">
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${currency === c ? "bg-brand-600" : "bg-gray-100 dark:bg-slate-700"}`}
                  onPress={() => setCurrency(c)}
                >
                  <Text className={`text-xs font-medium ${currency === c ? "text-white" : "text-gray-700 dark:text-slate-200"}`}>
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

function Header({ onSave, saving, disabled }: { onSave: () => void; saving: boolean; disabled?: boolean }) {
  const t = useT();
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40">
      <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
        <ArrowLeft size={22} color={colors.text} />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50 flex-1">{t.settings.title}</Text>
      <TouchableOpacity
        onPress={onSave}
        disabled={saving || disabled}
        className={`rounded-lg px-3 py-1.5 flex-row items-center ${disabled ? "bg-gray-300 dark:bg-slate-600" : "bg-brand-600"}`}
        activeOpacity={0.7}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Save size={14} color="#fff" />
            <Text className="text-white text-xs font-semibold ml-1">{t.common.save}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function NavLink({ icon: Icon, label, href, last }: { icon: any; label: string; href: string; last?: boolean }) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      className={`flex-row items-center px-4 py-3.5 ${last ? "" : "border-b border-gray-100 dark:border-slate-700/40"}`}
      onPress={() => router.push(href as any)}
      activeOpacity={0.6}
    >
      <Icon size={20} color={colors.icon} />
      <Text className="flex-1 ml-3 text-base text-gray-900 dark:text-slate-50">{label}</Text>
      <ChevronRight size={18} color={colors.iconMuted} />
    </TouchableOpacity>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center mb-2">
      <Icon size={16} color={colors.brand} />
      <Text className="text-sm font-semibold text-gray-900 dark:text-slate-50 ml-1.5">{title}</Text>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{text}</Text>;
}
