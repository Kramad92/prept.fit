import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";

export default function ForgotPasswordScreen() {
  const t = useT();
  const colors = useThemeColors();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (e: any) {
      setError(e.message || t.errors.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white dark:bg-slate-800">
        <View className="flex-1 justify-center px-8">
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/25 items-center justify-center mb-4">
              <CheckCircle size={32} color={colors.brand} />
            </View>
            <Text className="text-xl font-bold text-gray-900 dark:text-slate-50 mb-2">{t.auth.resetLinkSent.split(".")[0]}</Text>
            <Text className="text-sm text-gray-500 dark:text-slate-400 text-center">
              {t.auth.resetLinkSent}
            </Text>
          </View>
          <TouchableOpacity
            className="rounded-lg py-3.5 items-center bg-brand-600"
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-base">{t.auth.backToLogin}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white dark:bg-slate-800">
      <View className="flex-1 justify-center px-8">
        <TouchableOpacity onPress={() => router.back()} className="absolute top-16 left-6 p-2">
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>

        <View className="items-center mb-6">
          <View className="w-14 h-14 rounded-full bg-brand-50 items-center justify-center mb-4">
            <Mail size={28} color={colors.brand} />
          </View>
          <Text className="text-xl font-bold text-gray-900 dark:text-slate-50 mb-1">{t.auth.forgotPasswordTitle}</Text>
          <Text className="text-sm text-gray-500 dark:text-slate-400 text-center">
            {t.auth.forgotPasswordSubtitle}
          </Text>
        </View>

        {error ? (
          <View className="bg-red-50 dark:bg-red-900/25 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <Text className="text-red-700 dark:text-red-300 text-sm">{error}</Text>
          </View>
        ) : null}

        <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.auth.email}</Text>
        <TextInput
          className="border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-6 text-base text-gray-900 dark:text-slate-50 dark:bg-slate-700"
          placeholder="your@email.com"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${loading ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">{t.auth.sendResetLink}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
