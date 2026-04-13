import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams('tab=home'),
}));

const trackSpy = vi.fn();
vi.mock('../provider', () => ({
  useAnalytics: () => ({ track: trackSpy }),
}));

import { usePageTracking } from '../usePageTracking';

describe('usePageTracking', () => {
  it('fires page_viewed on mount', () => {
    renderHook(() => usePageTracking());
    expect(trackSpy).toHaveBeenCalledWith(
      'page_viewed',
      expect.objectContaining({ path: '/dashboard?tab=home' })
    );
  });
});
