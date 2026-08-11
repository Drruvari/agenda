import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AgendaBottomSheet,
  AgendaSheetHeader,
  SHEET_DISMISS_MS,
} from '@/components/ui/AgendaBottomSheet';
import { Icon, type IconName } from '@/components/ui/Icon';
import { NativeSwitch } from '@/components/ui/NativeSwitch';
import { type Space, useData } from '@/data';
import {
  type AgendaTheme,
  continuousCorner,
  fonts,
  useAppAppearance,
  useThemeStyles,
} from '@/theme';

import { useLibrary } from './LibraryContext';
import { SPACE_COLOR_OPTIONS, SPACE_ICON_OPTIONS } from './spaceAppearance';

export function EditSpaceHost() {
  const { session, close } = useLibrary();
  if (!session || session.type !== 'edit') return null;
  return <EditSpaceSheet spaceId={session.spaceId} onDismiss={close} />;
}

function EditSpaceSheet({ spaceId, onDismiss }: { spaceId: string; onDismiss: () => void }) {
  const { repos, refresh, setUI, ui } = useData();
  const { accent, colorScheme } = useAppAppearance();
  const { styles, theme } = useThemeStyles(createStyles);
  const sheetHeight = useMemo(
    () => Math.min(720, Math.round(Dimensions.get('window').height * 0.76)),
    [],
  );
  const [presented, setPresented] = useState(true);
  const [space, setSpace] = useState<Space | null>(null);
  const [name, setName] = useState('');
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const found = await repos.spaces.getById(spaceId);
      if (cancelled) return;
      if (!found) {
        onDismiss();
        return;
      }
      setSpace(found);
      setName(found.name);
      const items = await repos.agenda.forSpace(spaceId);
      if (cancelled) return;
      setActiveCount(items.filter((item) => !(item.type === 'task' && item.completed)).length);
      setCompletedCount(items.filter((item) => item.type === 'task' && item.completed).length);
    })();
    return () => {
      cancelled = true;
    };
  }, [onDismiss, repos.agenda, repos.spaces, spaceId]);

  const finishClose = useCallback(() => onDismiss(), [onDismiss]);

  const requestClose = useCallback(() => {
    setPresented(false);
    setTimeout(finishClose, SHEET_DISMISS_MS);
  }, [finishClose]);

  const persist = async (patch: Partial<Space>) => {
    if (!space) return;
    const next = { ...space, ...patch, name: (patch.name ?? space.name).trim() || space.name };
    setSpace(next);
    await repos.spaces.update(next);
    refresh();
  };

  const saveName = () => {
    if (!space || !name.trim() || name.trim() === space.name) return;
    void persist({ name: name.trim() });
  };

  const remove = () => {
    if (!space) return;
    const total = activeCount + completedCount;
    Alert.alert(
      `Delete “${space.name}”?`,
      total === 0
        ? 'This Space has no items.'
        : `${total} item${total === 1 ? '' : 's'} belong to this Space.\nThey will be moved to Inbox.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Space',
          style: 'destructive',
          onPress: () =>
            void repos.spaces.delete(space.id).then(() => {
              if (ui.activeSpaceId === space.id) setUI({ activeSpaceId: null });
              refresh();
              requestClose();
            }),
        },
      ],
    );
  };

  if (!space) {
    return (
      <AgendaBottomSheet height={120} isPresented={presented} onDismiss={finishClose}>
        <View style={styles.sheet}>
          <Text style={styles.meta}>Loading…</Text>
        </View>
      </AgendaBottomSheet>
    );
  }

  return (
    <AgendaBottomSheet
      height={sheetHeight}
      isPresented={presented}
      onDismiss={finishClose}
      snapPoints={[{ height: sheetHeight }, 'full']}
    >
      <View style={styles.root}>
        <AgendaSheetHeader title="Edit Space" onCancel={requestClose} cancelLabel="Done" />
        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
          <View style={styles.nameRow}>
            <View style={[styles.iconBadge, { backgroundColor: space.color }]}>
              <Icon name={(space.icon as IconName) || 'agenda'} color={theme.onPrimary} size={22} />
            </View>
            <TextInput
              onBlur={saveName}
              onChangeText={setName}
              onSubmitEditing={saveName}
              placeholder="Name"
              placeholderTextColor={theme.placeholder}
              style={styles.nameInput}
              value={name}
            />
          </View>

          <Text style={styles.sectionLabel}>Icon</Text>
          <View style={styles.iconGrid}>
            {SPACE_ICON_OPTIONS.map((icon) => {
              const selected = (space.icon || 'agenda') === icon;
              return (
                <Pressable
                  key={icon}
                  onPress={() => void persist({ icon })}
                  style={[styles.iconCell, selected && styles.iconCellSelected]}
                >
                  <Icon name={icon} color={selected ? theme.primary : theme.text} size={22} />
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Color</Text>
          <View style={styles.colorRow}>
            {SPACE_COLOR_OPTIONS.map((color) => {
              const selected = space.color === color.hex;
              return (
                <Pressable
                  key={color.name}
                  onPress={() => void persist({ color: color.hex })}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color.hex },
                    selected && styles.colorDotSelected,
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.pinRow}>
            <View style={styles.pinCopy}>
              <Text style={styles.rowLabel}>Pin to Today</Text>
              <Text style={styles.meta}>Show in quick filters on Today</Text>
            </View>
            <NativeSwitch
              accent={accent}
              colorScheme={colorScheme}
              value={space.isPinned}
              onValueChange={(isPinned) => void persist({ isPinned })}
            />
          </View>

          <View style={styles.counts}>
            <Text style={styles.meta}>
              {activeCount} active · {completedCount} completed
            </Text>
          </View>

          <Pressable
            onPress={remove}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <Text style={styles.deleteLabel}>Delete Space</Text>
          </Pressable>
        </ScrollView>
      </View>
    </AgendaBottomSheet>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    sheet: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 40,
      gap: 18,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      backgroundColor: theme.card,
      ...continuousCorner(16),
    },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nameInput: {
      flex: 1,
      minHeight: 48,
      paddingHorizontal: 14,
      color: theme.text,
      backgroundColor: theme.input,
      fontFamily: fonts.sansMedium,
      fontSize: 17,
      ...continuousCorner(14),
    },
    sectionLabel: {
      fontFamily: fonts.sansMedium,
      fontSize: 13,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: theme.textSecondary,
    },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    iconCell: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card,
      ...continuousCorner(12),
    },
    iconCellSelected: {
      borderWidth: 2,
      borderColor: theme.primary,
    },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    colorDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    colorDotSelected: {
      borderWidth: 3,
      borderColor: theme.text,
    },
    pinRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.card,
      ...continuousCorner(16),
    },
    pinCopy: { flex: 1, gap: 2 },
    rowLabel: {
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      color: theme.text,
    },
    meta: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: theme.textSecondary,
    },
    counts: { paddingHorizontal: 14 },
    deleteButton: {
      marginTop: 2,
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card,
      ...continuousCorner(14),
    },
    deleteLabel: {
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      color: theme.danger,
    },
    pressed: { opacity: 0.7 },
  });
}
