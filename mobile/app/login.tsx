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
import { router, Redirect } from "expo-router";
import { useAuth } from "@/lib/auth-context";

// Native social sign-in modules — unavailable in Expo Go
let AppleAuthentication: typeof import("expo-apple-authentication") | null = null;
let GoogleSignin: any = null;
let isErrorWithCode: any = () => false;
let statusCodes: any = {};

try {
  AppleAuthentication = require("expo-apple-authentication");
} catch {}

try {
  const g = require("@react-native-google-signin/google-signin");
  GoogleSignin = g.GoogleSignin;
  isErrorWithCode = g.isErrorWithCode;
  statusCodes = g.statusCodes;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
} catch {}

export default function LoginScreen() {
  const { login, loginWithSocial, user, isLoading } = useAuth();

  if (!isLoading && user) {
    return (
      <Redirect
        href={user.role === "COACH" ? "/(coach)/(tabs)" : "/(client)/(tabs)"}
      />
    );
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const hasSocialAuth = !!GoogleSignin;
  const hasAppleAuth = !!AppleAuthentication;

  const handleGoogleSignIn = async () => {
    if (!GoogleSignin) return;
    setError("");
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) {
        setError("No token received from Google");
        return;
      }
      await loginWithSocial("google", idToken);
    } catch (e: any) {
      if (isErrorWithCode(e)) {
        if (
          e.code === statusCodes.SIGN_IN_CANCELLED ||
          e.code === statusCodes.IN_PROGRESS
        ) {
          // User cancelled or already in progress — no error
          return;
        }
      }
      const msg = e.message || "Google sign-in failed";
      if (msg.includes("NO_ACCOUNT")) {
        setError("No account found. Create one first.");
      } else {
        setError(msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (!AppleAuthentication) return;
    setError("");
    setAppleLoading(true);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        await loginWithSocial("apple", credential.identityToken);
      } else {
        setError("No token received from Apple");
      }
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") {
        // User cancelled — no error
      } else {
        const msg = e.message || "Apple sign-in failed";
        if (msg.includes("NO_ACCOUNT")) {
          setError("No account found. Please register on the web first.");
        } else {
          setError(msg);
        }
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const isAnyLoading = loading || googleLoading || appleLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Prept</Text>
        <Text className="text-base text-gray-500 mb-8">
          Sign in to your account
        </Text>

        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        ) : null}

        {/* Social Sign-In (hidden in Expo Go where native modules aren't available) */}
        {hasSocialAuth ? (
          <>
            <TouchableOpacity
              className={`rounded-lg py-3.5 items-center flex-row justify-center border border-gray-300 ${
                isAnyLoading ? "opacity-50" : ""
              }`}
              onPress={handleGoogleSignIn}
              disabled={isAnyLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator color="#4285F4" />
              ) : (
                <>
                  <Text className="text-lg mr-2">G</Text>
                  <Text className="text-gray-700 font-medium text-base">
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple Sign-In (iOS only) */}
            {Platform.OS === "ios" && hasAppleAuth ? (
              <TouchableOpacity
                className={`rounded-lg py-3.5 items-center flex-row justify-center bg-black mt-3 ${
                  isAnyLoading ? "opacity-50" : ""
                }`}
                onPress={handleAppleSignIn}
                disabled={isAnyLoading}
                activeOpacity={0.8}
              >
                {appleLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text className="text-white text-lg mr-2"></Text>
                    <Text className="text-white font-medium text-base">
                      Continue with Apple
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="mx-4 text-sm text-gray-400">or</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>
          </>
        ) : null}

        {/* Email/Password */}
        <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900"
          placeholder="coach@demo.com"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!isAnyLoading}
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">
          Password
        </Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base text-gray-900"
          placeholder="Enter your password"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          editable={!isAnyLoading}
        />

        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${
            isAnyLoading ? "bg-brand-400" : "bg-brand-600"
          }`}
          onPress={handleLogin}
          disabled={isAnyLoading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-4 items-center"
          onPress={() => router.push("/forgot-password")}
          activeOpacity={0.6}
          disabled={isAnyLoading}
        >
          <Text className="text-sm text-brand-600">Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-3 items-center"
          onPress={() => router.push("/signup")}
          activeOpacity={0.6}
          disabled={isAnyLoading}
        >
          <Text className="text-sm text-gray-500">
            Don't have an account?{" "}
            <Text className="text-brand-600 font-medium">Create one</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
