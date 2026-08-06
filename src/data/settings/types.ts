import type { AppSettings } from '@/data/schema/types';
import { DEFAULT_SETTINGS } from '@/data/schema/types';

const SETTINGS_KEY = 'app.settings';

function cloneSettings(settings: AppSettings = DEFAULT_SETTINGS): AppSettings {
  return {
    general: { ...settings.general },
    editor: { ...settings.editor },
  };
}

function mergeSettings(stored: Partial<AppSettings> | null): AppSettings {
  if (!stored) {
    return cloneSettings();
  }

  return {
    general: { ...DEFAULT_SETTINGS.general, ...stored.general },
    editor: { ...DEFAULT_SETTINGS.editor, ...stored.editor },
  };
}

export type SettingsStore = {
  getSettings(): Promise<AppSettings>;
  setSettings(settings: AppSettings): Promise<void>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export function createSettingsHelpers(
  store: Pick<SettingsStore, 'getItem' | 'setItem' | 'removeItem'>,
): SettingsStore {
  return {
    getItem: store.getItem,
    setItem: store.setItem,
    removeItem: store.removeItem,
    async getSettings() {
      const raw = await store.getItem(SETTINGS_KEY);
      if (!raw) {
        return cloneSettings();
      }
      try {
        return mergeSettings(JSON.parse(raw) as Partial<AppSettings>);
      } catch {
        return cloneSettings();
      }
    },
    async setSettings(settings: AppSettings) {
      await store.setItem(SETTINGS_KEY, JSON.stringify(settings));
    },
  };
}
