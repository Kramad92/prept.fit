import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useColorScheme } from "nativewind";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  isDark: false,
  setMode: () => {},
});

const STORAGE_KEY = "app_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const { setColorScheme } = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  const isDark = mode === "system"
    ? systemScheme === "dark"
    : mode === "dark";

  // Apply NativeWind color scheme whenever isDark changes
  useEffect(() => {
    setColorScheme(mode === "system" ? "system" : mode);
  }, [mode, setColorScheme]);

  // Load saved preference
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(STORAGE_KEY);
        if (saved === "light" || saved === "dark" || saved === "system") {
          setModeState(saved);
        }
      } catch {}
    })();
  }, []);

  const setMode = useCallback(async (m: ThemeMode) => {
    setModeState(m);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, m);
    } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, isDark, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
