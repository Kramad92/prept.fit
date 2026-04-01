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

export default function SignupScreen() {
  const { user, isLoading: authLoading } = useAuth();

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
      setError("Passwords don't match");
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
        className="flex-1 bg-white"
      >
        <View className="flex-1 justify-center px-8">
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center mb-4">
              <CheckCircle size={32} color="#10b981" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">
              Account Created
            </Text>
            <Text className="text-sm text-gray-500 text-center">
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
              Go to Login
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 32, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute top-16 left-0 p-2"
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-gray-900 mb-2">Prept</Text>
        <Text className="text-base text-gray-500 mb-8">
          Create your coaching account
        </Text>

        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        ) : null}

        <Text className="text-sm font-medium text-gray-700 mb-1">
          Your Name
        </Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900"
          placeholder="John Smith"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          editable={!loading}
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">
          Business Name
        </Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900"
          placeholder="Smith Fitness"
          placeholderTextColor="#9ca3af"
          value={businessName}
          onChangeText={setBusinessName}
          editable={!loading}
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900"
          placeholder="coach@example.com"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!loading}
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">
          Password
        </Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-2 text-base text-gray-900"
          placeholder="Min 10 chars, letter + number"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          editable={!loading}
        />
        <Text className="text-xs text-gray-400 mb-4">
          At least 10 characters with a letter and a number
        </Text>

        <Text className="text-sm font-medium text-gray-700 mb-1">
          Confirm Password
        </Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base text-gray-900"
          placeholder="Re-enter your password"
          placeholderTextColor="#9ca3af"
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
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-4 items-center"
          onPress={() => router.back()}
          activeOpacity={0.6}
          disabled={loading}
        >
          <Text className="text-sm text-gray-500">
            Already have an account?{" "}
            <Text className="text-brand-600 font-medium">Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
