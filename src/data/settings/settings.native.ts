import Storage from 'expo-sqlite/kv-store';

import { createSettingsStoreFromStorage, type SettingsStore } from './types';

export function createSettingsStore(): SettingsStore {
  return createSettingsStoreFromStorage({
    async getItem(key) {
      return Storage.getItem(key);
    },

    async setItem(key, value) {
      await Storage.setItem(key, value);
    },

    async removeItem(key) {
      await Storage.removeItem(key);
    },
  });
}
