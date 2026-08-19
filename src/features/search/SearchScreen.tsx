import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import {
  AgendaBottomSheet,
  AgendaSheetHeader,
  SHEET_DISMISS_MS,
} from '@/components/ui/sheet/Sheet';
import { type AgendaItem, type DailyNote, type Routine, type Space, useData } from '@/data';
import { useAppSheets } from '@/features/app-sheets/AppSheetsContext';
import { useItemEditor } from '@/features/item-editor/ItemEditorContext';
import { useThemeStyles } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { continuousCorner } from '@/theme/tokens';

type SearchResult =
  | { id: string; kind: 'item'; item: AgendaItem; title: string; subtitle: string }
  | { id: string; kind: 'routine'; routine: Routine; title: string; subtitle: string }
  | { id: string; kind: 'note'; note: DailyNote; title: string; subtitle: string };

export function SearchSheet({
  embedded = false,
  onDismiss,
}: {
  embedded?: boolean;
  onDismiss: () => void;
}) {
  const { repos, revision, setUI } = useData();
  const { openEdit, openEditRoutine } = useItemEditor();
  const router = useRouter();
  const { styles, theme } = useThemeStyles(createStyles);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [presented, setPresented] = useState(true);
  const closed = useRef(false);
  const sheetHeight = useMemo(() => Math.round(Dimensions.get('window').height * 0.84), []);

  const finishClose = () => {
    if (closed.current) return;
    closed.current = true;
    onDismiss();
  };

  const close = () => {
    setPresented(false);
    setTimeout(finishClose, SHEET_DISMISS_MS);
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      repos.agenda.list(),
      repos.routines.listAll(),
      repos.notes.list(),
      repos.spaces.list(),
    ]).then(([nextItems, nextRoutines, nextNotes, nextSpaces]) => {
      if (cancelled) return;
      setItems(nextItems);
      setRoutines(nextRoutines);
      setNotes(nextNotes);
      setSpaces(nextSpaces);
    });
    return () => {
      cancelled = true;
    };
  }, [repos, revision]);

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return [];
    const spaceNames = new Map(spaces.map((space) => [space.id, space.name]));
    const itemResults: SearchResult[] = items
      .filter((item) => `${item.title} ${item.details ?? ''}`.toLocaleLowerCase().includes(needle))
      .map((item) => ({
        id: `item:${item.id}`,
        kind: 'item',
        item,
        title: item.title,
        subtitle: `${item.date} · ${item.spaceId ? (spaceNames.get(item.spaceId) ?? 'Space') : 'Inbox'}`,
      }));
    const routineResults: SearchResult[] = routines
      .filter((routine) => routine.name.toLocaleLowerCase().includes(needle))
      .map((routine) => ({
        id: `routine:${routine.id}`,
        kind: 'routine',
        routine,
        title: routine.name,
        subtitle: routine.active ? 'Active routine' : 'Paused routine',
      }));
    const noteResults: SearchResult[] = notes
      .filter((note) => note.bodyText.toLocaleLowerCase().includes(needle))
      .map((note) => ({
        id: `note:${note.id}`,
        kind: 'note',
        note,
        title: note.bodyText.trim().split(/\n/)[0] || 'Daily note',
        subtitle: `Daily note · ${note.date}`,
      }));
    return [...itemResults, ...routineResults, ...noteResults].slice(0, 100);
  }, [items, notes, query, routines, spaces]);

  const openResult = (result: SearchResult) => {
    if (embedded) {
      if (result.kind === 'item') openEdit(result.item.id);
      else if (result.kind === 'routine') openEditRoutine(result.routine.id);
      else {
        setUI({ selectedDate: result.note.date });
        router.navigate('/page' as never);
      }
      return;
    }

    if (result.kind === 'item') {
      setPresented(false);
      setTimeout(() => {
        finishClose();
        openEdit(result.item.id);
      }, SHEET_DISMISS_MS);
      return;
    }
    if (result.kind === 'routine') {
      setPresented(false);
      setTimeout(() => {
        finishClose();
        openEditRoutine(result.routine.id);
      }, SHEET_DISMISS_MS);
      return;
    }
    setUI({ selectedDate: result.note.date });
    close();
  };

  const content = (
    <View style={styles.root}>
      {embedded ? (
        <>
          <SafeAreaView edges={['top', 'left', 'right']} style={styles.embeddedHeader}>
            <Text accessibilityRole="header" style={styles.pageTitle}>
              Search
            </Text>
          </SafeAreaView>
          {Platform.OS === 'ios' ? (
            <Stack.SearchBar
              autoFocus
              onChangeText={(event) => setQuery(event.nativeEvent.text)}
              placeholder="Tasks, routines, and notes"
            />
          ) : (
            <View style={styles.searchBox}>
              <Icon name="search" size={22} color={theme.textSecondary} />
              <TextInput
                autoFocus
                onChangeText={setQuery}
                placeholder="Tasks, routines, and notes"
                placeholderTextColor={theme.placeholder}
                returnKeyType="search"
                style={styles.input}
                value={query}
                underlineColorAndroid="transparent"
              />
            </View>
          )}
        </>
      ) : (
        <AgendaSheetHeader title="Search" onCancel={close} />
      )}
      {!embedded ? (
        <View style={styles.searchBox}>
          <Icon name="search" size={22} color={theme.textSecondary} />
          <TextInput
            autoFocus
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Tasks, routines, and notes"
            placeholderTextColor={theme.placeholder}
            returnKeyType="search"
            style={styles.input}
            value={query}
          />
        </View>
      ) : null}
      <FlatList
        contentContainerStyle={styles.list}
        data={results}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(result) => result.id}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {query.trim() ? 'No matching items.' : 'Search across your entire Agenda.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openResult(item)}
            style={({ pressed }) => [styles.result, pressed && styles.pressed]}
          >
            <View style={styles.resultIcon}>
              <Icon
                name={
                  item.kind === 'routine'
                    ? 'refresh'
                    : item.kind === 'note'
                      ? 'notebook'
                      : 'checklist'
                }
                size={20}
                color={theme.primary}
              />
            </View>
            <View style={styles.copy}>
              <Text numberOfLines={1} style={styles.title}>
                {item.title}
              </Text>
              <Text numberOfLines={1} style={styles.subtitle}>
                {item.subtitle}
              </Text>
            </View>
            <Icon name="chevronRight" size={18} color={theme.textSecondary} />
          </Pressable>
        )}
      />
    </View>
  );

  if (embedded) return content;

  return (
    <AgendaBottomSheet
      height={sheetHeight}
      isPresented={presented}
      onDismiss={finishClose}
      snapPoints={['half', 'full']}
    >
      {content}
    </AgendaBottomSheet>
  );
}

