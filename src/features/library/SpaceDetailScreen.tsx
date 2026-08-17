import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { type AgendaItem, formatLongDate, toLocalDateString, useData } from '@/data';
import { useItemEditor } from '@/features/item-editor/ItemEditorContext';
import { useLibrary } from '@/features/library/LibraryContext';
import { SettingsScaffold } from '@/features/settings/SettingsChrome';
import { type AgendaTheme, continuousCorner, fonts, useThemeStyles } from '@/theme';

export function SpaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repos, revision, setUI } = useData();
  const { openEdit } = useItemEditor();
  const { openEditSpace } = useLibrary();
  const router = useRouter();
  const { styles } = useThemeStyles(createStyles);
  const [name, setName] = useState('Space');
  const [items, setItems] = useState<AgendaItem[]>([]);
  const today = toLocalDateString();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const [space, spaceItems] = await Promise.all([
        repos.spaces.getById(id),
        repos.agenda.forSpace(id),
      ]);
      if (cancelled) return;
      setName(space?.name ?? 'Space');
      setItems(spaceItems);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, repos.agenda, repos.spaces, revision]);

  const sections = useMemo(() => {
    const active = items.filter((item) => !(item.type === 'task' && item.completed));
    const completed = items.filter((item) => item.type === 'task' && item.completed);
    const todayItems = active.filter((item) => item.date === today);
    const upcoming = active
      .filter((item) => item.date > today)
      .sort((a, b) => a.date.localeCompare(b.date));
    const past = active.filter((item) => item.date < today);
    return { todayItems, upcoming, past, completed };
  }, [items, today]);

  return (
    <>
      <Stack.Screen options={{ title: name }} />
      {Platform.OS === 'ios' ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button onPress={() => id && openEditSpace(id)}>Edit</Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <SettingsScaffold
        title={name}
        trailing={
          <Pressable onPress={() => id && openEditSpace(id)} hitSlop={8}>
            <Text style={styles.edit}>Edit</Text>
          </Pressable>
        }
      >
        <Pressable
          onPress={() => {
            if (!id) return;
            setUI({ activeSpaceId: id });
            router.back();
          }}
          style={styles.filterChip}
        >
          <Text style={styles.filterChipLabel}>Filter Today</Text>
        </Pressable>

        <Section title="Today" items={sections.todayItems} onOpen={openEdit} styles={styles} />
        <Section
          title="Upcoming"
          items={sections.upcoming}
          onOpen={openEdit}
          styles={styles}
          showDate
        />
        <Section title="Past" items={sections.past} onOpen={openEdit} styles={styles} showDate />
        <Section
          title="Completed"
          items={sections.completed}
          onOpen={openEdit}
          styles={styles}
          showDate
        />
      </SettingsScaffold>
    </>
  );
}

function Section({
  title,
  items,
  onOpen,
  showDate,
  styles,
}: {
  title: string;
  items: AgendaItem[];
  onOpen: (id: string) => void;
  showDate?: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title}
        {items.length ? ` · ${items.length}` : ''}
      </Text>
      {items.length === 0 ? (
        <EmptyState message={`No ${title.toLowerCase()} items.`} />
      ) : (
        <View style={styles.card}>
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => onOpen(item.id)}
              style={[styles.row, index === items.length - 1 && styles.lastRow]}
            >
              <Text style={styles.rowTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {showDate ? <Text style={styles.meta}>{formatLongDate(item.date)}</Text> : null}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    edit: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 16,
      color: theme.primary,
    },
    filterChip: {
      alignSelf: 'flex-start',
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: theme.section,
      ...continuousCorner(999),
    },
    filterChipLabel: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 14,
      color: theme.primary,
    },
    section: { gap: 8, marginBottom: 16 },
    sectionTitle: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 13,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: theme.textSecondary,
      paddingHorizontal: 4,
    },
    card: {
      backgroundColor: theme.section,
      ...continuousCorner(16),
      overflow: 'hidden',
    },
    row: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    lastRow: { borderBottomWidth: 0 },
    rowTitle: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 16,
      color: theme.text,
    },
    meta: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: theme.textSecondary,
    },
  });
}
