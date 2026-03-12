import "../global.css";
import { useEffect } from "react";
import { Slot, router } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { addNotificationResponseListener } from "@/lib/notifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  // Handle notification tap — route to the correct screen
  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as
        | Record<string, string>
        | undefined;
      if (!data?.type) return;

      switch (data.type) {
        case "new_message":
          if (data.clientId) {
            router.push("/(client)/messages");
          }
          break;
        case "workout_assigned":
          router.push("/(client)/(tabs)/workouts");
          break;
        case "session_reminder":
          router.push("/(client)/book");
          break;
        case "check_in_due":
        case "check_in_submitted":
          router.push("/(client)/check-ins");
          break;
        case "habit_reminder":
          router.push("/(client)/(tabs)/habits");
          break;
        case "payment_overdue":
          router.push("/(client)/payments");
          break;
        case "group_session":
          router.push("/(client)/group-training");
          break;
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Slot />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
