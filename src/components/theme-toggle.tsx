"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark" | "system";

function resolveTheme(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { data: session } = useSession();
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((isDark: boolean) => {
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  // Initial mount — use localStorage for instant render (no flash)
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as Theme | null;
    applyTheme(resolveTheme(stored || "system"));
  }, [applyTheme]);

  // Once session loads — fetch user's DB preference and apply
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/user/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.theme) return;
        const isDark = resolveTheme(data.theme);
        applyTheme(isDark);
        localStorage.setItem("theme", data.theme);
      })
      .catch(() => {});
  }, [session?.user?.id, applyTheme]);

  function toggle() {
    const next = !dark;
    const theme: Theme = next ? "dark" : "light";
    applyTheme(next);
    localStorage.setItem("theme", theme);

    // Persist to DB
    if (session?.user?.id) {
      fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      }).catch(() => {});
    }
  }

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className={`rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 ${className || ""}`}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
