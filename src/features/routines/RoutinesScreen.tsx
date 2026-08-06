import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { type Routine, useData } from '@/data';
import { type AgendaTheme, continuousCorner, useThemeStyles } from '@/theme';

export function RoutinesScreen() {
  const { styles } = useThemeStyles(createStyles);
  const { repos, revision, refresh, ui } = useData();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void Promise.all([
      repos.routines.listAll(),
      repos.routines.completionsForDate(ui.selectedDate),
    ]).then(([list, completions]) => {
      setRoutines(list);
      setCompletedIds(new Set(completions.map((entry) => entry.routineId)));
    });
  }, [repos.routines, revision, ui.selectedDate]);

  const toggle = async (id: string) => {
    await repos.routines.toggleCompletion(id, ui.selectedDate);
    refresh();
  };

  return (
    <Screen title="Routines" description="Daily routines are stored privately on this device.">
      <View style={styles.list}>
        {routines.length === 0 ? (
          <EmptyState message="No routines yet. Create one to build a habit." />
        ) : (
          routines.map((routine) => (
            <View key={routine.id} style={[styles.row, !routine.active && styles.inactive]}>
              <Pressable
                onPress={() => void toggle(routine.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: completedIds.has(routine.id) }}
                style={[styles.check, completedIds.has(routine.id) && styles.checked]}
              >
                <Text style={styles.checkMark}>{completedIds.has(routine.id) ? '✓' : ''}</Text>
              </Pressable>
              <Pressable
                style={styles.rowCopy}
                onPress={() => router.push(`/routines/${routine.id}`)}
              >
                <Text style={styles.name}>{routine.name}</Text>
                <Text style={styles.meta}>{routine.active ? 'Active' : 'Paused'}</Text>
              </Pressable>
            </View>
          ))
        )}
        <Pressable onPress={() => router.push('/routine-create')} style={styles.addButton}>
          <Text style={styles.addLabel}>Add routine</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    list: { gap: 10 },
    row: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.card,
      padding: 14,
      ...continuousCorner(14),
    },
    inactive: { opacity: 0.55 },
    check: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checked: { backgroundColor: theme.primary, borderColor: theme.primary },
    checkMark: { color: theme.onPrimary, fontWeight: '800' },
    rowCopy: { flex: 1 },
    name: { color: theme.text, fontSize: 16, fontWeight: '600' },
    meta: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
    addButton: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      ...continuousCorner(14),
    },
    addLabel: { color: theme.onPrimary, fontSize: 15, fontWeight: '700' },
  });
}
