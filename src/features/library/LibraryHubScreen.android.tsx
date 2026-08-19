import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SettingsRow } from '@/components/ui/settings/SettingsRow';
import { SettingsSection } from '@/components/ui/settings/SettingsSection';
import { useData } from '@/data/provider/DataContext';
import type { AgendaItem, DailyNote, Space } from '@/data/schema/types';
import { useThemeStyles } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { layout, spacing } from '@/theme/tokens';
import { type } from '@/theme/type';

import { useLibrary } from './LibraryContext';

export function LibraryHubScreen() {
  const router = useRouter();
  const { repos, revision } = useData();
  const { openCreateSpace } = useLibrary();
  const { styles } = useThemeStyles(createStyles);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([repos.agenda.list(), repos.notes.list(), repos.spaces.list()]).then(
      ([nextItems, nextNotes, nextSpaces]) => {
        if (cancelled) return;
        setItems(nextItems);
        setNotes(nextNotes);
        setSpaces(nextSpaces.filter((space) => space.name.toLowerCase() !== 'inbox'));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [repos, revision]);

  const inboxCount = items.filter((item) => !item.spaceId).length;
  const completedCount = items.filter((item) => item.type === 'task' && item.completed).length;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Library" />

        <SettingsSection title="Collections">
          <SettingsRow
            icon="checklist"
            label="All Items"
            onPress={() => router.push('/library/items')}
            trailing={<Text style={styles.count}>{items.length}</Text>}
          />
          <SettingsRow
            icon="inbox"
            label="Inbox"
            onPress={() => router.push('/library/inbox')}
            trailing={<Text style={styles.count}>{inboxCount}</Text>}
          />
          <SettingsRow
            icon="completed"
            label="Completed"
            onPress={() => router.push('/library/completed')}
            trailing={<Text style={styles.count}>{completedCount}</Text>}
          />
          <SettingsRow
            icon="notebook"
            label="Daily Notes"
            last
            onPress={() => router.push('/library/notes')}
            trailing={<Text style={styles.count}>{notes.length}</Text>}
          />
        </SettingsSection>

        <SettingsSection title="Spaces">
          {spaces.map((space) => (
            <SettingsRow
              key={space.id}
              label={space.name}
              leading={<View style={[styles.swatch, { backgroundColor: space.color }]} />}
              onPress={() => router.push(`/library/space/${space.id}` as never)}
              subtitle={space.isPinned ? 'Pinned to Today' : 'Space'}
            />
          ))}
          <SettingsRow icon="add" label="Add Space" last onPress={openCreateSpace} />
        </SettingsSection>

        <SettingsSection title="App">
          <SettingsRow
            icon="settings"
            label="Settings"
            last
            onPress={() => router.push('/settings')}
          />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    content: {
      paddingHorizontal: layout.screenPadding,
      paddingTop: spacing.sm,
      paddingBottom: 28,
      gap: layout.sectionGap,
    },
    swatch: {
      width: 14,
      height: 14,
      borderRadius: 7,
      marginHorizontal: 8,
    },
    count: {
      color: theme.textSecondary,
      ...type.body,
      fontSize: 15,
    },
  });
}
