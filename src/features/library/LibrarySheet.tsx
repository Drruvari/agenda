import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/components/ui/Icon';
import { Icon } from '@/components/ui/Icon';
import { NativeSwitch } from '@/components/ui/NativeSwitch';
import {
  AgendaBottomSheet,
  AgendaSheetHeader,
  SHEET_DISMISS_MS,
} from '@/components/ui/sheet/Sheet';
import { type AgendaItem, type DailyNote, type Space, useData } from '@/data';
import { useItemEditor } from '@/features/item-editor/ItemEditorContext';
import { useAppAppearance, useThemeStyles } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { continuousCorner } from '@/theme/tokens';

import { useLibrary } from './LibraryContext';
import { defaultSpaceColor, SPACE_COLOR_OPTIONS, SPACE_ICON_OPTIONS } from './spaceAppearance';

export function LibraryHost() {
  const { session, close } = useLibrary();
  if (!session || session.type !== 'library') return null;
  return <LibrarySheet onDismiss={close} quickCreate={session.quickCreate} />;
}

function LibrarySheet({
  onDismiss,
  quickCreate = false,
}: {
  onDismiss: () => void;
  quickCreate?: boolean;
}) {
  const { repos, refresh, setUI, ui } = useData();
  const router = useRouter();
  const { openEditSpace } = useLibrary();
  const { accent } = useAppAppearance();
  const { styles, theme } = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { openEdit } = useItemEditor();
  const sheetHeight = useMemo(
    () =>
      quickCreate
        ? Math.min(600, Math.round(Dimensions.get('window').height * 0.72))
        : Math.round(Dimensions.get('window').height * 0.85),
    [quickCreate],
  );
  const [presented, setPresented] = useState(true);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [browser, setBrowser] = useState<'all' | 'inbox' | 'completed' | string | null>(null);
  const [name, setName] = useState('');
  const [newSpaceColor, setNewSpaceColor] = useState(() => defaultSpaceColor(accent));
  const [newSpaceIcon, setNewSpaceIcon] = useState<IconName>('agenda');
  const [newSpacePinned, setNewSpacePinned] = useState(true);
  const sheetScrollRef = useRef<ScrollView>(null);

  const reload = useCallback(() => {
    void Promise.all([repos.spaces.list(), repos.agenda.list(), repos.notes.list()]).then(
      ([nextSpaces, nextItems, notes]) => {
        setSpaces(nextSpaces);
        setItems(nextItems);
        setNotes(notes);
      },
    );
  }, [repos.agenda, repos.notes, repos.spaces]);

  useEffect(reload, [reload]);

  const finishClose = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const requestClose = useCallback(() => {
    setPresented(false);
    setTimeout(finishClose, SHEET_DISMISS_MS);
  }, [finishClose]);

  const selectFilter = (activeSpaceId: string | null) => {
    setUI({ activeSpaceId });
    requestClose();
  };

  const add = async (closeAfter = false) => {
    if (!name.trim()) return;
    await repos.spaces.create({
      name: name.trim(),
      color: newSpaceColor,
      icon: newSpaceIcon,
      isPinned: newSpacePinned,
    });
    setName('');
    refresh();
    if (closeAfter) {
      requestClose();
    } else {
      reload();
    }
  };

  const userSpaces = spaces.filter((space) => space.name.toLowerCase() !== 'inbox');

  const browserItems = browser
    ? items.filter((item) => {
        if (browser === 'all') return true;
        if (browser === 'inbox') return !item.spaceId;
        if (browser === 'completed') return item.type === 'task' && item.completed;
        return item.spaceId === browser;
      })
    : [];
  const browserTitle =
    browser === 'all'
      ? 'All items'
      : browser === 'inbox'
        ? 'Inbox'
        : browser === 'completed'
          ? 'Completed'
          : (spaces.find((space) => space.id === browser)?.name ?? 'Space');

  const body = browser ? (
    <View style={styles.browserRoot}>
      <AgendaSheetHeader
        title={browserTitle}
        cancelLabel="Back"
        onCancel={() => setBrowser(null)}
      />
      <ScrollView contentContainerStyle={styles.browserList}>
        {browserItems.length ? (
          browserItems.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                requestClose();
                setTimeout(() => openEdit(item.id), SHEET_DISMISS_MS);
              }}
              style={styles.browserRow}
            >
              <View style={styles.spaceCopy}>
                <Text style={styles.rowLabel}>{item.title}</Text>
                <Text style={styles.meta}>{item.date}</Text>
              </View>
              <Icon name="chevronRight" size={18} color={theme.textSecondary} />
            </Pressable>
          ))
        ) : (
          <Text style={styles.empty}>Nothing here yet.</Text>
        )}
      </ScrollView>
    </View>
  ) : quickCreate ? (
    <View style={[styles.quickCreateRoot, { paddingBottom: insets.bottom + 20 }]}>
      <AgendaSheetHeader
        title="New Space"
        onCancel={requestClose}
        action={{
          label: 'Add',
          disabled: !name.trim(),
          onPress: () => void add(true),
        }}
      />
      <View style={styles.quickCreateContent}>
        <View style={styles.quickNameRow}>
          <View style={[styles.quickIconPreview, { backgroundColor: newSpaceColor }]}>
            <Icon name={newSpaceIcon} color="#FFFFFF" size={22} />
          </View>
          <TextInput
            autoFocus
            autoCapitalize="words"
            clearButtonMode="while-editing"
            onChangeText={setName}
            onSubmitEditing={() => void add(true)}
            placeholder="Space name"
            placeholderTextColor={theme.placeholder}
            returnKeyType="done"
            style={styles.quickCreateInput}
            value={name}
          />
        </View>

        <Text style={styles.fieldLabel}>Icon</Text>
        <View style={styles.quickOptions}>
          {SPACE_ICON_OPTIONS.map((icon) => (
            <Pressable
              accessibilityLabel={`${icon} icon`}
              accessibilityState={{ selected: newSpaceIcon === icon }}
              key={icon}
              onPress={() => setNewSpaceIcon(icon)}
              style={[styles.quickIconOption, newSpaceIcon === icon && styles.quickOptionSelected]}
            >
              <Icon name={icon} color={theme.text} size={21} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Color</Text>
        <View style={styles.quickColors}>
          {SPACE_COLOR_OPTIONS.map((color) => (
            <Pressable
              accessibilityLabel={`${color.name} color`}
              accessibilityState={{ selected: newSpaceColor === color.hex }}
              key={color.name}
              onPress={() => setNewSpaceColor(color.hex)}
              style={[
                styles.quickColor,
                { backgroundColor: color.hex },
                newSpaceColor === color.hex && styles.quickColorSelected,
              ]}
            />
          ))}
        </View>

        <View style={styles.quickPinRow}>
          <View style={styles.spaceCopy}>
            <Text style={styles.rowLabel}>Pin to Today</Text>
            <Text style={styles.meta}>Show this Space in Today’s filters</Text>
          </View>
          <NativeSwitch onValueChange={setNewSpacePinned} value={newSpacePinned} />
        </View>
      </View>
    </View>
  ) : (
    <ScrollView
      ref={sheetScrollRef}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.sheet, { paddingBottom: insets.bottom + 28 }]}
      onContentSizeChange={() => {
        if (quickCreate) sheetScrollRef.current?.scrollToEnd({ animated: true });
      }}
    >
      <AgendaSheetHeader title="Library" onCancel={requestClose} />

      <View style={styles.collectionGrid}>
        <CollectionRow
          count={items.length}
          icon="list"
          label="All items"
          onPress={() => setBrowser('all')}
          styles={styles}
        />
        <CollectionRow
          count={items.filter((item) => !item.spaceId).length}
          icon="inbox"
          label="Inbox"
          onPress={() => setBrowser('inbox')}
          styles={styles}
        />
        <CollectionRow
          count={items.filter((item) => item.type === 'task' && item.completed).length}
          icon="completed"
          label="Completed"
          onPress={() => setBrowser('completed')}
          styles={styles}
        />
        <CollectionRow
          count={notes.length}
          icon="notebook"
          label="Daily Notes"
          onPress={() => {
            requestClose();
            setTimeout(() => router.push('/library/notes'), SHEET_DISMISS_MS);
          }}
          styles={styles}
        />
      </View>

      <View style={styles.spacesHeader}>
        <Text style={styles.sectionLabel}>Spaces</Text>
      </View>
      <View style={styles.card}>
        {userSpaces.length === 0 ? (
          <Text style={styles.empty}>No spaces yet. Add one below.</Text>
        ) : (
          userSpaces.map((space, index) => (
            <SpaceRow
              key={space.id}
              last={index === userSpaces.length - 1}
              space={space}
              selected={ui.activeSpaceId === space.id}
              onPress={() => selectFilter(space.id)}
              onEdit={() => {
                requestClose();
                setTimeout(() => openEditSpace(space.id), SHEET_DISMISS_MS);
              }}
              onOpen={() => setBrowser(space.id)}
              styles={styles}
            />
          ))
        )}
      </View>

      <View style={styles.addRow}>
        <TextInput
          autoFocus={quickCreate}
          onChangeText={setName}
          onSubmitEditing={() => void add()}
          placeholder="Space name"
          placeholderTextColor={theme.placeholder}
          returnKeyType="done"
          style={styles.input}
          value={name}
        />
        <Pressable
          accessibilityLabel="Add space"
          disabled={!name.trim()}
          onPress={() => void add()}
          style={[styles.addButton, !name.trim() && styles.disabled]}
        >
          <Text style={styles.addLabel}>Add</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => selectFilter(null)} style={styles.allChip}>
        <Text style={styles.allChipLabel}>Show All on Today</Text>
      </Pressable>
    </ScrollView>
  );

  return (
    <AgendaBottomSheet
      height={sheetHeight}
      isPresented={presented}
      onDismiss={finishClose}
      snapPoints={quickCreate ? [{ height: sheetHeight }] : ['full']}
    >
      {body}
    </AgendaBottomSheet>
  );
}

