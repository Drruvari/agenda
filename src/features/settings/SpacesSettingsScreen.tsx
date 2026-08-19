import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { type Space, useData } from '@/data';
import { useLibrary } from '@/features/library';
import { SettingsScaffold, SettingsSection } from '@/features/settings/SettingsChrome';
import { useThemeStyles } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { continuousCorner } from '@/theme/tokens';

export function SpacesSettingsScreen() {
  const { refresh, repos, setUI, ui } = useData();
  const { openEditSpace, openLibrary } = useLibrary();
  const { styles, theme } = useThemeStyles(createStyles);
  const [spaces, setSpaces] = useState<Space[]>([]);

  const reload = useCallback(() => {
    void repos.spaces
      .list()
      .then((list) => setSpaces(list.filter((space) => space.name.toLowerCase() !== 'inbox')));
  }, [repos.spaces]);

  useEffect(reload, [reload]);

  const remove = (space: Space) =>
    Alert.alert(
      `Delete “${space.name}”?`,
      'Items belonging to this Space will be moved to Inbox.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Space',
          style: 'destructive',
          onPress: () =>
            void repos.spaces.delete(space.id).then(() => {
              if (ui.activeSpaceId === space.id) setUI({ activeSpaceId: null });
              refresh();
              reload();
            }),
        },
      ],
    );

  return (
    <SettingsScaffold
      title="Spaces"
      description="Contexts for filtering your day — Work, Personal, and anything else you need."
    >
      <Pressable
        onPress={openLibrary}
        style={({ pressed }) => [styles.libraryButton, pressed && styles.pressed]}
      >
        <Text style={styles.libraryLabel}>Open Library</Text>
        <Icon name="chevronRight" size={18} color={theme.primary} />
      </Pressable>

      <SettingsSection title="Your spaces">
        {spaces.length ? (
          spaces.map((space, index) => (
            <View
              key={space.id}
              style={[styles.row, index === spaces.length - 1 && styles.lastRow]}
            >
              <View style={[styles.dot, { backgroundColor: space.color }]} />
              <Pressable onPress={() => openEditSpace(space.id)} style={styles.namePress}>
                <Text style={styles.name}>{space.name}</Text>
                <Text style={styles.meta}>
                  {space.isPinned ? 'Pinned to Today' : 'Not in quick filters'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Delete ${space.name}`}
                onPress={() => remove(space)}
                hitSlop={8}
              >
                <Icon name="trash" color={theme.danger} size={20} />
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No spaces yet. Create one from Library.</Text>
        )}
      </SettingsSection>
    </SettingsScaffold>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    libraryButton: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      backgroundColor: theme.section,
      ...continuousCorner(16),
      marginBottom: 8,
    },
    libraryLabel: {
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      color: theme.primary,
    },
    pressed: { opacity: 0.7 },
    row: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    lastRow: { borderBottomWidth: 0 },
    dot: { width: 14, height: 14, borderRadius: 7 },
    namePress: { flex: 1, gap: 2 },
    name: { color: theme.text, fontFamily: fonts.sansMedium, fontSize: 16 },
    meta: { color: theme.textSecondary, fontFamily: fonts.sans, fontSize: 13 },
    empty: {
      padding: 18,
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 15,
    },
  });
}
