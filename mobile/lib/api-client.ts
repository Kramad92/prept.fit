import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./token-store";
import { router } from "expo-router";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const REQUEST_TIMEOUT = 15000; // 15 seconds

let onTokensCleared: (() => void) | null = null;

export function setOnTokensCleared(cb: () => void) {
  onTokensCleared = cb;
}

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

function processRefreshQueue(error: Error | null, token: string | null) {
  const queue = refreshQueue;
  refreshQueue = [];
  queue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
}

function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id)
  );
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetchWithTimeout(`${API_URL}/api/auth/mobile/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    await clearTokens();
    onTokensCleared?.();
    router.replace("/login");
    throw new Error("Session expired");
  }

  const data = await res.json();
  await setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

async function ensureFreshToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const newToken = await refreshAccessToken();
    processRefreshQueue(null, newToken);
    return newToken;
  } catch (error) {
    processRefreshQueue(error as Error, null);
    throw error;
  } finally {
    isRefreshing = false;
  }
}

async function fetchWithAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetchWithTimeout(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // If 401, try refreshing the token
  if (res.status === 401 && accessToken) {
    const newToken = await ensureFreshToken();
    headers["Authorization"] = `Bearer ${newToken}`;
    return fetchWithTimeout(`${API_URL}${path}`, { ...options, headers });
  }

  return res;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json().catch(() => {
    throw new Error(`Invalid JSON response (${res.status})`);
  });
}

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const res = await fetchWithAuth(path);
    return handleResponse<T>(res);
  },

  post: async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await fetchWithAuth(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  put: async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await fetchWithAuth(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  patch: async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await fetchWithAuth(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  delete: async <T>(path: string): Promise<T> => {
    const res = await fetchWithAuth(path, { method: "DELETE" });
    return handleResponse<T>(res);
  },

  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    // Don't set Content-Type — fetch sets it with boundary for FormData
    const accessToken = await getAccessToken();
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    let res = await fetchWithTimeout(
      `${API_URL}${path}`,
      { method: "POST", headers, body: formData },
      60000
    );

    // Retry on 401 with refreshed token (uses shared queue to avoid race condition)
    if (res.status === 401 && accessToken) {
      const newToken = await ensureFreshToken();
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetchWithTimeout(
        `${API_URL}${path}`,
        { method: "POST", headers, body: formData },
        60000
      );
    }

    return handleResponse<T>(res);
  },
};
