# Analytics Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a vendor-agnostic usage-tracking service used by both the Next.js web app and the Expo mobile app, with PostHog as the initial adapter.

**Architecture:** Thin facade + adapter registry. A platform-agnostic core (types, typed event catalog, client, queue, consent) lives at `prept/src/lib/analytics/core/` and is shared to the mobile app via Metro `watchFolders` + a tsconfig path alias. Each platform has its own thin wrapper (provider + auto-tracking hooks).

**Tech Stack:** TypeScript, Next.js 14 App Router, Expo + expo-router, React 19, Vitest (web), Jest (mobile), PostHog (`posthog-js` web, `posthog-react-native` mobile), `expo-secure-store`, `uuid`.

**Spec:** `docs/superpowers/specs/2026-04-13-analytics-service-design.md`

**Paths convention:** all paths in this plan are relative to `prept/` (the main repo), unless prefixed with `mobile/` which means `prept/mobile/`.

---

## Task 1: Scaffold core directory & types

**Files:**
- Create: `src/lib/analytics/core/types.ts`
- Create: `src/lib/analytics/core/index.ts`

- [ ] **Step 1: Create `types.ts`**

```ts
// src/lib/analytics/core/types.ts
export type Platform = 'web' | 'mobile';
export type Env = 'development' | 'production';

export interface InitContext {
  platform: Platform;
  appVersion: string;
  env: Env;
  anonymousId: string;
}

export interface AnalyticsAdapter {
  name: string;
  init(ctx: InitContext): Promise<void> | void;
  identify(userId: string, traits?: Record<string, unknown>): void;
  alias(newUserId: string, anonymousId: string): void;
  track(event: string, props?: Record<string, unknown>): void;
  screen(name: string, props?: Record<string, unknown>): void;
  reset(): void;
  flush?(): Promise<void>;
}
```

- [ ] **Step 2: Create barrel `index.ts`**

```ts
// src/lib/analytics/core/index.ts
export * from './types';
export * from './catalog';
export * from './client';
```

