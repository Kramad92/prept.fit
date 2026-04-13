import type { AnalyticsAdapter, InitContext } from '../types';

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
    this.client.register({
      platform: ctx.platform,
      app_version: ctx.appVersion,
      env: ctx.env,
    });
  }

  identify(id: string, traits?: Record<string, unknown>) {
    this.client?.identify(id, traits);
  }
  alias(newUserId: string) {
    this.client?.alias(newUserId);
  }
  track(event: string, props?: Record<string, unknown>) {
    this.client?.capture(event, props);
  }
  screen(name: string, props?: Record<string, unknown>) {
    this.client?.screen(name, props);
  }
  reset() {
    this.client?.reset();
  }
  async flush() {
    await this.client?.flush();
  }
}
