import Constants from 'expo-constants';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import PostHog from 'posthog-react-native';
import { Analytics } from '@analytics-core/client';
import { NoopAdapter } from '@analytics-core/adapters/noop';
import { PostHogRNAdapter } from '@analytics-core/adapters/posthog-rn';
import { getOrCreateAnonymousId } from '@analytics-core/anon-id';
import { mobileAnonIdStorage } from './storage';
import { analyticsInstance } from './instance';

const AnalyticsContext = createContext<Analytics | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const analytics = analyticsInstance;

  useEffect(() => {
    const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
    const enabled = extra.analyticsEnabled === true || extra.analyticsEnabled === 'true';
    const apiKey = extra.posthogKey as string | undefined;

    if (!enabled || !apiKey) {
      analytics.registerAdapter(new NoopAdapter());
    } else {
      analytics.registerAdapter(
        new PostHogRNAdapter({
          apiKey,
          host: extra.posthogHost as string | undefined,
          enableReplay: false,
          buildClient: async (key, opts) => {
            // posthog-react-native exports a class with the same shape we need
            const instance = new (PostHog as unknown as new (k: string, o: unknown) => unknown)(
              key,
              opts
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const anyInstance = instance as any;
            if (typeof anyInstance.ready === 'function') await anyInstance.ready();
            return anyInstance;
          },
        })
      );
    }

    (async () => {
      const anonymousId = await getOrCreateAnonymousId(mobileAnonIdStorage);
      await analytics.init({
        platform: 'mobile',
        appVersion: Constants.expoConfig?.version ?? 'dev',
        env: __DEV__ ? 'development' : 'production',
        anonymousId,
      });
      analytics.setConsent(true);
    })();
  }, [analytics]);

  return <AnalyticsContext.Provider value={analytics}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): Analytics {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error('useAnalytics must be used within AnalyticsProvider');
  return ctx;
}
