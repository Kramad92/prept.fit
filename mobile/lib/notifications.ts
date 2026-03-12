import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { api } from "./api-client";

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permission and register the device's push token with the backend.
 * Call after login.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push doesn't work on simulator
  if (!Device.isDevice) {
    console.log("[push] Skipping — not a physical device");
    return null;
  }

  // Check/request permission
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[push] Permission not granted");
    return null;
  }

  // Android needs a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#059669",
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Uses EAS projectId from app.json extra.eas.projectId
    });
    const token = tokenData.data;

    // Register with backend
    await api.post("/api/notifications/register-device", {
      token,
      platform: Platform.OS,
    });

    console.log("[push] Registered token:", token);
    return token;
  } catch (error) {
    console.error("[push] Failed to register:", error);
    return null;
  }
}

/**
 * Unregister all push tokens for the current user. Call before logout.
 * Uses DELETE with no body — backend removes all tokens for the authenticated user.
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    await api.delete("/api/notifications/register-device");
    console.log("[push] Unregistered tokens");
  } catch {
    // Ignore errors during logout
  }
}

/**
 * Add notification response listener (for handling taps on push notifications).
 * Returns a subscription that should be cleaned up on unmount.
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
