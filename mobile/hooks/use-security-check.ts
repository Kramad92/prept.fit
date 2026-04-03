import { useEffect, useState } from "react";
import { Platform, Alert } from "react-native";
import * as Device from "expo-device";

export function useSecurityCheck() {
  const [isCompromised, setIsCompromised] = useState(false);

  useEffect(() => {
    async function check() {
      // Skip in development / simulator
      if (__DEV__ || !Device.isDevice) return;

      try {
        const rooted = await Device.isRootedExperimentalAsync();
        if (rooted) {
          setIsCompromised(true);
          Alert.alert(
            "Security Warning",
            "This device appears to be rooted or jailbroken. " +
              "For your security, some features may be restricted.",
            [{ text: "I Understand" }]
          );
        }
      } catch {
        // Silently fail — detection not available on this platform/device
      }
    }

    if (Platform.OS === "ios" || Platform.OS === "android") {
      check();
    }
  }, []);

  return { isCompromised };
}
