import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { type DailyNote, formatLongDate, useData } from '@/data';
import { SettingsScaffold } from '@/features/settings/SettingsChrome';
import { type AgendaTheme, continuousCorner, fonts, useThemeStyles } from '@/theme';

export function DailyNotesBrowserScreen() {
  const { repos, revision, setUI } = useData();
  const router = useRouter();
  const { styles } = useThemeStyles(createStyles);
  const [notes, setNotes] = useState<DailyNote[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const notes = await repos.notes.list();
      if (!cancelled) setNotes(notes);
    })();
    return () => {
      cancelled = true;
    };
  }, [repos.notes, revision]);

  return (
    <SettingsScaffold title="Daily Notes" scroll={false}>
      <FlatList
        data={notes}
        keyExtractor={(note) => note.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState message="No daily notes yet." />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setUI({ selectedDate: item.date });
              router.replace('/' as never);
            }}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.date}>{formatLongDate(item.date)}</Text>
            <Text style={styles.preview} numberOfLines={3}>
              {item.bodyText.trim() || (item.drawingId ? 'Drawing' : 'Empty note')}
            </Text>
          </Pressable>
        )}
      />
    </SettingsScaffold>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    list: { paddingBottom: 40, gap: 8, flexGrow: 1 },
    row: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.section,
      ...continuousCorner(14),
      gap: 6,
    },
    date: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 15,
      color: theme.primary,
    },
    preview: {
      fontFamily: fonts.sans,
      fontSize: 15,
      lineHeight: 21,
      color: theme.text,
    },
    pressed: { opacity: 0.75 },
  });
}
