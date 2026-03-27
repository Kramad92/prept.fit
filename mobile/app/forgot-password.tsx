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

export default function ForgotPasswordScreen() {
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
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
        <View className="flex-1 justify-center px-8">
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center mb-4">
              <CheckCircle size={32} color="#10b981" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">Check Your Email</Text>
            <Text className="text-sm text-gray-500 text-center">
              If an account exists for {email}, we've sent a password reset link.
            </Text>
          </View>
          <TouchableOpacity
            className="rounded-lg py-3.5 items-center bg-brand-600"
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-base">Back to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
      <View className="flex-1 justify-center px-8">
        <TouchableOpacity onPress={() => router.back()} className="absolute top-16 left-6 p-2">
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>

        <View className="items-center mb-6">
          <View className="w-14 h-14 rounded-full bg-brand-50 items-center justify-center mb-4">
            <Mail size={28} color="#059669" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-1">Reset Password</Text>
          <Text className="text-sm text-gray-500 text-center">
            Enter your email and we'll send you a reset link.
          </Text>
        </View>

        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        ) : null}

        <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base text-gray-900"
          placeholder="your@email.com"
          placeholderTextColor="#9ca3af"
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
            <Text className="text-white font-semibold text-base">Send Reset Link</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
