import { createContext, useContext } from 'react';

import type { DatabaseClient } from '@/data/database/types';
import type { Repositories } from '@/data/repositories/repositories';
import type { AppSettings, PlannerMode } from '@/data/schema/types';
import type { SettingsStore } from '@/data/settings/settings';

export type PlannerUIState = {
  selectedDate: string;
  mode: PlannerMode;
  activeSpaceId: string | null;
  completedExpanded: boolean;
  allDayExpanded: boolean;
  editingItemId: string | null;
};

export type DataContextValue = {
  db: DatabaseClient;
  repos: Repositories;
  settingsStore: SettingsStore;
  settings: AppSettings;
  setSettings: (settings: AppSettings) => Promise<void>;
  ui: PlannerUIState;
  setUI: (patch: Partial<PlannerUIState>) => void;
  revision: number;
  refresh: () => void;
};

export const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const value = useContext(DataContext);

  if (!value) {
    throw new Error('useData must be used within DataProvider');
  }

  return value;
}
