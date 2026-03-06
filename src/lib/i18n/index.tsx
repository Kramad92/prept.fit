"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { bs, type Translations } from "./bs";
import { en } from "./en";

export type Locale = "bs" | "en";

const translations: Record<Locale, Translations> = { bs, en };

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "bs",
  t: bs,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("bs");

  // Load locale from settings on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.locale && (data.locale === "bs" || data.locale === "en")) {
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

export { type Translations };
