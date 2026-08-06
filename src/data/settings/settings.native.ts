import Storage from 'expo-sqlite/kv-store';

import { createSettingsHelpers, type SettingsStore } from './types';

export function createSettingsStore(): SettingsStore {
  return createSettingsHelpers({
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

export type { SettingsStore } from './types';
