import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { router } from "expo-router";
import { api } from "./api-client";
import { getAccessToken, clearTokens, setTokens, getStoredUser, setStoredUser } from "./token-store";
import { registerForPushNotifications, unregisterPushToken } from "./notifications";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
  clientProfileId: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedUser = await getStoredUser();
        const accessToken = await getAccessToken();
        if (storedUser && accessToken) {
          setUser(JSON.parse(storedUser));
          // Re-register push token for existing sessions (ensures token is current)
          registerForPushNotifications().catch(() => {});
        }
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

    router.replace("/(client)/(tabs)");
  }, []);

  const logout = useCallback(async () => {
    // Unregister push token before clearing auth
    await unregisterPushToken();
    await clearTokens();
    setUser(null);
    router.replace("/login");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
