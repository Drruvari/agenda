import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import {
  type AgendaItem,
  formatLongDate,
  INBOX_FILTER_ID,
  matchesSpaceFilter,
  type Space,
  toLocalDateString,
  useData,
} from '@/data';
import { useItemEditor } from '@/features/item-editor/ItemEditorContext';
import { SettingsScaffold } from '@/features/settings/SettingsChrome';
import { type AgendaTheme, continuousCorner, fonts, useThemeStyles } from '@/theme';

type BrowseMode = 'all' | 'inbox' | 'completed' | 'space';

type BrowseScope = { mode: BrowseMode; spaceId?: string };

function resolveMode(
  pathnameHint: string | undefined,
  spaceIdParam: string | undefined,
  filterParam: string | undefined,
): BrowseScope {
  if (spaceIdParam) return { mode: 'space', spaceId: spaceIdParam };
  if (pathnameHint === 'completed' || filterParam === 'completed') return { mode: 'completed' };
  if (filterParam === 'inbox') return { mode: 'inbox' };
  return { mode: 'all' };
}

export function ItemsBrowserScreen({
  forcedMode,
}: {
  forcedMode?: BrowseMode;
} = {}) {
  const params = useLocalSearchParams<{ spaceId?: string; filter?: string }>();
  const { repos, revision } = useData();
  const { openEdit } = useItemEditor();
  const router = useRouter();
  const { styles } = useThemeStyles(createStyles);
  const routeScope = useMemo(
    () => resolveMode(forcedMode, params.spaceId, params.filter),
    [forcedMode, params.filter, params.spaceId],
  );
  const [localScope, setLocalScope] = useState<BrowseScope | null>(null);
  const scope = localScope ?? routeScope;
  const { mode, spaceId } = scope;
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [allItems, allSpaces] = await Promise.all([repos.agenda.list(), repos.spaces.list()]);
      if (cancelled) return;
      setSpaces(allSpaces);
      let next = allItems;
      if (mode === 'inbox') {
        next = allItems.filter((item) => matchesSpaceFilter(item.spaceId, INBOX_FILTER_ID));
      } else if (mode === 'space' && spaceId) {
        next = allItems.filter((item) => matchesSpaceFilter(item.spaceId, spaceId));
      } else if (mode === 'completed') {
        next = allItems.filter((item) => item.type === 'task' && item.completed);
        if (spaceId) {
          next = next.filter((item) => matchesSpaceFilter(item.spaceId, spaceId));
        }
      }
      setItems(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, repos.agenda, repos.spaces, revision, spaceId]);

  const spaceNameById = useMemo(
    () => new Map(spaces.map((space) => [space.id, space.name])),
    [spaces],
  );

  const title =
    mode === 'inbox'
      ? 'Inbox'
      : mode === 'completed'
        ? 'Completed'
        : mode === 'space'
          ? (spaces.find((space) => space.id === spaceId)?.name ?? 'Space')
          : 'All items';

  return (
    <SettingsScaffold title={title} scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState message="Nothing here yet." />}
        renderItem={({ item }) => {
          const spaceName = item.spaceId ? spaceNameById.get(item.spaceId) : 'Inbox';
          const done = item.type === 'task' && item.completed;
          return (
            <Pressable
              onPress={() => openEdit(item.id)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={[styles.title, done && styles.done]} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>{formatShortDate(item.date)}</Text>
                <Text style={styles.dot}>·</Text>
                <Pressable
                  hitSlop={6}
                  onPress={() => {
                    if (item.spaceId) setLocalScope({ mode: 'space', spaceId: item.spaceId });
                    else setLocalScope({ mode: 'inbox' });
                  }}
                >
                  <Text style={styles.spaceLink}>{spaceName}</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />
      {mode === 'space' && spaceId ? (
        <Pressable
          onPress={() => router.push(`/library/space/${spaceId}` as never)}
          style={styles.detailLink}
        >
          <Text style={styles.detailLinkLabel}>Open Space detail</Text>
        </Pressable>
      ) : null}
    </SettingsScaffold>
  );
}

function formatShortDate(date: string): string {
  if (date === toLocalDateString()) return 'Today';
  try {
    return formatLongDate(date).replace(/,.*/, '');
  } catch {
    return date;
  }
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
    title: {
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      color: theme.text,
    },
    done: {
      textDecorationLine: 'line-through',
      color: theme.textSecondary,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    meta: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: theme.textSecondary,
    },
    dot: { color: theme.textSecondary },
    spaceLink: {
      fontFamily: fonts.sansMedium,
      fontSize: 13,
      color: theme.primary,
    },
    detailLink: { alignItems: 'center', paddingVertical: 12 },
    detailLinkLabel: {
      fontFamily: fonts.sansMedium,
      fontSize: 15,
      color: theme.primary,
    },
    pressed: { opacity: 0.75 },
  });
}
