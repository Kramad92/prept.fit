# Analytics Service — Design

**Date:** 2026-04-13
**Status:** Approved, pending implementation plan

## Goal

A vendor-agnostic usage-tracking service shared by the Next.js web app and the Expo mobile app. Must support product analytics (funnels, retention, feature usage) and session replay. Call sites must never import vendor SDKs directly, so destinations can be added/swapped without touching feature code.

## Requirements (from brainstorm)

- **Platforms:** Next.js (web, App Router, TypeScript) + Expo / React Native (mobile)
- **Use cases:** Product analytics (A) + session replay (D)
- **Identity:** Anonymous + identified with alias on login (B)
- **Event taxonomy:** Typed catalog, compile-time checked (A)
- **Auto-tracking scope:** Standard — page/screen views, route changes, session start/end, app foreground/background (B)
- **Initial vendor:** PostHog (free tier covers analytics + replay in one tool)

## Architecture

Thin facade + adapter registry. A platform-agnostic core package exposes `identify / alias / track / screen / reset`, internally fanning out to any number of registered adapters implementing a common interface.

```
packages/analytics-core/          # platform-agnostic TS
  types.ts                        # AnalyticsAdapter, InitContext
  catalog.ts                      # EventMap — typed event names + payloads
  client.ts                       # Analytics class
  queue.ts                        # pre-init / pre-consent buffer
  consent.ts                      # on/off gate
  adapters/
    posthog.ts                    # default adapter
    noop.ts                       # used when keys missing
    mock.ts                       # test adapter

apps/web/lib/analytics/           # Next.js wrapper
  provider.tsx                    # <AnalyticsProvider>
  usePageTracking.ts              # App Router pathname listener
  index.ts                        # re-exports typed track()

apps/mobile/lib/analytics/        # Expo wrapper
  provider.tsx                    # <AnalyticsProvider>
  useScreenTracking.ts            # react-navigation listener
  appStateTracker.ts              # session start/end via AppState
  index.ts
```

**Data flow:** call site → `analytics.track(name, props)` → consent check → enrich with user + session + platform context → fan out to every registered adapter → adapter formats & sends to its vendor SDK.

**Key boundary:** feature code imports only from `apps/<web|mobile>/lib/analytics`. Vendor SDKs are referenced only inside adapters.

## Core interfaces

```ts
// packages/analytics-core/types.ts
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

export interface InitContext {
  platform: 'web' | 'mobile';
  appVersion: string;
  env: 'development' | 'production';
  anonymousId: string;
}
```

```ts
// packages/analytics-core/catalog.ts
export type EventMap = {
  user_signed_up:  { method: 'email' | 'google' | 'apple' };
  user_logged_in:  { method: 'email' | 'google' | 'apple' };
  user_logged_out: {};
  page_viewed:     { path: string; referrer?: string };
  screen_viewed:   { name: string; params?: Record<string, unknown> };
  session_started: { source: 'cold' | 'foreground' };
  session_ended:   { duration_ms: number };
};
```

```ts
// packages/analytics-core/client.ts
export class Analytics {
  track<K extends keyof EventMap>(event: K, props: EventMap[K]): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
  alias(newUserId: string): void;
  screen(name: string, props?: Record<string, unknown>): void;
  reset(): void;
  setConsent(granted: boolean): void;
}
```

`track` is compile-time checked against `EventMap`. Typo = build error. Wrong props shape = build error.

## Identity model

- **Anonymous id** generated on first `init()` (uuid v4), persisted:
  - Web: `localStorage['analytics_anon_id']`
  - Mobile: `expo-secure-store` key `analytics_anon_id`
- Every event carries the anon id until `identify()` is called
- On login: `analytics.alias(user.id)` pairs anon → user; subsequent events attach `userId`
- On logout: `analytics.reset()` clears identity and regenerates a fresh anon id

## Auto-tracking (web)

- `<AnalyticsProvider>` mounted in root layout, initializes client with PostHog adapter
- `usePageTracking()` hook nested in root layout listens to `usePathname()` + `useSearchParams()` and fires `page_viewed` on change

## Auto-tracking (mobile)

- `<AnalyticsProvider>` at app root, initializes client
- `useScreenTracking()` hooks into `NavigationContainer.onStateChange`, fires `screen_viewed` on focused-route change
- `appStateTracker` uses `AppState` events:
  - `active` after `background` → `session_started { source: 'foreground' }`
  - `background` → `session_ended { duration_ms }`
  - First `init()` call → `session_started { source: 'cold' }`

## Consent gate

- `analytics.setConsent(granted)` — single switch
- When consent is false, `track / screen / identify` are dropped (not queued)
- When consent flips true, pre-init queue is flushed
- Wired to existing cookie banner (web) and a settings toggle (mobile)

## Error handling

- Each adapter call is wrapped in `try/catch`. One vendor throwing never breaks another or crashes the app. `console.warn` in dev, silent in prod.
- **Pre-init queue**: calls before `init()` completes go into an in-memory queue (cap 100), flushed on init.
- **Offline (mobile)**: rely on PostHog RN SDK's built-in batching + retry.
- **Missing API key**: `init()` logs a warning, registers `NoopAdapter`, app continues.

## Testing

- **Core package**: unit tests for `Analytics` with `MockAdapter` — assert fan-out, queue flush, consent gate, alias flow, reset clears identity.
- **Catalog**: type-level test (`expectTypeOf`) asserting `track('bad_name', {})` fails to compile.
- **Web**: integration test mounts `AnalyticsProvider` + triggers a route change, asserts `page_viewed` is emitted.
- **Mobile**: test around `useScreenTracking` with a mocked `NavigationContainer`.
- **No live vendor calls in any test** — MockAdapter only.

## Rollout

1. Build `analytics-core` + `PostHogAdapter` + `MockAdapter` + `NoopAdapter` with tests
2. Wire web provider + page tracking; ship behind `NEXT_PUBLIC_ANALYTICS_ENABLED`
3. Wire mobile provider + screen tracking; ship behind an app-config flag
4. Seed catalog with ~10 core events (auth, key feature entry points)
5. Enable in staging, verify events in PostHog, enable in prod
6. Add events incrementally — each new event = PR that adds to `EventMap`

## Out of scope

- Server-side tracking from Next.js API routes (add later if needed)
- A/B testing / feature flags
- Auto-click capture (explicitly rejected — conflicts with typed catalog discipline)
- Additional adapters (GTM, Mixpanel, Amplitude) — interface scaffolded, not implemented until demand exists

## Recommended services (reference)

- **PostHog Cloud free** — 1M events/mo + 5k replays/mo; covers analytics + replay in one tool. **Default.**
- Alternatives if PostHog is outgrown: Mixpanel free (analytics only), Amplitude free (analytics only), OpenReplay self-hosted (replay only), Microsoft Clarity (web replay only, free unlimited).
