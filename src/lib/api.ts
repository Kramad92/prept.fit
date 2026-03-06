type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

class ApiRequestError extends Error {
  constructor(
    public status: number,
    public data: ApiError
  ) {
    super(data.error);
    this.name = "ApiRequestError";
  }
}

async function request<T>(
  url: string,
  method: HttpMethod = "GET",
  body?: unknown
): Promise<T> {
  const opts: RequestInit = { method };
  if (body !== undefined) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiRequestError(res.status, data);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) => request<T>(url, "POST", body),
  put: <T>(url: string, body?: unknown) => request<T>(url, "PUT", body),
  patch: <T>(url: string, body?: unknown) => request<T>(url, "PATCH", body),
  delete: <T>(url: string) => request<T>(url, "DELETE"),
};

export { ApiRequestError };
export type { ApiError };