function CollectionRow({
  count,
  icon,
  label,
  onPress,
  styles,
}: {
  count: number;
  icon: IconName;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.collection, pressed && styles.pressed]}
    >
      <View style={styles.collectionIcon}>
        <Icon name={icon} size={23} color={styles.accent.color} />
      </View>
      <Text style={styles.collectionLabel}>{label}</Text>
      <Text style={styles.collectionCount}>{count}</Text>
    </Pressable>
  );
}

function SpaceRow({
  last,
  onEdit,
  onOpen,
  onPress,
  selected,
  space,
  styles,
}: {
  last?: boolean;
  onEdit: () => void;
  onOpen: () => void;
  onPress: () => void;
  selected: boolean;
  space: Space;
  styles: ReturnType<typeof createStyles>;
}) {
  const icon = spaceIcon(space);
  return (
    <View style={[styles.spaceRow, last && styles.lastRow]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.spaceMain, pressed && styles.pressed]}
      >
        <View style={[styles.spaceIcon, { backgroundColor: space.color }]}>
          <Icon name={icon} size={22} color="#FFFFFF" stroke={1.8} />
        </View>
        <View style={styles.spaceCopy}>
          <Text style={[styles.rowLabel, selected && styles.selectedLabel]}>{space.name}</Text>
          <Text style={styles.meta}>
            {space.isPinned ? 'Pinned to Today' : 'Not in quick filters'}
          </Text>
        </View>
      </Pressable>
      <Pressable accessibilityLabel={`Edit ${space.name}`} hitSlop={8} onPress={onEdit}>
        <Text style={styles.editLabel}>Edit</Text>
      </Pressable>
      <Pressable accessibilityLabel={`Open ${space.name}`} hitSlop={8} onPress={onOpen}>
        <Icon name="chevronRight" size={18} color={styles.muted.color} />
      </Pressable>
    </View>
  );
}

