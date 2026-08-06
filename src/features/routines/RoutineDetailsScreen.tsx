import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { type Routine, useData } from '@/data';
import { type AgendaTheme, continuousCorner, useThemeStyles } from '@/theme';

export function RoutineDetailsScreen() {
  const { styles } = useThemeStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const routineId = Array.isArray(id) ? id[0] : id;
  const { repos, refresh, revision } = useData();
  const [routine, setRoutine] = useState<Routine | null>(null);

  useEffect(() => {
    if (routineId) void repos.routines.getById(routineId).then(setRoutine);
  }, [repos.routines, revision, routineId]);

  if (!routine)
    return (
      <Screen title="Routine">
        <Text style={styles.meta}>Routine not found.</Text>
      </Screen>
    );

  const toggleActive = async () => {
    await repos.routines.update({ ...routine, active: !routine.active });
    refresh();
  };
  const confirmDelete = () =>
    Alert.alert('Delete routine?', 'This removes the routine and its completion history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void repos.routines.delete(routine.id).then(() => {
            refresh();
            router.replace('/routines');
          });
        },
      },
    ]);

  return (
    <Screen title={routine.name} description={routine.active ? 'Active every day' : 'Paused'}>
      <View style={styles.actions}>
        <Pressable onPress={() => void toggleActive()} style={styles.button}>
          <Text style={styles.buttonText}>
            {routine.active ? 'Pause routine' : 'Resume routine'}
          </Text>
        </Pressable>
        <Pressable onPress={confirmDelete} style={[styles.button, styles.deleteButton]}>
          <Text style={[styles.buttonText, styles.deleteText]}>Delete routine</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    actions: { gap: 10 },
    meta: { color: theme.textSecondary, fontSize: 15 },
    button: {
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card,
      ...continuousCorner(14),
    },
    buttonText: { color: theme.text, fontSize: 15, fontWeight: '700' },
    deleteButton: { backgroundColor: theme.primarySoft },
    deleteText: { color: theme.danger },
  });
}
