import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function CoachLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== "COACH") {
    return <Redirect href="/(client)/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
