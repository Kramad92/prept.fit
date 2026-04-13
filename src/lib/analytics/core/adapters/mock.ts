import type { AnalyticsAdapter, InitContext } from '../types';

export interface MockCall {
  method: 'init' | 'identify' | 'alias' | 'track' | 'screen' | 'reset' | 'flush';
  args: unknown[];
}

export class MockAdapter implements AnalyticsAdapter {
  name = 'mock';
  calls: MockCall[] = [];
  shouldThrow = false;

  init(ctx: InitContext) { this.push('init', [ctx]); }
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
    return this.calls.filter((c) => c.method === method);
  }
}
