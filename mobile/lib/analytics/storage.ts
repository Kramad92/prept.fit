import * as SecureStore from 'expo-secure-store';
import type { AnonIdStorage } from '@analytics-core/anon-id';

export const mobileAnonIdStorage: AnonIdStorage = {
  async get(key) {
    return SecureStore.getItemAsync(key);
  },
  async set(key, value) {
    await SecureStore.setItemAsync(key, value);
  },
  async delete(key) {
    await SecureStore.deleteItemAsync(key);
  },
};
