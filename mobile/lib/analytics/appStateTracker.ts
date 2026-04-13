import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAnalytics } from './provider';

export function useAppStateTracking(): void {
  const analytics = useAnalytics();
  const sessionStart = useRef<number | null>(Date.now());
  const lastState = useRef<AppStateStatus>(AppState.currentState);
  const fired = useRef(false);

  useEffect(() => {
    if (!fired.current) {
      fired.current = true;
      analytics.track('session_started', { source: 'cold' });
    }

    const sub = AppState.addEventListener('change', (next) => {
      const prev = lastState.current;
      lastState.current = next;

      if ((prev === 'background' || prev === 'inactive') && next === 'active') {
        sessionStart.current = Date.now();
        analytics.track('session_started', { source: 'foreground' });
      } else if (prev === 'active' && (next === 'background' || next === 'inactive')) {
        const start = sessionStart.current ?? Date.now();
        analytics.track('session_ended', { duration_ms: Date.now() - start });
        sessionStart.current = null;
      }
    });

    return () => sub.remove();
  }, [analytics]);
}