(Later tasks add `catalog` and `client`; this barrel is the public surface.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/analytics/core/types.ts src/lib/analytics/core/index.ts
git commit -m "feat(analytics): scaffold core types and barrel"
```

---

## Task 2: Define the typed event catalog

**Files:**
- Create: `src/lib/analytics/core/catalog.ts`
- Test: `src/lib/analytics/core/__tests__/catalog.test-d.ts`

- [ ] **Step 1: Write type-level test**

```ts
// src/lib/analytics/core/__tests__/catalog.test-d.ts
import { expectTypeOf } from 'vitest';
import type { EventMap } from '../catalog';

// Known events exist with correct payloads
expectTypeOf<EventMap['user_signed_up']>().toEqualTypeOf<{ method: 'email' | 'google' | 'apple' }>();
expectTypeOf<EventMap['page_viewed']>().toEqualTypeOf<{ path: string; referrer?: string }>();

// @ts-expect-error — unknown event should not be indexable
type _Bad = EventMap['does_not_exist'];
```

- [ ] **Step 2: Run it — expect FAIL (catalog not defined)**

Run: `npx vitest typecheck --run src/lib/analytics/core/__tests__/catalog.test-d.ts`
Expected: FAIL with "Cannot find module '../catalog'".

- [ ] **Step 3: Create `catalog.ts`**

```ts
// src/lib/analytics/core/catalog.ts
export type EventMap = {
  user_signed_up:  { method: 'email' | 'google' | 'apple' };
  user_logged_in:  { method: 'email' | 'google' | 'apple' };
  user_logged_out: Record<string, never>;
  page_viewed:     { path: string; referrer?: string };
  screen_viewed:   { name: string; params?: Record<string, unknown> };
  session_started: { source: 'cold' | 'foreground' };
  session_ended:   { duration_ms: number };
};

export type EventName = keyof EventMap;
```

- [ ] **Step 4: Re-run — expect PASS**

Run: `npx vitest typecheck --run src/lib/analytics/core/__tests__/catalog.test-d.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/core/catalog.ts src/lib/analytics/core/__tests__/catalog.test-d.ts
git commit -m "feat(analytics): add typed event catalog"
```

---

## Task 3: Mock adapter for tests

**Files:**
- Create: `src/lib/analytics/core/adapters/mock.ts`

- [ ] **Step 1: Create `mock.ts`**

```ts
// src/lib/analytics/core/adapters/mock.ts
import type { AnalyticsAdapter, InitContext } from '../types';

export interface MockCall {
  method: 'init' | 'identify' | 'alias' | 'track' | 'screen' | 'reset' | 'flush';
  args: unknown[];
}

export class MockAdapter implements AnalyticsAdapter {
  name = 'mock';
  calls: MockCall[] = [];
  shouldThrow = false;

  init(ctx: InitContext)  { this.push('init', [ctx]); }
  identify(id: string, traits?: Record<string, unknown>) { this.push('identify', [id, traits]); }
  alias(newId: string, anonId: string) { this.push('alias', [newId, anonId]); }
  track(event: string, props?: Record<string, unknown>) { this.push('track', [event, props]); }
  screen(name: string, props?: Record<string, unknown>) { this.push('screen', [name, props]); }
  reset() { this.push('reset', []); }
  async flush() { this.push('flush', []); }

  private push(method: MockCall['method'], args: unknown[]) {
    if (this.shouldThrow) throw new Error(`mock adapter threw in ${method}`);
    this.calls.push({ method, args });
  }

  calledWith(method: MockCall['method']): MockCall[] {
    return this.calls.filter(c => c.method === method);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/analytics/core/adapters/mock.ts
git commit -m "test(analytics): add MockAdapter for core tests"
```

---

## Task 4: Pre-init event queue

**Files:**
- Create: `src/lib/analytics/core/queue.ts`
- Test: `src/lib/analytics/core/__tests__/queue.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/analytics/core/__tests__/queue.test.ts
import { describe, it, expect } from 'vitest';
import { EventQueue } from '../queue';

describe('EventQueue', () => {
  it('stores items up to cap and drops oldest on overflow', () => {
    const q = new EventQueue(3);
    q.push({ kind: 'track', event: 'a', props: {} });
    q.push({ kind: 'track', event: 'b', props: {} });
    q.push({ kind: 'track', event: 'c', props: {} });
    q.push({ kind: 'track', event: 'd', props: {} });
    expect(q.drain().map(i => (i as any).event)).toEqual(['b', 'c', 'd']);
  });

  it('drain empties the queue', () => {
    const q = new EventQueue(10);
    q.push({ kind: 'track', event: 'a', props: {} });
    q.drain();
    expect(q.drain()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/lib/analytics/core/__tests__/queue.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/lib/analytics/core/queue.ts
export type QueuedItem =
  | { kind: 'track';    event: string; props?: Record<string, unknown> }
  | { kind: 'screen';   name: string;  props?: Record<string, unknown> }
  | { kind: 'identify'; userId: string; traits?: Record<string, unknown> }
  | { kind: 'alias';    newUserId: string; anonymousId: string };

export class EventQueue {
  private items: QueuedItem[] = [];
  constructor(private cap: number = 100) {}

  push(item: QueuedItem): void {
    this.items.push(item);
    if (this.items.length > this.cap) this.items.shift();
  }

  drain(): QueuedItem[] {
    const out = this.items;
    this.items = [];
    return out;
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/lib/analytics/core/__tests__/queue.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/core/queue.ts src/lib/analytics/core/__tests__/queue.test.ts
git commit -m "feat(analytics): add pre-init EventQueue with cap"
```

---

## Task 5: Consent gate

**Files:**
- Create: `src/lib/analytics/core/consent.ts`
- Test: `src/lib/analytics/core/__tests__/consent.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/analytics/core/__tests__/consent.test.ts
import { describe, it, expect } from 'vitest';
import { Consent } from '../consent';

describe('Consent', () => {
  it('defaults to false', () => {
    expect(new Consent().granted).toBe(false);
  });
  it('set(true) flips granted', () => {
    const c = new Consent();
    c.set(true);
    expect(c.granted).toBe(true);
  });
  it('fires listener on change only', () => {
    const c = new Consent();
    const seen: boolean[] = [];
    c.onChange(v => seen.push(v));
    c.set(false); // no change
    c.set(true);
    c.set(true);  // no change
    c.set(false);
    expect(seen).toEqual([true, false]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/lib/analytics/core/__tests__/consent.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/analytics/core/consent.ts
export class Consent {
  granted = false;
  private listeners: Array<(v: boolean) => void> = [];

  set(value: boolean): void {
    if (value === this.granted) return;
    this.granted = value;
    for (const fn of this.listeners) fn(value);
  }

  onChange(fn: (v: boolean) => void): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/core/consent.ts src/lib/analytics/core/__tests__/consent.test.ts
git commit -m "feat(analytics): add consent gate with listeners"
```

---

## Task 6: Noop adapter

**Files:**
- Create: `src/lib/analytics/core/adapters/noop.ts`

- [ ] **Step 1: Implement**

```ts
// src/lib/analytics/core/adapters/noop.ts
import type { AnalyticsAdapter } from '../types';

export class NoopAdapter implements AnalyticsAdapter {
  name = 'noop';
  init()     { /* no-op */ }
  identify() { /* no-op */ }
  alias()    { /* no-op */ }
  track()    { /* no-op */ }
  screen()   { /* no-op */ }
  reset()    { /* no-op */ }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/analytics/core/adapters/noop.ts
git commit -m "feat(analytics): add NoopAdapter"
```

---

## Task 7: Analytics client — init, track (not-yet-consented queuing)

**Files:**
- Create: `src/lib/analytics/core/client.ts`
- Test: `src/lib/analytics/core/__tests__/client.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/analytics/core/__tests__/client.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Analytics } from '../client';
import { MockAdapter } from '../adapters/mock';

function makeCtx() {
  return { platform: 'web' as const, appVersion: '1.0.0', env: 'development' as const, anonymousId: 'anon-1' };
}

describe('Analytics.track', () => {
  let a: Analytics; let m: MockAdapter;
  beforeEach(() => { m = new MockAdapter(); a = new Analytics(); });

  it('queues track calls made before init and flushes after init+consent', async () => {
    a.track('user_logged_in', { method: 'email' });
    a.registerAdapter(m);
    await a.init(makeCtx());
    a.setConsent(true);
    expect(m.calledWith('track').length).toBe(1);
    expect(m.calledWith('track')[0].args).toEqual(['user_logged_in', { method: 'email' }]);
  });

  it('drops track calls while consent is false (after init)', async () => {
    a.registerAdapter(m);
    await a.init(makeCtx());
    a.track('user_logged_in', { method: 'email' });
    expect(m.calledWith('track').length).toBe(0);
  });

  it('fans out to every registered adapter', async () => {
    const m2 = new MockAdapter();
    a.registerAdapter(m); a.registerAdapter(m2);
    await a.init(makeCtx());
    a.setConsent(true);
    a.track('user_logged_in', { method: 'email' });
    expect(m.calledWith('track').length).toBe(1);
    expect(m2.calledWith('track').length).toBe(1);
  });

  it('swallows adapter errors', async () => {
    m.shouldThrow = true;
    a.registerAdapter(m);
    await a.init(makeCtx());
    a.setConsent(true);
    expect(() => a.track('user_logged_in', { method: 'email' })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/lib/analytics/core/__tests__/client.test.ts`

- [ ] **Step 3: Implement `client.ts`**

```ts
// src/lib/analytics/core/client.ts
import type { AnalyticsAdapter, InitContext } from './types';
import type { EventMap, EventName } from './catalog';
import { EventQueue, type QueuedItem } from './queue';
import { Consent } from './consent';

export class Analytics {
  private adapters: AnalyticsAdapter[] = [];
  private queue = new EventQueue(100);
  private consent = new Consent();
  private initialized = false;
  private ctx?: InitContext;

  registerAdapter(a: AnalyticsAdapter): void {
    this.adapters.push(a);
  }

  async init(ctx: InitContext): Promise<void> {
    this.ctx = ctx;
    for (const a of this.adapters) {
      await this.safe(() => a.init(ctx));
    }
    this.initialized = true;
    if (this.consent.granted) this.flushQueue();
  }

  setConsent(granted: boolean): void {
    this.consent.set(granted);
    if (granted && this.initialized) this.flushQueue();
  }

  track<K extends EventName>(event: K, props: EventMap[K]): void {
    if (!this.initialized || !this.consent.granted) {
      this.queue.push({ kind: 'track', event, props: props as Record<string, unknown> });
      if (this.initialized && !this.consent.granted) this.queue.drain(); // drop when init+no-consent
      return;
    }
    for (const a of this.adapters) this.safe(() => a.track(event, props as Record<string, unknown>));
  }

  screen(name: string, props?: Record<string, unknown>): void {
    if (!this.initialized || !this.consent.granted) {
      this.queue.push({ kind: 'screen', name, props });
      if (this.initialized && !this.consent.granted) this.queue.drain();
      return;
    }
    for (const a of this.adapters) this.safe(() => a.screen(name, props));
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    if (!this.initialized || !this.consent.granted) {
      this.queue.push({ kind: 'identify', userId, traits });
      if (this.initialized && !this.consent.granted) this.queue.drain();
      return;
    }
    for (const a of this.adapters) this.safe(() => a.identify(userId, traits));
  }

  alias(newUserId: string): void {
    const anonId = this.ctx?.anonymousId ?? '';
    if (!this.initialized || !this.consent.granted) {
      this.queue.push({ kind: 'alias', newUserId, anonymousId: anonId });
      if (this.initialized && !this.consent.granted) this.queue.drain();
      return;
    }
    for (const a of this.adapters) this.safe(() => a.alias(newUserId, anonId));
  }

  reset(): void {
    for (const a of this.adapters) this.safe(() => a.reset());
  }

  private flushQueue(): void {
    const items = this.queue.drain();
    for (const item of items) {
      switch (item.kind) {
        case 'track':    for (const a of this.adapters) this.safe(() => a.track(item.event, item.props)); break;
        case 'screen':   for (const a of this.adapters) this.safe(() => a.screen(item.name, item.props)); break;
        case 'identify': for (const a of this.adapters) this.safe(() => a.identify(item.userId, item.traits)); break;
        case 'alias':    for (const a of this.adapters) this.safe(() => a.alias(item.newUserId, item.anonymousId)); break;
      }
    }
  }

  private safe(fn: () => unknown): void {
    try { void fn(); }
    catch (err) { if (process.env.NODE_ENV !== 'production') console.warn('[analytics] adapter error:', err); }
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/lib/analytics/core/__tests__/client.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/core/client.ts src/lib/analytics/core/__tests__/client.test.ts
git commit -m "feat(analytics): add Analytics client with queue, consent, fan-out"
```

---

## Task 8: Client — identify, alias, reset

**Files:**
- Modify: `src/lib/analytics/core/__tests__/client.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
// append to src/lib/analytics/core/__tests__/client.test.ts
describe('Analytics identity', () => {
  let a: Analytics; let m: MockAdapter;
  beforeEach(async () => {
    m = new MockAdapter(); a = new Analytics();
    a.registerAdapter(m);
    await a.init(makeCtx());
    a.setConsent(true);
  });

  it('identify passes through to adapters', () => {
    a.identify('user-42', { plan: 'pro' });
    expect(m.calledWith('identify')[0].args).toEqual(['user-42', { plan: 'pro' }]);
  });

  it('alias attaches current anonymousId', () => {
    a.alias('user-42');
    expect(m.calledWith('alias')[0].args).toEqual(['user-42', 'anon-1']);
  });

  it('reset fans out to all adapters', () => {
    a.reset();
    expect(m.calledWith('reset').length).toBe(1);
  });
});
```

- [ ] **Step 2: Run — expect PASS**

(All three methods are already implemented in Task 7; these tests confirm behavior.)

Run: `npx vitest run src/lib/analytics/core/__tests__/client.test.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/analytics/core/__tests__/client.test.ts
git commit -m "test(analytics): cover identify/alias/reset"
```

---

## Task 9: Shared anonymous-id utility (platform-injected storage)

**Files:**
- Create: `src/lib/analytics/core/anon-id.ts`
- Test: `src/lib/analytics/core/__tests__/anon-id.test.ts`

Core can't import `localStorage` or `expo-secure-store` directly (platform-specific). Use dependency injection.

- [ ] **Step 1: Write failing test**

```ts
// src/lib/analytics/core/__tests__/anon-id.test.ts
import { describe, it, expect } from 'vitest';
import { getOrCreateAnonymousId, type AnonIdStorage } from '../anon-id';

function memoryStorage(): AnonIdStorage & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async get(k)    { return store.get(k) ?? null; },
    async set(k, v) { store.set(k, v); },
    async delete(k) { store.delete(k); },
  };
}

describe('getOrCreateAnonymousId', () => {
  it('creates a uuid on first call and persists it', async () => {
    const s = memoryStorage();
    const id1 = await getOrCreateAnonymousId(s);
    expect(id1).toMatch(/^[0-9a-f-]{36}$/);
    const id2 = await getOrCreateAnonymousId(s);
    expect(id2).toBe(id1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// src/lib/analytics/core/anon-id.ts
export interface AnonIdStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

const KEY = 'analytics_anon_id';

function uuidv4(): string {
  // RFC4122 v4, not crypto-strong is fine for anon ids; use crypto when available
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, b => b.toString(16).padStart(2, '0'));
  return `${h.slice(0,4).join('')}-${h.slice(4,6).join('')}-${h.slice(6,8).join('')}-${h.slice(8,10).join('')}-${h.slice(10,16).join('')}`;
}

export async function getOrCreateAnonymousId(storage: AnonIdStorage): Promise<string> {
  const existing = await storage.get(KEY);
  if (existing) return existing;
  const fresh = uuidv4();
  await storage.set(KEY, fresh);
  return fresh;
}

export async function resetAnonymousId(storage: AnonIdStorage): Promise<string> {
  await storage.delete(KEY);
  return getOrCreateAnonymousId(storage);
}

export const ANON_ID_KEY = KEY;
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/core/anon-id.ts src/lib/analytics/core/__tests__/anon-id.test.ts
git commit -m "feat(analytics): add platform-agnostic anonymous id helper"
```

---

## Task 10: PostHog web adapter

**Files:**
- Create: `src/lib/analytics/core/adapters/posthog-web.ts`
- Modify: `package.json` (add `posthog-js`)

- [ ] **Step 1: Install PostHog web SDK**

Run:
```bash
npm install posthog-js
```
Expected: added to `dependencies`.

- [ ] **Step 2: Implement adapter**

```ts
// src/lib/analytics/core/adapters/posthog-web.ts
import type { AnalyticsAdapter, InitContext } from '../types';
import posthog from 'posthog-js';

export interface PostHogWebOptions {
  apiKey: string;
  host?: string;        // default https://us.i.posthog.com
  enableReplay?: boolean;
}

export class PostHogWebAdapter implements AnalyticsAdapter {
  name = 'posthog-web';
  constructor(private opts: PostHogWebOptions) {}

  init(ctx: InitContext): void {
    posthog.init(this.opts.apiKey, {
      api_host: this.opts.host ?? 'https://us.i.posthog.com',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: true,
      disable_session_recording: !this.opts.enableReplay,
      bootstrap: { distinctID: ctx.anonymousId },
      loaded: (ph) => {
        ph.register({ platform: ctx.platform, app_version: ctx.appVersion, env: ctx.env });
      },
    });
  }

  identify(userId: string, traits?: Record<string, unknown>) { posthog.identify(userId, traits); }
  alias(newUserId: string, anonymousId: string)                { posthog.alias(newUserId, anonymousId); }
  track(event: string, props?: Record<string, unknown>)        { posthog.capture(event, props); }
  screen(name: string, props?: Record<string, unknown>)        { posthog.capture('screen_viewed', { name, ...props }); }
  reset()                                                      { posthog.reset(); }
  async flush()                                                { /* posthog-js flushes automatically */ }
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/lib/analytics/core/adapters/posthog-web.ts
git commit -m "feat(analytics): add PostHog web adapter"
```

---

## Task 11: Web provider + AnalyticsProvider

**Files:**
- Create: `src/lib/analytics/provider.tsx`
- Create: `src/lib/analytics/storage.ts`
- Create: `src/lib/analytics/index.ts`

- [ ] **Step 1: Create web localStorage adapter for anon-id**

```ts
// src/lib/analytics/storage.ts
import type { AnonIdStorage } from './core/anon-id';

export const webAnonIdStorage: AnonIdStorage = {
  async get(key)         { if (typeof window === 'undefined') return null; return window.localStorage.getItem(key); },
  async set(key, value)  { if (typeof window === 'undefined') return; window.localStorage.setItem(key, value); },
  async delete(key)      { if (typeof window === 'undefined') return; window.localStorage.removeItem(key); },
};
```

- [ ] **Step 2: Create provider**

```tsx
// src/lib/analytics/provider.tsx
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
      analytics.registerAdapter(new PostHogWebAdapter({
        apiKey,
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        enableReplay: true,
      }));
    }

    (async () => {
      const anonymousId = await getOrCreateAnonymousId(webAnonIdStorage);
      await analytics.init({
        platform: 'web',
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
        env: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        anonymousId,
      });
      // Initial consent: read from existing cookie/local flag; default false
      const consented = window.localStorage.getItem('analytics_consent') === 'true';
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
```

- [ ] **Step 3: Create public barrel**

```ts
// src/lib/analytics/index.ts
export { AnalyticsProvider, useAnalytics } from './provider';
export { usePageTracking } from './usePageTracking';
export type { EventMap, EventName } from './core/catalog';
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/analytics/provider.tsx src/lib/analytics/storage.ts src/lib/analytics/index.ts
git commit -m "feat(analytics): add web AnalyticsProvider"
```

---

## Task 12: Web auto page-view tracking

**Files:**
- Create: `src/lib/analytics/usePageTracking.ts`

- [ ] **Step 1: Implement hook**

```ts
// src/lib/analytics/usePageTracking.ts
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
```

- [ ] **Step 2: Write integration test**

Create `src/lib/analytics/__tests__/usePageTracking.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePageTracking } from '../usePageTracking';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams('tab=home'),
}));

const trackSpy = vi.fn();
vi.mock('../provider', () => ({
  useAnalytics: () => ({ track: trackSpy }),
}));

describe('usePageTracking', () => {
  it('fires page_viewed on mount', () => {
    renderHook(() => usePageTracking());
    expect(trackSpy).toHaveBeenCalledWith('page_viewed', expect.objectContaining({
      path: '/dashboard?tab=home',
    }));
  });
});
```

- [ ] **Step 3: Run — expect PASS**

Run: `npx vitest run src/lib/analytics/__tests__/usePageTracking.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add src/lib/analytics/usePageTracking.ts src/lib/analytics/__tests__/usePageTracking.test.tsx
git commit -m "feat(analytics): auto page_viewed tracking on route change"
```

---

## Task 13: Mount web provider in root layout + env template

**Files:**
- Modify: `src/app/layout.tsx` (find the file; wrap children in `<AnalyticsProvider>`)
- Modify: `.env.example` (append new vars)

- [ ] **Step 1: Locate root layout**

Run: `ls src/app/layout.tsx`
Expected: file exists. Read it to identify the provider tree.

- [ ] **Step 2: Wrap with `AnalyticsProvider`**

Add import at top:
```tsx
import { AnalyticsProvider } from '@/lib/analytics';
```

Wrap the existing providers (innermost → outer order doesn't matter; add as a sibling provider):
```tsx
<AnalyticsProvider>
  {/* existing providers and {children} */}
</AnalyticsProvider>
```

- [ ] **Step 3: Add a `<PageTrackingMount />` client component inside the layout**

Create `src/lib/analytics/PageTrackingMount.tsx`:
```tsx
'use client';
import { usePageTracking } from './usePageTracking';
export function PageTrackingMount() { usePageTracking(); return null; }
```

Import and mount it inside `<AnalyticsProvider>` in `layout.tsx`:
```tsx
<AnalyticsProvider>
  <PageTrackingMount />
  {children}
</AnalyticsProvider>
```

- [ ] **Step 4: Append env vars to `.env.example`**

```
# Analytics
NEXT_PUBLIC_ANALYTICS_ENABLED=false
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_APP_VERSION=dev
```

- [ ] **Step 5: Build & verify no type errors**

Run: `npm run build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/lib/analytics/PageTrackingMount.tsx .env.example
git commit -m "feat(analytics): mount AnalyticsProvider + page tracking in root layout"
```

---

## Task 14: Wire login/logout to identify / alias / reset

**Files:**
- Modify: wherever login completes (search `src/` for auth success handler)
- Modify: wherever logout executes

- [ ] **Step 1: Locate the auth call sites**

Run: `grep -rn "signIn\|signOut\|logout" src/app src/lib/auth.ts src/services 2>/dev/null | head -20`

- [ ] **Step 2: On login success — call alias + identify**

In the login success handler (client component or hook), add:
```tsx
const analytics = useAnalytics();
// after successful auth, with `user` in scope:
analytics.alias(user.id);
analytics.identify(user.id, { email: user.email });
analytics.track('user_logged_in', { method: 'email' }); // adapt method per provider used
```

- [ ] **Step 3: On logout — call reset**

```tsx
analytics.track('user_logged_out', {});
analytics.reset();
```

- [ ] **Step 4: Verify types compile**

Run: `npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add -p   # stage only the relevant hunks
git commit -m "feat(analytics): wire login/logout to identify, alias, reset"
```

---

## Task 15: Configure Metro to share core with mobile

**Files:**
- Modify: `mobile/metro.config.js`
- Modify: `mobile/tsconfig.json`

- [ ] **Step 1: Update Metro config to watch parent `src/lib/analytics/core`**

```js
// mobile/metro.config.js
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

const analyticsCoreRoot = path.resolve(__dirname, '../src/lib/analytics/core');

config.watchFolders = [...(config.watchFolders ?? []), analyticsCoreRoot];
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules ?? {}),
    '@analytics-core': analyticsCoreRoot,
  },
  nodeModulesPaths: [
    ...(config.resolver?.nodeModulesPaths ?? []),
    path.resolve(__dirname, 'node_modules'),
  ],
};

module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Step 2: Add TS path alias**

Modify `mobile/tsconfig.json` `compilerOptions.paths`:
```json
"paths": {
  "@/*": ["./*"],
  "@analytics-core": ["../src/lib/analytics/core/index"],
  "@analytics-core/*": ["../src/lib/analytics/core/*"]
}
```

Also add the core folder to `include`:
```json
"include": ["**/*.ts", "**/*.tsx", "nativewind-env.d.ts", "../src/lib/analytics/core/**/*"]
```

- [ ] **Step 3: Smoke-test import**

Run:
```bash
cd mobile && npx tsc --noEmit
```
Expected: success (imports of `@analytics-core` may not exist yet; that's fine — next tasks add them).

- [ ] **Step 4: Commit**

```bash
git add mobile/metro.config.js mobile/tsconfig.json
git commit -m "chore(mobile): alias @analytics-core to shared core via Metro + TS paths"
```

---

## Task 16: PostHog React Native adapter (in shared core)

**Files:**
- Create: `src/lib/analytics/core/adapters/posthog-rn.ts`
- Modify: `mobile/package.json` (install `posthog-react-native`)

- [ ] **Step 1: Install RN SDK**

Run:
```bash
cd mobile && npx expo install posthog-react-native
```
Expected: added to `mobile/package.json`.

- [ ] **Step 2: Implement adapter**

```ts
// src/lib/analytics/core/adapters/posthog-rn.ts
import type { AnalyticsAdapter, InitContext } from '../types';

// PostHog RN type is imported dynamically to keep the core tree shake-friendly for web tests.
type PostHogClient = {
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (id: string, traits?: Record<string, unknown>) => void;
  alias: (newId: string) => void;
  screen: (name: string, props?: Record<string, unknown>) => void;
  reset: () => void;
  flush: () => Promise<void>;
  register: (traits: Record<string, unknown>) => void;
};

export interface PostHogRNOptions {
  apiKey: string;
  host?: string;
  enableReplay?: boolean;
  buildClient: (apiKey: string, opts: Record<string, unknown>) => Promise<PostHogClient>;
}

export class PostHogRNAdapter implements AnalyticsAdapter {
  name = 'posthog-rn';
  private client?: PostHogClient;
  constructor(private opts: PostHogRNOptions) {}

  async init(ctx: InitContext): Promise<void> {
    this.client = await this.opts.buildClient(this.opts.apiKey, {
      host: this.opts.host ?? 'https://us.i.posthog.com',
      enableSessionReplay: this.opts.enableReplay ?? false,
      captureAppLifecycleEvents: false,
      bootstrap: { distinctId: ctx.anonymousId },
    });
    this.client.register({ platform: ctx.platform, app_version: ctx.appVersion, env: ctx.env });
  }

  identify(id: string, traits?: Record<string, unknown>) { this.client?.identify(id, traits); }
  alias(newUserId: string)                               { this.client?.alias(newUserId); }
  track(event: string, props?: Record<string, unknown>)  { this.client?.capture(event, props); }
  screen(name: string, props?: Record<string, unknown>)  { this.client?.screen(name, props); }
  reset()                                                { this.client?.reset(); }
  async flush()                                          { await this.client?.flush(); }
}
```

The `buildClient` dependency injection keeps the core testable (mobile provider supplies the real `PostHog` constructor; web tests never load the RN module).

- [ ] **Step 3: Commit**

```bash
git add src/lib/analytics/core/adapters/posthog-rn.ts mobile/package.json mobile/package-lock.json
git commit -m "feat(analytics): add PostHog React Native adapter (DI-based)"
```

---

## Task 17: Mobile secure-store anon id + provider

**Files:**
- Create: `mobile/lib/analytics/storage.ts`
- Create: `mobile/lib/analytics/provider.tsx`
- Create: `mobile/lib/analytics/index.ts`

- [ ] **Step 1: Secure-store adapter**

```ts
// mobile/lib/analytics/storage.ts
import * as SecureStore from 'expo-secure-store';
import type { AnonIdStorage } from '@analytics-core/anon-id';

export const mobileAnonIdStorage: AnonIdStorage = {
  async get(key)         { return SecureStore.getItemAsync(key); },
  async set(key, value)  { await SecureStore.setItemAsync(key, value); },
  async delete(key)      { await SecureStore.deleteItemAsync(key); },
};
```

- [ ] **Step 2: Provider**

```tsx
// mobile/lib/analytics/provider.tsx
import Constants from 'expo-constants';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import PostHog from 'posthog-react-native';
import { Analytics } from '@analytics-core/client';
import { NoopAdapter } from '@analytics-core/adapters/noop';
import { PostHogRNAdapter } from '@analytics-core/adapters/posthog-rn';
import { getOrCreateAnonymousId } from '@analytics-core/anon-id';
import { mobileAnonIdStorage } from './storage';

const AnalyticsContext = createContext<Analytics | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const analytics = useMemo(() => new Analytics(), []);

  useEffect(() => {
    const extra = Constants.expoConfig?.extra ?? {};
    const enabled = extra.analyticsEnabled === true || extra.analyticsEnabled === 'true';
    const apiKey = extra.posthogKey as string | undefined;

    if (!enabled || !apiKey) {
      analytics.registerAdapter(new NoopAdapter());
    } else {
      analytics.registerAdapter(new PostHogRNAdapter({
        apiKey,
        host: extra.posthogHost,
        enableReplay: false, // enable once validated on device
        buildClient: async (key, opts) => {
          const instance = new PostHog(key, opts as never);
          await instance.ready?.();
          return instance as never;
        },
      }));
    }

    (async () => {
      const anonymousId = await getOrCreateAnonymousId(mobileAnonIdStorage);
      await analytics.init({
        platform: 'mobile',
        appVersion: Constants.expoConfig?.version ?? 'dev',
        env: __DEV__ ? 'development' : 'production',
        anonymousId,
      });
      analytics.setConsent(true); // mobile defaults to granted; adjust if you add a toggle
    })();
  }, [analytics]);

  return <AnalyticsContext.Provider value={analytics}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): Analytics {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error('useAnalytics must be used within AnalyticsProvider');
  return ctx;
}
```

- [ ] **Step 3: Barrel**

```ts
// mobile/lib/analytics/index.ts
export { AnalyticsProvider, useAnalytics } from './provider';
export { useScreenTracking } from './useScreenTracking';
export type { EventMap, EventName } from '@analytics-core/catalog';
```

- [ ] **Step 4: Add expo-config extras**

In `mobile/app.json` under `expo.extra`:
```json
"extra": {
  "analyticsEnabled": false,
  "posthogKey": "",
  "posthogHost": "https://us.i.posthog.com"
}
```

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/analytics/storage.ts mobile/lib/analytics/provider.tsx mobile/lib/analytics/index.ts mobile/app.json
git commit -m "feat(analytics/mobile): AnalyticsProvider with PostHog RN + secure-store anon id"
```

---

## Task 18: Mobile screen-view tracking (expo-router)

**Files:**
- Create: `mobile/lib/analytics/useScreenTracking.ts`
- Test: `mobile/__tests__/analytics.useScreenTracking.test.tsx`

- [ ] **Step 1: Implement hook**

```ts
// mobile/lib/analytics/useScreenTracking.ts
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
```

- [ ] **Step 2: Write test**

```tsx
// mobile/__tests__/analytics.useScreenTracking.test.tsx
import { renderHook } from '@testing-library/react-native';
import { useScreenTracking } from '../lib/analytics/useScreenTracking';

jest.mock('expo-router', () => ({
  usePathname: () => '/workouts/42',
  useSegments: () => ['workouts', '[id]'],
}));

const track = jest.fn();
jest.mock('../lib/analytics/provider', () => ({
  useAnalytics: () => ({ track }),
}));

describe('useScreenTracking', () => {
  it('fires screen_viewed when pathname changes', () => {
    renderHook(() => useScreenTracking());
    expect(track).toHaveBeenCalledWith('screen_viewed', expect.objectContaining({ name: '/workouts/42' }));
  });
});
```

- [ ] **Step 3: Run — expect PASS**

Run: `cd mobile && npx jest analytics.useScreenTracking`

- [ ] **Step 4: Commit**

```bash
git add mobile/lib/analytics/useScreenTracking.ts mobile/__tests__/analytics.useScreenTracking.test.tsx
git commit -m "feat(analytics/mobile): auto screen_viewed tracking via expo-router"
```

---

## Task 19: Mobile AppState session tracking

**Files:**
- Create: `mobile/lib/analytics/appStateTracker.ts`

- [ ] **Step 1: Implement**

```ts
// mobile/lib/analytics/appStateTracker.ts
import { AppState, type AppStateStatus } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAnalytics } from './provider';

export function useAppStateTracking(): void {
  const analytics = useAnalytics();
  const sessionStart = useRef<number | null>(Date.now()); // cold start
  const lastState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // cold start
    analytics.track('session_started', { source: 'cold' });

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
```

- [ ] **Step 2: Commit**

```bash
git add mobile/lib/analytics/appStateTracker.ts
git commit -m "feat(analytics/mobile): session_started/ended via AppState"
```

---

## Task 20: Mount mobile provider + trackers in root layout

**Files:**
- Modify: `mobile/app/_layout.tsx` (confirm filename with `ls`)

- [ ] **Step 1: Locate root layout**

Run: `ls mobile/app/_layout.tsx`
Expected: file exists.

- [ ] **Step 2: Wrap tree + mount trackers**

Add imports:
```tsx
import { AnalyticsProvider } from '@/lib/analytics';
import { useScreenTracking } from '@/lib/analytics/useScreenTracking';
import { useAppStateTracking } from '@/lib/analytics/appStateTracker';

function AnalyticsTrackers() {
  useScreenTracking();
  useAppStateTracking();
  return null;
}
```

Wrap existing root layout:
```tsx
<AnalyticsProvider>
  <AnalyticsTrackers />
  {/* existing layout content */}
</AnalyticsProvider>
```

- [ ] **Step 3: Typecheck**

Run: `cd mobile && npx tsc --noEmit`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add mobile/app/_layout.tsx
git commit -m "feat(analytics/mobile): mount AnalyticsProvider + trackers in root layout"
```

---

## Task 21: Wire mobile auth to identify / alias / reset

**Files:**
- Modify: `mobile/lib/auth-context.tsx`

- [ ] **Step 1: On login success**

Import `useAnalytics` where the auth context completes login. After user is set:
```tsx
analytics.alias(user.id);
analytics.identify(user.id, { email: user.email });
analytics.track('user_logged_in', { method: 'email' }); // adapt per auth path
```

Because `auth-context` may run outside a hook, prefer calling these from the component that consumes the login result (e.g., the login screen) via `useAnalytics()`. If the context itself needs to emit, expose an `onLogin`/`onLogout` callback registered from a component that has access to analytics.

- [ ] **Step 2: On logout**

```tsx
analytics.track('user_logged_out', {});
analytics.reset();
```

- [ ] **Step 3: Typecheck**

Run: `cd mobile && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add -p
git commit -m "feat(analytics/mobile): wire auth flow to identify/alias/reset"
```

---

## Task 22: End-to-end smoke verification

- [ ] **Step 1: Web smoke**

Set in `.env.local`:
```
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_POSTHOG_KEY=<real staging key>
```

Run: `npm run dev`
Navigate between two pages. Verify in PostHog → Live events that `page_viewed` appears with `path` set correctly. Log in → verify `user_logged_in`, `identify`, and subsequent events carry `$user_id`.

- [ ] **Step 2: Mobile smoke**

In `mobile/app.json` set `extra.analyticsEnabled=true` and `extra.posthogKey` to staging. Run `npx expo start` on a device.
Verify in PostHog Live events: `session_started { source: 'cold' }`, `screen_viewed` on navigation, `session_ended` on backgrounding.

- [ ] **Step 3: Run all unit tests**

Run:
```bash
npm test -- --run
cd mobile && npx jest
```
Expected: all green.

- [ ] **Step 4: Final commit if any fixups**

```bash
git add -A
git commit -m "chore(analytics): e2e smoke fixups"
```

---

## Task 23: Seed initial event call-sites

**Files:**
- Modify: feature entry points (e.g., workout start, plan creation) — pick 3–5 to seed

- [ ] **Step 1: Identify 3–5 high-signal actions**

Examples: `workout_started`, `plan_created`, `meal_logged`. For each, extend `src/lib/analytics/core/catalog.ts`:

```ts
export type EventMap = {
  // ... existing ...
  workout_started: { workout_id: string; source: 'library' | 'plan' | 'custom' };
  plan_created:    { plan_id: string; duration_days: number };
  meal_logged:     { meal_id: string; portion: number };
};
```

- [ ] **Step 2: Call `analytics.track(...)` at each call site on both platforms**

Use `useAnalytics()` in the component that owns the action.

- [ ] **Step 3: Typecheck both**

```bash
npm run build
cd mobile && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(analytics): seed core product events"
```

---

## Done

All spec requirements now have implementations:
- Core facade + adapter registry (Tasks 1, 7)
- Typed event catalog (Task 2) + seeding (Task 23)
- Anonymous id, identify, alias, reset (Tasks 7, 8, 9, 14, 21)
- Queue (Task 4), consent gate (Task 5)
- Mock/Noop adapters (Tasks 3, 6)
- PostHog adapters web + RN (Tasks 10, 16)
- Auto page-view (Task 12), screen-view (Task 18), session tracking (Task 19)
- Web + mobile providers mounted (Tasks 11, 13, 17, 20)
- Metro sharing (Task 15)
- Smoke verification (Task 22)