export function SearchScreen() {
  const { close } = useAppSheets();
  return <SearchSheet onDismiss={close} />;
}

export function SearchTabScreen() {
  return <SearchSheet embedded onDismiss={() => {}} />;
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: Platform.OS === 'ios' ? 0 : 16,
      backgroundColor: theme.background,
    },
    embeddedHeader: {
      paddingTop: 8,
      paddingHorizontal: Platform.OS === 'ios' ? 20 : 4,
      paddingBottom: 8,
      backgroundColor: theme.background,
    },
    pageTitle: {
      color: theme.text,
      fontFamily: fonts.sans,
      fontSize: 34,
      lineHeight: 41,
      fontWeight: '700',
      letterSpacing: -0.7,
    },
    searchBox: {
      minHeight: 52,
      marginTop: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.section,
      ...continuousCorner(18),
    },
    input: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 17,
      color: theme.text,
      paddingVertical: 12,
    },
    list: {
      paddingTop: Platform.OS === 'ios' ? 8 : 16,
      paddingBottom: 40,
      paddingHorizontal: Platform.OS === 'ios' ? 16 : 0,
      gap: Platform.OS === 'ios' ? 0 : 8,
      flexGrow: 1,
    },
    result: {
      minHeight: 68,
      paddingVertical: 10,
      paddingHorizontal: Platform.OS === 'ios' ? 0 : 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.card,
      borderBottomWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 0,
      borderBottomColor: theme.separator,
      ...continuousCorner(Platform.OS === 'ios' ? 0 : 16),
    },
    resultIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Platform.OS === 'ios' ? theme.section : theme.primarySoft,
    },
    copy: { flex: 1, gap: 3 },
    title: { fontFamily: fonts.sansMedium, fontWeight: '500', fontSize: 16, color: theme.text },
    subtitle: { fontFamily: fonts.sans, fontSize: 13, color: theme.textSecondary },
    empty: {
      paddingTop: 48,
      textAlign: 'center',
      fontFamily: fonts.sans,
      fontSize: 15,
      color: theme.textSecondary,
    },
    pressed: { opacity: 0.72 },
  });
}
