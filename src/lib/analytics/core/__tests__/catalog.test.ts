import { describe, it, expectTypeOf } from 'vitest';
import type { EventMap, EventName } from '../catalog';

describe('EventMap (type-level)', () => {
  it('has the expected payload for known events', () => {
    expectTypeOf<EventMap['user_signed_up']>().toEqualTypeOf<{ method: 'email' | 'google' | 'apple' }>();
    expectTypeOf<EventMap['page_viewed']>().toEqualTypeOf<{ path: string; referrer?: string }>();
    expectTypeOf<EventMap['session_ended']>().toEqualTypeOf<{ duration_ms: number }>();
  });

  it('EventName is the union of keys', () => {
    expectTypeOf<EventName>().toEqualTypeOf<keyof EventMap>();
  });
});
