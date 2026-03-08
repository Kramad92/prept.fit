import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function ClientLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
