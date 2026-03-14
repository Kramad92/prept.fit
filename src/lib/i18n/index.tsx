"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { bs, type Translations } from "./bs";
import { en } from "./en";
import { sr } from "./sr";
import { hr } from "./hr";

export type Locale = "bs" | "sr" | "hr" | "en";

const VALID_LOCALES: Locale[] = ["bs", "sr", "hr", "en"];

const translations: Record<Locale, Translations> = { bs, sr, hr, en };

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  t: en,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored && VALID_LOCALES.includes(stored)) {
      setLocaleState(stored);
    }
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("locale", l);
      // Persist to database so it survives refresh
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: l }),
      }).catch(() => {});
    }
  }

  // Sync from server settings on mount (updates localStorage if different)
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.locale && VALID_LOCALES.includes(data.locale)) {
          setLocale(data.locale);
        }
      })
      .catch(() => {});
  }, []);

  const value: I18nContextValue = {
    locale,
    t: translations[locale],
    setLocale,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  return useContext(I18nContext).t;
}

export function useLocale() {
  return useContext(I18nContext);
}

/** Translate an exercise metadata value (category, equipment, etc.) */
type ExerciseValueField = "categories" | "muscleGroups" | "equipment" | "difficulty" | "bodyRegion" | "movementPattern" | "forceType" | "mechanics" | "laterality" | "classification";

export function useTV() {
  const { t } = useContext(I18nContext);
  return (field: ExerciseValueField, value: string | null | undefined): string => {
    if (!value) return "";
    const map = t.exerciseValues[field] as Record<string, string>;
    return map?.[value] ?? value;
  };
}

/** Map app locale to BCP 47 date locale for toLocaleDateString() */
const DATE_LOCALES: Record<Locale, string> = {
  bs: "bs-BA",
  sr: "sr-Latn-RS",
  hr: "hr-HR",
  en: "en-US",
};

export function getDateLocale(locale: Locale): string {
  return DATE_LOCALES[locale] || "en-US";
}

/** Get locale-appropriate exercise name from nameI18n JSON, falling back to English name */
export function getExerciseDisplayName(
  exercise: { name: string; nameI18n?: Record<string, string> | null },
  locale: Locale | string
): string {
  if (locale === "en") return exercise.name;
  return exercise.nameI18n?.[locale] || exercise.name;
}

export { type Translations };
