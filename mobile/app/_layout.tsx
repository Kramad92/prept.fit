import "../global.css";
import { useEffect } from "react";
import { Slot, router } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
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

function NotificationHandler() {
  const { user } = useAuth();

  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as
        | Record<string, string>
        | undefined;
      if (!data?.type || !user) return;

      const isCoach = user.role === "COACH";

      switch (data.type) {
        case "new_message":
          if (isCoach && data.clientId) {
            router.push(`/(coach)/messages/${data.clientId}` as never);
          } else {
            router.push("/(client)/messages");
          }
          break;
        case "workout_assigned":
          router.push("/(client)/(tabs)/workouts");
          break;
        case "session_reminder":
          if (isCoach) {
            router.push("/(coach)/(tabs)/schedule");
          } else {
            router.push("/(client)/book");
          }
          break;
        case "check_in_due":
          router.push("/(client)/check-ins");
          break;
        case "check_in_submitted":
          if (isCoach && data.clientId) {
            router.push(`/(coach)/clients/${data.clientId}` as never);
          } else {
            router.push("/(client)/check-ins");
          }
          break;
        case "habit_reminder":
          router.push("/(client)/(tabs)/habits");
          break;
        case "payment_overdue":
          if (isCoach) {
            router.push("/(coach)/payments" as never);
          } else {
            router.push("/(client)/payments");
          }
          break;
        case "group_session":
          if (isCoach) {
            router.push("/(coach)/group-training" as never);
          } else {
            router.push("/(client)/group-training");
          }
          break;
      }
    });

    return () => subscription.remove();
  }, [user]);

  return null;
}

export default function RootLayout() {

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NotificationHandler />
            <Slot />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
