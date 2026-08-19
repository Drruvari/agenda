import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AgendaLogo } from '@/components/ui/AgendaLogo';
import { openDatabase } from '@/data/database/database';
import type { DatabaseClient } from '@/data/database/types';
import { SCHEMA_VERSION } from '@/data/database/types';
import { createRepositories, type Repositories } from '@/data/repositories';
import { toLocalDateString } from '@/data/schema/ids';
import type { AppSettings } from '@/data/schema/types';
import { DEFAULT_SETTINGS } from '@/data/schema/types';
import { seedIfNeeded } from '@/data/seed/seed';
import { createSettingsStore, type SettingsStore } from '@/data/settings/settings';
import { AppThemeProvider } from '@/theme/AppThemeProvider';

import { DataContext, type DataContextValue, type PlannerUIState, useData } from './DataContext';

export type { DataContextValue, PlannerUIState };
export { useData };

export function DataProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [db, setDb] = useState<DatabaseClient | null>(null);
  const [repos, setRepos] = useState<Repositories | null>(null);
  const [settingsStore, setSettingsStore] = useState<SettingsStore | null>(null);
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [revision, setRevision] = useState(0);
  const [ui, setUIState] = useState<PlannerUIState>({
    selectedDate: toLocalDateString(),
    mode: 'today',
    activeSpaceId: null,
    completedExpanded: false,
    allDayExpanded: true,
    editingItemId: null,
  });

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    async function boot() {
      try {
        const database = await openDatabase();
        await seedIfNeeded(database);
        const repositories = createRepositories(database);
        const store = createSettingsStore();
        const loadedSettings = await store.getSettings();

        const savedDate = await store.getItem('planner.lastSelectedDate');
        const savedSpace = await store.getItem('planner.activeSpace');

        if (cancelled) {
          return;
        }

        setDb(database);
        setRepos(repositories);
        setSettingsStore(store);
        setSettingsState(loadedSettings);
        setUIState((current) => ({
          ...current,
          selectedDate: savedDate || current.selectedDate,
          activeSpaceId: savedSpace && savedSpace !== 'all' ? savedSpace : null,
        }));
        setReady(true);
      } catch (bootError) {
        if (!cancelled) {
          setError(bootError instanceof Error ? bootError.message : 'Failed to open database');
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [SCHEMA_VERSION]);

  const setUI = useCallback(
    (patch: Partial<PlannerUIState>) => {
      setUIState((current) => {
        const next = { ...current, ...patch };
        if (settingsStore) {
          if (patch.selectedDate !== undefined) {
            void settingsStore.setItem('planner.lastSelectedDate', next.selectedDate);
          }
          if (patch.activeSpaceId !== undefined) {
            void settingsStore.setItem('planner.activeSpace', next.activeSpaceId ?? 'all');
          }
        }
        return next;
      });
    },
    [settingsStore],
  );

  const setSettings = useCallback(
    async (next: AppSettings) => {
      if (!settingsStore) {
        return;
      }
      setSettingsState(next);
      await settingsStore.setSettings(next);
    },
    [settingsStore],
  );

  const refresh = useCallback(() => {
    setRevision((value) => value + 1);
  }, []);

  const value = useMemo<DataContextValue | null>(() => {
    if (!db || !repos || !settingsStore) {
      return null;
    }

    return {
      db,
      repos,
      settingsStore,
      settings,
      setSettings,
      ui,
      setUI,
      revision,
      refresh,
    };
  }, [db, repos, settingsStore, settings, setSettings, ui, setUI, revision, refresh]);

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Could not start Agenda</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  if (!ready || !value) {
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
