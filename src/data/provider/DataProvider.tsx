import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AgendaLogo } from '@/components/ui/AgendaLogo';
import { openDatabase } from '@/data/database/database';
import type { DatabaseClient } from '@/data/database/types';
import { createRepositories, type Repositories } from '@/data/repositories/repositories';
import { toLocalDateString } from '@/data/schema/ids';
import { type AppSettings, DEFAULT_SETTINGS } from '@/data/schema/types';
import { seedIfNeeded } from '@/data/seed/seed';
import { createSettingsStore } from '@/data/settings/settings';
import type { SettingsStore } from '@/data/settings/types';
import { AppThemeProvider } from '@/theme/AppThemeProvider';
import { useAgendaFonts } from '@/theme/loadFonts';

import { DataContext, type DataContextValue, type PlannerUIState } from './DataContext';

type DataResources = {
  db: DatabaseClient;
  repos: Repositories;
  settingsStore: SettingsStore;
};

function createInitialUIState(): PlannerUIState {
  return {
    selectedDate: toLocalDateString(),
    mode: 'today',
    activeSpaceId: null,
    completedExpanded: false,
    allDayExpanded: true,
    editingItemId: null,
  };
}

export function DataProvider({ children }: PropsWithChildren) {
  const fontsReady = useAgendaFonts();
  const [resources, setResources] = useState<DataResources | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [revision, setRevision] = useState(0);

  const [ui, setUIState] = useState<PlannerUIState>(createInitialUIState);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const db = await openDatabase();

        await seedIfNeeded(db);

        const repos = createRepositories(db);

        const settingsStore = createSettingsStore();

        const [loadedSettings, selectedDate, activeSpace] = await Promise.all([
          settingsStore.getSettings(),
          settingsStore.getItem('planner.lastSelectedDate'),
          settingsStore.getItem('planner.activeSpace'),
        ]);

        if (cancelled) {
          return;
        }

        setSettingsState(loadedSettings);

        setUIState((current) => ({
          ...current,
          selectedDate: selectedDate || current.selectedDate,
          activeSpaceId: activeSpace && activeSpace !== 'all' ? activeSpace : null,
        }));

        setResources({
          db,
          repos,
          settingsStore,
        });
      } catch (bootError) {
        if (cancelled) {
          return;
        }

        setError(bootError instanceof Error ? bootError.message : 'Failed to open database');
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  const setUI = useCallback(
    (patch: Partial<PlannerUIState>) => {
      setUIState((current) => ({
        ...current,
        ...patch,
      }));

      const store = resources?.settingsStore;

      if (!store) {
        return;
      }

      if (patch.selectedDate !== undefined) {
        void store.setItem('planner.lastSelectedDate', patch.selectedDate);
      }

      if (patch.activeSpaceId !== undefined) {
        void store.setItem('planner.activeSpace', patch.activeSpaceId ?? 'all');
      }
    },
    [resources],
  );

  const setSettings = useCallback(
    async (next: AppSettings): Promise<void> => {
      const store = resources?.settingsStore;

      if (!store) {
        return;
      }

      await store.setSettings(next);

      setSettingsState(next);
    },
    [resources],
  );

  const refresh = useCallback(() => {
    setRevision((value) => value + 1);
  }, []);

  const value = useMemo<DataContextValue | null>(() => {
    if (!resources) {
      return null;
    }

    return {
      ...resources,
      settings,
      setSettings,
      ui,
      setUI,
      revision,
      refresh,
    };
  }, [resources, settings, setSettings, ui, setUI, revision, refresh]);

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Could not start Agenda</Text>

        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  if (!value || !fontsReady) {
    return (
      <View style={styles.centered}>
        <AgendaLogo size={28} color="#5856D6" spin />
      </View>
    );
  }

  return (
    <DataContext.Provider value={value}>
      <AppThemeProvider settings={settings}>{children}</AppThemeProvider>
    </DataContext.Provider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F5',
    padding: 24,
  },

  errorTitle: {
    color: '#191917',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },

  errorBody: {
    color: '#5E5E59',
    fontSize: 15,
    textAlign: 'center',
  },
});
