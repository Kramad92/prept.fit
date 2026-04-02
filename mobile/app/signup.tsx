import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router, Redirect } from "expo-router";
import { ArrowLeft, CheckCircle } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";

export default function SignupScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const t = useT();
  const colors = useThemeColors();

  if (!authLoading && user) {
    return (
      <Redirect
        href={user.role === "COACH" ? "/(coach)/(tabs)" : "/(client)/(tabs)"}
      />
    );
  }

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async () => {
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!businessName.trim()) {
      setError("Business name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters");
      return;
    }
    if (!/[a-zA-Z]/.test(password)) {
      setError("Password must contain at least one letter");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number");
      return;
    }
    if (password !== confirmPassword) {
      setError(t.auth.passwordsDoNotMatch);
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        name: name.trim(),
        businessName: businessName.trim(),
        email: email.trim(),
        password,
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white dark:bg-slate-800"
      >
        <View className="flex-1 justify-center px-8">
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/25 items-center justify-center mb-4">
              <CheckCircle size={32} color={colors.brand} />
            </View>
            <Text className="text-xl font-bold text-gray-900 dark:text-slate-50 mb-2">
              Account Created
            </Text>
            <Text className="text-sm text-gray-500 dark:text-slate-400 text-center">
              We've sent a verification email to {email}. Please verify your
              email, then sign in.
            </Text>
          </View>
          <TouchableOpacity
            className="rounded-lg py-3.5 items-center bg-brand-600"
            onPress={() => router.replace("/login")}
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-base">
              {t.auth.backToLogin}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white dark:bg-slate-800"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 32, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute top-16 left-0 p-2"
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-gray-900 dark:text-slate-50 mb-2">Prept</Text>
        <Text className="text-base text-gray-500 dark:text-slate-400 mb-8">
          {t.auth.createAccountTitle}
        </Text>

        {error ? (
          <View className="bg-red-50 dark:bg-red-900/25 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <Text className="text-red-700 dark:text-red-300 text-sm">{error}</Text>
          </View>
        ) : null}

        <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
          {t.auth.yourName}
        </Text>
        <TextInput
          className="border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50 dark:bg-slate-700"
          placeholder="John Smith"
          placeholderTextColor={colors.textTertiary}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          editable={!loading}
        />

        <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
          {t.auth.businessName}
        </Text>
        <TextInput
          className="border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50 dark:bg-slate-700"
          placeholder="Smith Fitness"
          placeholderTextColor={colors.textTertiary}
          value={businessName}
          onChangeText={setBusinessName}
          editable={!loading}
        />

        <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.auth.email}</Text>
        <TextInput
          className="border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50 dark:bg-slate-700"
          placeholder="coach@example.com"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!loading}
        />

        <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
          {t.auth.password}
        </Text>
        <TextInput
          className="border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-2 text-base text-gray-900 dark:text-slate-50 dark:bg-slate-700"
          placeholder="Min 10 chars, letter + number"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          editable={!loading}
        />
        <Text className="text-xs text-gray-400 dark:text-slate-500 mb-4">
          {t.auth.minChars}
        </Text>

        <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
          {t.auth.confirmPassword}
        </Text>
        <TextInput
          className="border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-6 text-base text-gray-900 dark:text-slate-50 dark:bg-slate-700"
          placeholder="Re-enter your password"
          placeholderTextColor={colors.textTertiary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
          editable={!loading}
        />

        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${
            loading ? "bg-brand-400" : "bg-brand-600"
          }`}
          onPress={handleSignup}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">
              {t.auth.createAccount}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-4 items-center"
          onPress={() => router.back()}
          activeOpacity={0.6}
          disabled={loading}
        >
          <Text className="text-sm text-gray-500 dark:text-slate-400">
            {t.auth.alreadyHaveAccount}{" "}
            <Text className="text-brand-600 font-medium">{t.common.signIn}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
