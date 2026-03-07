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

/** Map app locale to BCP 47 date locale for toLocaleDateString() */
const DATE_LOCALES: Record<Locale, string> = {
  bs: "bs-BA",
  sr: "sr-Latn-RS",
  hr: "hr-HR",
  en: "en-US",
};

export function getDateLocale(locale: Locale): string {
  return DATE_LOCALES[locale] || "bs-BA";
}

export { type Translations };
