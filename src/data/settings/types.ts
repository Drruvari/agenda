import { type AppSettings, DEFAULT_SETTINGS } from '@/data/schema/types';

const SETTINGS_KEY = 'app.settings';

export type SettingsStore = {
  getSettings(): Promise<AppSettings>;
  setSettings(settings: AppSettings): Promise<void>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

type SettingsStorage = Pick<SettingsStore, 'getItem' | 'setItem' | 'removeItem'>;

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

function parseSettings(raw: string | null): AppSettings {
  if (!raw) {
    return cloneSettings();
  }

  try {
    return mergeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return cloneSettings();
  }
}

export function createSettingsStoreFromStorage(storage: SettingsStorage): SettingsStore {
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),

    async getSettings() {
      const raw = await storage.getItem(SETTINGS_KEY);
      return parseSettings(raw);
    },

    async setSettings(settings) {
      await storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    },
  };
}
