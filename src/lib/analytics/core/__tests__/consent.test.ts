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
    c.onChange((v) => seen.push(v));
    c.set(false);
    c.set(true);
    c.set(true);
    c.set(false);
    expect(seen).toEqual([true, false]);
  });
});
