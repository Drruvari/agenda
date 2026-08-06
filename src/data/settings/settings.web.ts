import { createSettingsHelpers, type SettingsStore } from './types';

const PREFIX = 'agenda:';

export function createSettingsStore(): SettingsStore {
  return createSettingsHelpers({
    async getItem(key) {
      try {
        return localStorage.getItem(PREFIX + key);
      } catch {
        return null;
      }
    },
    async setItem(key, value) {
      try {
        localStorage.setItem(PREFIX + key, value);
      } catch {
        // Ignore quota / private-mode failures for preferences.
      }
    },
    async removeItem(key) {
      try {
        localStorage.removeItem(PREFIX + key);
      } catch {
        // Ignore private-mode failures for preferences.
      }
    },
  });
}

export type { SettingsStore } from './types';
