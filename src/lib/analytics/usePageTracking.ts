'use client';
import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAnalytics } from './provider';

export function usePageTracking(): void {
  const analytics = useAnalytics();
  const pathname = usePathname();
  const search = useSearchParams();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const fullPath = pathname + (search?.toString() ? `?${search.toString()}` : '');
    if (fullPath === lastPath.current) return;
    lastPath.current = fullPath;
    analytics.track('page_viewed', {
      path: fullPath,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    });
  }, [pathname, search, analytics]);
}
