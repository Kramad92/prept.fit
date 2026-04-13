import type { AnalyticsAdapter, InitContext } from './types';
import type { EventMap, EventName } from './catalog';
import { EventQueue } from './queue';
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
      await this.safeAsync(() => a.init(ctx));
    }
    this.initialized = true;
    if (this.consent.granted) this.flushQueue();
  }

  setConsent(granted: boolean): void {
    this.consent.set(granted);
    if (granted && this.initialized) this.flushQueue();
    if (!granted) this.queue.drain();
  }

  track<K extends EventName>(event: K, props: EventMap[K]): void {
    if (!this.initialized || !this.consent.granted) {
      if (!this.initialized) {
        this.queue.push({ kind: 'track', event, props: props as Record<string, unknown> });
      }
      return;
    }
    for (const a of this.adapters) this.safe(() => a.track(event, props as Record<string, unknown>));
  }

  screen(name: string, props?: Record<string, unknown>): void {
    if (!this.initialized || !this.consent.granted) {
      if (!this.initialized) this.queue.push({ kind: 'screen', name, props });
      return;
    }
    for (const a of this.adapters) this.safe(() => a.screen(name, props));
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    if (!this.initialized || !this.consent.granted) {
      if (!this.initialized) this.queue.push({ kind: 'identify', userId, traits });
      return;
    }
    for (const a of this.adapters) this.safe(() => a.identify(userId, traits));
  }

  alias(newUserId: string): void {
    const anonId = this.ctx?.anonymousId ?? '';
    if (!this.initialized || !this.consent.granted) {
      if (!this.initialized) this.queue.push({ kind: 'alias', newUserId, anonymousId: anonId });
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
        case 'track':
          for (const a of this.adapters) this.safe(() => a.track(item.event, item.props));
          break;
        case 'screen':
          for (const a of this.adapters) this.safe(() => a.screen(item.name, item.props));
          break;
        case 'identify':
          for (const a of this.adapters) this.safe(() => a.identify(item.userId, item.traits));
          break;
        case 'alias':
          for (const a of this.adapters) this.safe(() => a.alias(item.newUserId, item.anonymousId));
          break;
      }
    }
  }

  private safe(fn: () => unknown): void {
    try {
      fn();
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('[analytics] adapter error:', err);
    }
  }

  private async safeAsync(fn: () => unknown): Promise<void> {
    try {
      await fn();
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('[analytics] adapter init error:', err);
    }
  }
}
