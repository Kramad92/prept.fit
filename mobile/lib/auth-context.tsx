import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { router } from "expo-router";
import { api, setOnTokensCleared } from "./api-client";
import { getAccessToken, clearTokens, setTokens, getStoredUser, setStoredUser } from "./token-store";
import { registerForPushNotifications, unregisterPushToken } from "./notifications";
import { queryClient } from "./query-client";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
  clientProfileId: string | null;
}

const REQUIRED_USER_FIELDS: (keyof User)[] = [
  "id",
  "name",
  "email",
  "role",
  "tenantId",
  "tenantSlug",
];

function isValidUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return REQUIRED_USER_FIELDS.every(
    (field) => field in obj && typeof obj[field] === "string" && obj[field] !== ""
  );
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithSocial: (provider: "google" | "apple", idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  loginWithSocial: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const setUserRef = useRef(setUser);
  setUserRef.current = setUser;

  // Listen for token clears from api-client (e.g. refresh failure)
  useEffect(() => {
    setOnTokensCleared(() => {
      setUserRef.current(null);
      queryClient.clear();
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const storedUser = await getStoredUser();
        const accessToken = await getAccessToken();
        if (!storedUser || !accessToken) {
          return;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(storedUser);
        } catch {
          await clearTokens();
          return;
        }

        if (!isValidUser(parsed)) {
          await clearTokens();
          return;
        }

        // Validate session against the server
        try {
          const freshUser = await api.get<User>("/api/portal/me");
          if (isValidUser(freshUser)) {
            await setStoredUser(freshUser);
            setUser(freshUser);
          } else {
            setUser(parsed);
          }
        } catch {
          // Server rejected — tokens are stale; api-client will have
          // attempted a refresh internally.  If refresh also failed,
          // clearTokens + onTokensCleared already ran. In that case
          // user stays null and we're done.
          const tokenAfterRefresh = await getAccessToken();
          if (!tokenAfterRefresh) {
            await clearTokens();
            return;
          }
          // Refresh succeeded but /me itself errored for another reason —
          // trust the local copy
          setUser(parsed);
        }

        // Re-register push token for existing sessions (ensures token is current)
        registerForPushNotifications().catch(() => {});
      } catch {
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>("/api/auth/mobile", { email, password });

    await setTokens(res.accessToken, res.refreshToken);
    await setStoredUser(res.user);

    setUser(res.user);
    // Register for push notifications after login
    registerForPushNotifications().catch(() => {});

    if (res.user.role === "COACH") {
      router.replace("/(coach)/(tabs)");
    } else {
      router.replace("/(client)/(tabs)");
    }
  }, []);

  const loginWithSocial = useCallback(async (provider: "google" | "apple", idToken: string) => {
    const res = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>("/api/auth/mobile/social", { provider, idToken });

    await setTokens(res.accessToken, res.refreshToken);
    await setStoredUser(res.user);

    setUser(res.user);
    registerForPushNotifications().catch(() => {});

    if (res.user.role === "COACH") {
      router.replace("/(coach)/(tabs)");
    } else {
      router.replace("/(client)/(tabs)");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Unregister push token before clearing auth
      await unregisterPushToken();
    } finally {
      await clearTokens();
      queryClient.clear();
      setUser(null);
      router.replace("/login");
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithSocial, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
