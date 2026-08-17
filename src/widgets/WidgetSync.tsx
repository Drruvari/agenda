import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useData } from '@/data/provider/DataContext';
import { toLocalDateString } from '@/data/schema/ids';
import type { TaskItem } from '@/data/schema/types';
import { completeAgendaTask, uncompleteAgendaTask } from '@/domain/agendaLifecycle';

import { buildWidgetSnapshot } from './buildWidgetSnapshot';
import { drainPendingWidgetToggles, publishWidgetSnapshot } from './publishWidgetSnapshot';

export function WidgetSync() {
  const { repos, revision, refresh } = useData();
  const requestRef = useRef(0);
  const generationRef = useRef(0);
  const dateRef = useRef(toLocalDateString());

  const applyPendingAndroidToggles = useCallback(async () => {
    if (Platform.OS !== 'android') return false;
    const pending = await drainPendingWidgetToggles();
    if (pending.length === 0) return false;
    for (const toggle of pending) {
      const item = await repos.agenda.getById(toggle.id);
      if (!item || item.type !== 'task') continue;
      const task = item as TaskItem;
      if (toggle.completed && !task.completed) await completeAgendaTask(repos, task);
      if (!toggle.completed && task.completed) await uncompleteAgendaTask(repos, task);
    }
    return true;
  }, [repos]);

  const sync = useCallback(async () => {
    const request = ++requestRef.current;
    const generation = Math.max(Date.now(), generationRef.current + 1);
    generationRef.current = generation;
    try {
      const applied = await applyPendingAndroidToggles();
      if (applied) {
        refresh();
        return;
      }
      const snapshot = await buildWidgetSnapshot(repos, generation);
      if (request !== requestRef.current) return;
      await publishWidgetSnapshot(snapshot);
    } catch (error) {
      console.error('[widget-sync]', error);
    }
  }, [applyPendingAndroidToggles, refresh, repos]);

  useEffect(() => {
    void sync();
  }, [revision, sync]);

  useEffect(() => {
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    const dayRollover = setInterval(() => {
      const nextDate = toLocalDateString();
      if (nextDate !== dateRef.current) {
        dateRef.current = nextDate;
        void sync();
      }
    }, 60_000);
    const pendingPoll =
      Platform.OS === 'android'
        ? setInterval(() => {
            void (async () => {
              const applied = await applyPendingAndroidToggles();
              if (applied) refresh();
            })();
          }, 2_000)
        : null;
    return () => {
      appState.remove();
      clearInterval(dayRollover);
      if (pendingPoll) clearInterval(pendingPoll);
    };
  }, [applyPendingAndroidToggles, refresh, sync]);

  return null;
}
