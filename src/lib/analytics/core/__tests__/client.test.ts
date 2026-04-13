import { describe, it, expect, beforeEach } from 'vitest';
import { Analytics } from '../client';
import { MockAdapter } from '../adapters/mock';

function makeCtx() {
  return {
    platform: 'web' as const,
    appVersion: '1.0.0',
    env: 'development' as const,
    anonymousId: 'anon-1',
  };
}

describe('Analytics.track', () => {
  let a: Analytics;
  let m: MockAdapter;
  beforeEach(() => {
    m = new MockAdapter();
    a = new Analytics();
  });

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
    a.registerAdapter(m);
    a.registerAdapter(m2);
    await a.init(makeCtx());
    a.setConsent(true);
    a.track('user_logged_in', { method: 'email' });
    expect(m.calledWith('track').length).toBe(1);
    expect(m2.calledWith('track').length).toBe(1);
  });

  it('swallows adapter errors', async () => {
    a.registerAdapter(m);
    await a.init(makeCtx());
    a.setConsent(true);
    m.shouldThrow = true;
    expect(() => a.track('user_logged_in', { method: 'email' })).not.toThrow();
  });
});

describe('Analytics identity', () => {
  let a: Analytics;
  let m: MockAdapter;
  beforeEach(async () => {
    m = new MockAdapter();
    a = new Analytics();
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