function spaceIcon(space: Space): IconName {
  const name = space.name.trim().toLowerCase();
  if (name === 'studio' || name === 'work') return 'briefcase';
  if (name === 'home') return 'home';
  if (name === 'personal') return 'star';
  return 'list';
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    sheet: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 28,
      gap: 12,
    },
    quickCreateRoot: { flex: 1 },
    quickCreateContent: {
      paddingHorizontal: Platform.OS === 'ios' ? 16 : 20,
      paddingTop: Platform.OS === 'ios' ? 16 : 20,
      gap: Platform.OS === 'ios' ? 16 : 12,
    },
    quickNameRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    quickIconPreview: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      ...continuousCorner(12),
    },
    fieldLabel: {
      paddingHorizontal: 4,
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 13,
    },
    quickCreateInput: {
      flex: 1,
      minHeight: 52,
      paddingHorizontal: 16,
      color: theme.text,
      backgroundColor: theme.section,
      fontFamily: fonts.sans,
      fontSize: 17,
      ...continuousCorner(14),
    },
    quickOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    quickIconOption: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.section,
      ...continuousCorner(11),
    },
    quickOptionSelected: { borderWidth: 2, borderColor: theme.primary },
    quickColors: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    quickColor: { width: 30, height: 30, borderRadius: 15 },
    quickColorSelected: { borderWidth: 3, borderColor: theme.text },
    quickPinRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.section,
      ...continuousCorner(14),
    },
    fieldHelp: {
      paddingHorizontal: 4,
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 13,
      lineHeight: 18,
    },
    browserRoot: { flex: 1 },
    browserList: {
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 8 : 16,
      paddingBottom: Platform.OS === 'ios' ? 32 : 16,
      gap: Platform.OS === 'ios' ? 0 : 8,
    },
    browserRow: {
      minHeight: 64,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.section,
      ...continuousCorner(16),
    },
    sectionLabel: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 13,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: theme.textSecondary,
      paddingHorizontal: 4,
    },
    spacesHeader: { marginTop: 8 },
    collectionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    collection: {
      width: '48.7%',
      minHeight: 76,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.section,
      ...continuousCorner(18),
    },
    collectionIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primarySoft,
    },
    collectionLabel: {
      flex: 1,
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 15,
      color: theme.text,
    },
    collectionCount: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: theme.textSecondary,
    },
    accent: { color: theme.primary },
    card: {
      backgroundColor: theme.section,
      ...continuousCorner(16),
      overflow: 'hidden',
    },
    row: {
      minHeight: 52,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    lastRow: { borderBottomWidth: 0 },
    rowLabel: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 16,
      color: theme.text,
    },
    selectedLabel: { color: theme.primary },
    muted: { color: theme.textSecondary },
    spaceRow: {
      minHeight: 60,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    spaceMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingLeft: 4,
    },
    spaceCopy: { flex: 1, gap: 2 },
    meta: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: theme.textSecondary,
    },
    spaceIcon: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      ...continuousCorner(12),
    },
    editLabel: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 15,
      color: theme.primary,
      paddingHorizontal: 4,
    },
    empty: {
      padding: 18,
      fontFamily: fonts.sans,
      fontSize: 15,
      color: theme.textSecondary,
    },
    addRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    input: {
      flex: 1,
      minHeight: 48,
      paddingHorizontal: 14,
      color: theme.text,
      backgroundColor: theme.section,
      fontFamily: fonts.sans,
      fontSize: 16,
      ...continuousCorner(14),
    },
    addButton: {
      minWidth: 72,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      backgroundColor: theme.primary,
      ...continuousCorner(14),
    },
    addLabel: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 16,
      color: theme.onPrimary,
    },
    disabled: { opacity: 0.35 },
    allChip: {
      alignSelf: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    allChipLabel: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 15,
      color: theme.primary,
    },
    pressed: { opacity: 0.7 },
  });
}
