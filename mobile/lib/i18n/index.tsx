import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import * as Localization from "expo-localization";
import * as SecureStore from "expo-secure-store";
import { en } from "./en";
import type { Translations } from "./types";

export type Locale = "en" | "bs" | "sr" | "hr";

const VALID_LOCALES: Locale[] = ["en", "bs", "sr", "hr"];
const STORAGE_KEY = "app_locale";

// Lazy-load non-English translations to keep bundle lean
const loaders: Record<Locale, () => Promise<{ default: Translations } | Translations>> = {
  en: async () => en,
  bs: async () => (await import("./bs")).bs,
  sr: async () => (await import("./sr")).sr,
  hr: async () => (await import("./hr")).hr,
};

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

function getDeviceLocale(): Locale {
  const deviceLocales = Localization.getLocales();
  if (deviceLocales.length > 0) {
    const code = deviceLocales[0].languageCode;
    if (code && VALID_LOCALES.includes(code as Locale)) {
      return code as Locale;
    }
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [translations, setTranslations] = useState<Translations>(en);
  const [ready, setReady] = useState(false);

  // Load saved locale or detect from device
  useEffect(() => {
    (async () => {
      let saved: string | null = null;
      try {
        saved = await SecureStore.getItemAsync(STORAGE_KEY);
      } catch {}
      const target = (saved && VALID_LOCALES.includes(saved as Locale))
        ? (saved as Locale)
        : getDeviceLocale();
      await loadLocale(target);
      setReady(true);
    })();
  }, []);

  async function loadLocale(l: Locale) {
    try {
      const mod = await loaders[l]();
      const t = "default" in mod ? mod.default : (mod as unknown as Translations);
      setTranslations(t);
      setLocaleState(l);
    } catch {
      setTranslations(en);
      setLocaleState("en");
    }
  }

  async function setLocale(l: Locale) {
    await loadLocale(l);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, l);
    } catch {}
    // Also persist to server
    try {
      const { api } = await import("@/lib/api-client");
      await api.put("/api/settings", { locale: l });
    } catch {}
  }

  // Don't render until locale is resolved to avoid flash
  if (!ready) return null;

  return (
    <I18nContext.Provider value={{ locale, t: translations, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT(): Translations {
  return useContext(I18nContext).t;
}

export function useLocale() {
  return useContext(I18nContext);
}

export { type Translations };
