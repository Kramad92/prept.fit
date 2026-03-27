import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function ClientLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role === "COACH") {
    return <Redirect href="/(coach)/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
