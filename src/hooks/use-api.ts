"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(url: string | null) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: !!url,
    error: null,
  });
  const urlRef = useRef(url);
  urlRef.current = url;

  const load = useCallback(async () => {
    const currentUrl = urlRef.current;
    if (!currentUrl) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.get<T>(currentUrl);
      if (urlRef.current === currentUrl) {
        setState({ data, loading: false, error: null });
      }
    } catch (err: any) {
      if (urlRef.current === currentUrl) {
        setState({ data: null, loading: false, error: err.message || "Failed to load" });
      }
    }
  }, []);

  useEffect(() => {
    urlRef.current = url;
    if (url) load();
    else setState({ data: null, loading: false, error: null });
  }, [url, load]);

  return { ...state, refresh: load };
}

export function useApis<T extends Record<string, any>>(
  urls: Record<keyof T, string>
) {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = Object.entries(urls) as [keyof T, string][];
      const results = await Promise.all(
        entries.map(([, url]) => api.get(url))
      );
      const newData: Partial<T> = {};
      entries.forEach(([key], i) => {
        (newData as any)[key] = results[i];
      });
      setData(newData);
    } catch (err: any) {
      setError(err.message || "Failed to load");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
}
