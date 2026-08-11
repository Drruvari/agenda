import { FieldGroup, Host, Icon, ListItem, Text } from '@expo/ui';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { type AgendaItem, type DailyNote, type Space, useData } from '@/data';
import { useLibrary } from '@/features/library';
import { useAppAppearance } from '@/theme';

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
    <Host
      colorScheme={colorScheme}
      seedColor={accent}
      style={{ flex: 1 }}
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
            onPress={() => router.push('/library/items?filter=inbox' as never)}
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
      </FieldGroup>
    </Host>
  );
}

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
