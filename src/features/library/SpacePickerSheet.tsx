import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { AgendaBottomSheet, SHEET_DISMISS_MS } from '@/components/ui/sheet/Sheet';
import { type Space, useData } from '@/data';
import { useAppAppearance, useThemeStyles } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { continuousCorner } from '@/theme/tokens';

import { useLibrary } from './LibraryContext';
import { defaultSpaceColor } from './spaceAppearance';

export function SpacePickerHost() {
  const { session, close } = useLibrary();
  if (!session || session.type !== 'picker') return null;
  return (
    <SpacePickerSheet
      selectedId={session.selectedId}
      onSelect={session.onSelect}
      onDismiss={close}
    />
  );
}

function SpacePickerSheet({
  selectedId,
  onSelect,
  onDismiss,
}: {
  selectedId: string | null;
  onSelect: (spaceId: string | null) => void;
  onDismiss: () => void;
}) {
  const { repos, refresh } = useData();
  const { accent } = useAppAppearance();
  const { styles, theme } = useThemeStyles(createStyles);
  const [presented, setPresented] = useState(true);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const sheetHeight = useMemo(
    () => Math.min(560, Math.round(Dimensions.get('window').height * 0.7)),
    [],
  );

  useEffect(() => {
    void repos.spaces.list().then(setSpaces);
  }, [repos.spaces]);

  const finishClose = useCallback(() => onDismiss(), [onDismiss]);

  const choose = (spaceId: string | null) => {
    onSelect(spaceId);
    setPresented(false);
    setTimeout(finishClose, SHEET_DISMISS_MS);
  };

  const create = async () => {
    if (!name.trim()) return;
    const space = await repos.spaces.create({
      name: name.trim(),
      color: defaultSpaceColor(accent),
      isPinned: true,
    });
    refresh();
    choose(space.id);
  };

  const userSpaces = spaces.filter((space) => space.name.toLowerCase() !== 'inbox');

  return (
    <AgendaBottomSheet
      height={sheetHeight}
      isPresented={presented}
      onDismiss={finishClose}
      snapPoints={['half', 'full']}
    >
      <View style={styles.sheet}>
        <Text style={styles.title}>Choose Space</Text>

        <Pressable
          onPress={() => choose(null)}
          style={({ pressed }) => [
            styles.option,
            selectedId == null && styles.optionSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.optionLabel}>Inbox</Text>
          {selectedId == null ? <Icon name="check" size={20} color={theme.primary} /> : null}
        </Pressable>

        {userSpaces.map((space) => {
          const selected = selectedId === space.id;
          return (
            <Pressable
              key={space.id}
              onPress={() => choose(space.id)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.dot, { backgroundColor: space.color }]} />
              <Text style={styles.optionLabel}>{space.name}</Text>
              {selected ? <Icon name="check" size={20} color={theme.primary} /> : null}
            </Pressable>
          );
        })}

        <View style={styles.divider} />

        {creating ? (
          <View style={styles.addRow}>
            <TextInput
              autoFocus
              onChangeText={setName}
              onSubmitEditing={() => void create()}
              placeholder="New Space"
              placeholderTextColor={theme.placeholder}
              style={styles.input}
              value={name}
            />
            <Pressable
              disabled={!name.trim()}
              onPress={() => void create()}
              style={[styles.addButton, !name.trim() && styles.disabled]}
            >
              <Text style={styles.addLabel}>Add</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setCreating(true)} style={styles.newSpace}>
            <Icon name="add" size={20} color={theme.primary} />
            <Text style={styles.newSpaceLabel}>New Space</Text>
          </Pressable>
        )}
      </View>
    </AgendaBottomSheet>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    sheet: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 28,
      gap: 4,
      backgroundColor: theme.background,
    },
    title: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 20,
      color: theme.text,
      marginBottom: 8,
    },
    option: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      ...continuousCorner(12),
    },
    optionSelected: {
      backgroundColor: theme.section,
    },
    optionLabel: {
      flex: 1,
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 16,
      color: theme.text,
    },
    dot: { width: 12, height: 12, borderRadius: 6 },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.separator,
      marginVertical: 10,
    },
    newSpace: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
    },
    newSpaceLabel: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 16,
      color: theme.primary,
    },
    addRow: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: 12,
      color: theme.text,
      backgroundColor: theme.section,
      fontFamily: fonts.sans,
      fontSize: 16,
      ...continuousCorner(12),
    },
    addButton: {
      minWidth: 64,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      ...continuousCorner(12),
    },
    addLabel: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 15,
      color: theme.onPrimary,
    },
    disabled: { opacity: 0.35 },
    pressed: { opacity: 0.7 },
  });
}
