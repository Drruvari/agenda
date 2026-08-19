import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import {
  AgendaBottomSheet,
  AgendaSheetHeader,
  SHEET_DISMISS_MS,
} from '@/components/ui/sheet/Sheet';
import { useData } from '@/data/provider/DataContext';
import type { Routine } from '@/data/schema/types';
import { useAppSheets } from '@/features/app-sheets/AppSheetsContext';
import { useItemEditor } from '@/features/item-editor/ItemEditorContext';
import { useThemeStyles } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { continuousCorner } from '@/theme/tokens';

export function RoutinesSheet({ onDismiss }: { onDismiss: () => void }) {
  const { styles, theme } = useThemeStyles(createStyles);
  const { repos, revision, refresh, ui } = useData();
  const { openCreate, openEditRoutine } = useItemEditor();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [presented, setPresented] = useState(true);
  const closed = useRef(false);
  const sheetHeight = useMemo(
    () => Math.min(520, 58 + 32 + Math.max(64, routines.length * 72)),
    [routines.length],
  );

  useEffect(() => {
    void Promise.all([
      repos.routines.listAll(),
      repos.routines.completionsForDate(ui.selectedDate),
    ]).then(([list, completions]) => {
      setRoutines(list);
      setCompletedIds(new Set(completions.map((entry) => entry.routineId)));
    });
  }, [repos.routines, revision, ui.selectedDate]);

  const finishClose = () => {
    if (closed.current) return;
    closed.current = true;
    onDismiss();
  };

  const close = () => {
    setPresented(false);
    setTimeout(finishClose, SHEET_DISMISS_MS);
  };

  const handOff = (action: () => void) => {
    setPresented(false);
    setTimeout(() => {
      finishClose();
      action();
    }, SHEET_DISMISS_MS);
  };

  const toggle = async (id: string) => {
    await repos.routines.toggleCompletion(id, ui.selectedDate);
    refresh();
  };

  return (
    <AgendaBottomSheet height={sheetHeight} isPresented={presented} onDismiss={finishClose}>
      <View style={styles.root}>
        <AgendaSheetHeader
          title="Routines"
          onCancel={close}
          action={{
            label: 'Add routine',
            icon: 'add',
            onPress: () => handOff(() => openCreate('routine')),
          }}
        />

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {routines.length === 0 ? (
            <EmptyState message="No routines yet. Create one to build a habit." />
          ) : (
            routines.map((routine) => {
              const completed = completedIds.has(routine.id);
              return (
                <View key={routine.id} style={[styles.row, !routine.active && styles.inactive]}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: completed }}
                    hitSlop={8}
                    onPress={() => void toggle(routine.id)}
                    style={[styles.check, completed && styles.checked]}
                  >
                    {completed ? (
                      <Icon name="check" size={17} color={theme.onPrimary} stroke={2.5} />
                    ) : null}
                  </Pressable>
                  <Pressable
                    onPress={() => handOff(() => openEditRoutine(routine.id))}
                    style={styles.rowCopy}
                  >
                    <Text style={styles.name}>{routine.name}</Text>
                    <Text style={styles.meta}>{routine.active ? 'Every day' : 'Paused'}</Text>
                  </Pressable>
                  <Icon name="chevronRight" size={18} color={theme.textSecondary} />
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </AgendaBottomSheet>
  );
}

export function RoutinesScreen() {
  const { close } = useAppSheets();
  return <RoutinesSheet onDismiss={close} />;
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    list: {
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 8 : 16,
      paddingBottom: Platform.OS === 'ios' ? 32 : 16,
      gap: Platform.OS === 'ios' ? 0 : 8,
    },
    row: {
      minHeight: 64,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.section,
      ...continuousCorner(16),
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
    rowCopy: { flex: 1, paddingVertical: 12 },
    name: { fontFamily: fonts.sansMedium, fontSize: 16, color: theme.text },
    meta: { marginTop: 2, fontFamily: fonts.sans, fontSize: 13, color: theme.textSecondary },
  });
}
