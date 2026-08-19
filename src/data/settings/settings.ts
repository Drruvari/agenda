import { createSettingsStoreFromStorage, type SettingsStore } from './types';

const STORAGE_PREFIX = 'agenda:';

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function createSettingsStore(): SettingsStore {
  return createSettingsStoreFromStorage({
    async getItem(key) {
      try {
        return localStorage.getItem(storageKey(key));
      } catch {
        return null;
      }
    },

    async setItem(key, value) {
      try {
        localStorage.setItem(storageKey(key), value);
      } catch {
        // Ignore quota / private-mode failures for preferences.
      }
    },

    async removeItem(key) {
      try {
        localStorage.removeItem(storageKey(key));
      } catch {
        // Ignore private-mode failures for preferences.
      }
    },
  });
}
