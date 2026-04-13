import type { AnonIdStorage } from './core/anon-id';

export const webAnonIdStorage: AnonIdStorage = {
  async get(key) {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  async set(key, value) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  },
  async delete(key) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
};
