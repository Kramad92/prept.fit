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
