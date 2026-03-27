import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "prept_tokens";
const USER_KEY = "prept_user";

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export async function getAccessToken(): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as StoredTokens).accessToken ?? null;
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as StoredTokens).refreshToken ?? null;
  } catch {
    return null;
  }
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  const blob: StoredTokens = { accessToken: access, refreshToken: refresh };
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(blob));
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function getStoredUser(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_KEY);
}

export async function setStoredUser(user: object): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}
