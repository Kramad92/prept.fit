import posthog from 'posthog-js';
import type { AnalyticsAdapter, InitContext } from '../types';

export interface PostHogWebOptions {
  apiKey: string;
  host?: string;
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
        ph.register({
          platform: ctx.platform,
          app_version: ctx.appVersion,
          env: ctx.env,
        });
      },
    });
  }

  identify(userId: string, traits?: Record<string, unknown>) {
    posthog.identify(userId, traits);
  }
  alias(newUserId: string, anonymousId: string) {
    posthog.alias(newUserId, anonymousId);
  }
  track(event: string, props?: Record<string, unknown>) {
    posthog.capture(event, props);
  }
  screen(name: string, props?: Record<string, unknown>) {
    posthog.capture('screen_viewed', { name, ...props });
  }
  reset() {
    posthog.reset();
  }
  async flush() {}
}
