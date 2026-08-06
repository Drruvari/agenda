import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { type Space, useData } from '@/data';
import { type AgendaTheme, continuousCorner, fonts, useThemeStyles } from '@/theme';

export function SpacesSettingsScreen() {
  const { refresh, repos, setUI, ui } = useData();
  const { styles, theme } = useThemeStyles(createStyles);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [name, setName] = useState('');

  const reload = useCallback(() => {
    void repos.spaces.list().then(setSpaces);
  }, [repos.spaces]);

  useEffect(reload, [reload]);

  const add = async () => {
    if (!name.trim()) return;
    await repos.spaces.create({ color: theme.primary, name });
    setName('');
    refresh();
    reload();
  };

  const remove = (space: Space) =>
    Alert.alert('Delete space?', `Items in ${space.name} will remain without this space.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          void repos.spaces.delete(space.id).then(() => {
            if (ui.activeSpaceId === space.id) setUI({ activeSpaceId: null });
            refresh();
            reload();
          }),
      },
    ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
          <Icon name="back" color={theme.text} />
        </Pressable>
        <Text style={styles.heading}>Spaces</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.addRow}>
          <TextInput
            onChangeText={setName}
            onSubmitEditing={() => void add()}
            placeholder="New space"
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
            <Icon name="add" color={theme.onPrimary} />
          </Pressable>
        </View>
        <View style={styles.card}>
          {spaces.length ? (
            spaces.map((space, index) => (
              <View
                key={space.id}
                style={[styles.row, index === spaces.length - 1 && styles.lastRow]}
              >
                <View style={[styles.dot, { backgroundColor: space.color }]} />
                <Text style={styles.name}>{space.name}</Text>
                <Pressable
                  accessibilityLabel={`Delete ${space.name}`}
                  onPress={() => remove(space)}
                >
                  <Icon name="trash" color={theme.danger} size={20} />
                </Pressable>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>No spaces yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    header: {
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingHorizontal: 16,
    },
    back: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: theme.section,
    },
    heading: { color: theme.text, fontFamily: fonts.sansSemi, fontSize: 24 },
    content: { gap: 18, padding: 16, paddingBottom: 48 },
    addRow: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1,
      minHeight: 50,
      paddingHorizontal: 16,
      color: theme.text,
      backgroundColor: theme.section,
      fontSize: 16,
      ...continuousCorner(16),
    },
    addButton: {
      width: 50,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      ...continuousCorner(16),
    },
    disabled: { opacity: 0.35 },
    card: { overflow: 'hidden', backgroundColor: theme.section, ...continuousCorner(16) },
    row: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    lastRow: { borderBottomWidth: 0 },
    dot: { width: 14, height: 14, borderRadius: 7 },
    name: { flex: 1, color: theme.text, fontSize: 16 },
    empty: { padding: 18, color: theme.textSecondary, fontSize: 15 },
  });
}
