import { describe, it, expect } from 'vitest';
import { getOrCreateAnonymousId, resetAnonymousId, type AnonIdStorage } from '../anon-id';

function memoryStorage(): AnonIdStorage {
  const store = new Map<string, string>();
  return {
    async get(k) {
      return store.get(k) ?? null;
    },
    async set(k, v) {
      store.set(k, v);
    },
    async delete(k) {
      store.delete(k);
    },
  };
}

describe('getOrCreateAnonymousId', () => {
  it('creates a uuid on first call and persists it', async () => {
    const s = memoryStorage();
    const id1 = await getOrCreateAnonymousId(s);
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const id2 = await getOrCreateAnonymousId(s);
    expect(id2).toBe(id1);
  });

  it('resetAnonymousId creates a new id', async () => {
    const s = memoryStorage();
    const a = await getOrCreateAnonymousId(s);
    const b = await resetAnonymousId(s);
    expect(b).not.toBe(a);
  });
});
