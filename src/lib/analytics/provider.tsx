'use client';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Analytics } from './core/client';
import { PostHogWebAdapter } from './core/adapters/posthog-web';
import { NoopAdapter } from './core/adapters/noop';
import { getOrCreateAnonymousId } from './core/anon-id';
import { webAnonIdStorage } from './storage';

const AnalyticsContext = createContext<Analytics | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const analytics = useMemo(() => new Analytics(), []);

  useEffect(() => {
    const enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

    if (!enabled || !apiKey) {
      analytics.registerAdapter(new NoopAdapter());
    } else {
      analytics.registerAdapter(
        new PostHogWebAdapter({
          apiKey,
          host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
          enableReplay: true,
        })
      );
    }

    (async () => {
      const anonymousId = await getOrCreateAnonymousId(webAnonIdStorage);
      await analytics.init({
        platform: 'web',
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
        env: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        anonymousId,
      });
      const consented =
        typeof window !== 'undefined' && window.localStorage.getItem('analytics_consent') === 'true';
      analytics.setConsent(consented);
    })();
  }, [analytics]);

  return <AnalyticsContext.Provider value={analytics}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): Analytics {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error('useAnalytics must be used within AnalyticsProvider');
  return ctx;
}
