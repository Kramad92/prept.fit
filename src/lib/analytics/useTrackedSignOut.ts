'use client';
import { signOut } from 'next-auth/react';
import { useAnalytics } from './provider';

export function useTrackedSignOut() {
  const analytics = useAnalytics();
  return (opts?: Parameters<typeof signOut>[0]) => {
    analytics.track('user_logged_out', {});
    analytics.reset();
    return signOut(opts);
  };
}
