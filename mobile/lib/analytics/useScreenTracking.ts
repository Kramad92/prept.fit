import { usePathname, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useAnalytics } from './provider';

export function useScreenTracking(): void {
  const analytics = useAnalytics();
  const pathname = usePathname();
  const segments = useSegments();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;
    analytics.track('screen_viewed', { name: pathname, params: { segments } });
  }, [pathname, segments, analytics]);
}
