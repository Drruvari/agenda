import { FieldGroup, Host, Icon, ListItem, Text } from '@expo/ui';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { PlatformColor, StyleSheet, Text as RNText } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useData } from '@/data/provider/DataContext';
import type { AgendaItem, DailyNote, Space } from '@/data/schema/types';
import { useLibrary } from '@/features/library';
import { useAppAppearance } from '@/theme/AppThemeProvider';

export default function LibraryScreen() {
  const router = useRouter();
  const { repos, revision } = useData();
  const { openCreateSpace } = useLibrary();
  const { accent, colorScheme } = useAppAppearance();
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

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <RNText accessibilityRole="header" style={styles.title}>
        Library
      </RNText>
      <Host
        colorScheme={colorScheme}
        seedColor={accent}
        style={styles.host}
        useViewportSizeMeasurement
      >
        <FieldGroup>
          <FieldGroup.Section title="Collections">
            <LibraryRow
              count={items.length}
              icon="tray.full"
              label="All Items"
              onPress={() => router.push('/library/items')}
            />
            <LibraryRow
              count={items.filter((item) => !item.spaceId).length}
              icon="tray"
              label="Inbox"
              onPress={() => router.push('/library/inbox')}
            />
            <LibraryRow
              count={items.filter((item) => item.type === 'task' && item.completed).length}
              icon="checkmark.circle"
              label="Completed"
              onPress={() => router.push('/library/completed')}
            />
            <LibraryRow
              count={notes.length}
              icon="book.pages"
              label="Daily Notes"
              onPress={() => router.push('/library/notes')}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Spaces">
            {spaces.map((space) => (
              <ListItem
                key={space.id}
                leading={<Icon color={space.color} name="circle.fill" size={18} />}
                onPress={() => router.push(`/library/space/${space.id}` as never)}
                supportingText={space.isPinned ? 'Pinned to Today' : 'Space'}
                trailing={<Icon name="chevron.right" size={14} />}
              >
                <Text>{space.name}</Text>
              </ListItem>
            ))}
            <ListItem leading={<Icon name="plus.circle" size={20} />} onPress={openCreateSpace}>
              <Text>Add Space</Text>
            </ListItem>
          </FieldGroup.Section>
          <FieldGroup.Section title="App">
            <ListItem
              leading={<Icon name="gearshape" size={19} />}
              onPress={() => router.push('/settings')}
              trailing={<Icon name="chevron.right" size={14} />}
            >
              <Text>Settings</Text>
            </ListItem>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  title: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 20,
    color: PlatformColor('label'),
    fontFamily: 'System',
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  host: { flex: 1 },
});

function LibraryRow({
  count,
  icon,
  label,
  onPress,
}: {
  count: number;
  icon: 'tray.full' | 'tray' | 'checkmark.circle' | 'book.pages';
  label: string;
  onPress: () => void;
}) {
  return (
    <ListItem
      leading={<Icon name={icon} size={20} />}
      onPress={onPress}
      trailing={<Text>{String(count)}</Text>}
    >
      <Text>{label}</Text>
    </ListItem>
  );
}
