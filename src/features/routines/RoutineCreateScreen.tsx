import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useData } from '@/data';
import { type AgendaTheme, continuousCorner, useThemeStyles } from '@/theme';

export function RoutineCreateScreen() {
  const { styles, theme } = useThemeStyles(createStyles);
  const { repos, refresh } = useData();
  const [name, setName] = useState('');
  const [spaceId, setSpaceId] = useState<string | undefined>();
  const [spaces, setSpaces] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void repos.spaces.list().then((list) => setSpaces(list));
  }, [repos.spaces]);

  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/routines'));
  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await repos.routines.create({ name, spaceId });
      refresh();
      dismiss();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={dismiss}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.heading}>New routine</Text>
        <Pressable onPress={() => void submit()} disabled={!name.trim() || saving}>
          <Text style={[styles.save, (!name.trim() || saving) && styles.disabled]}>Save</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          placeholder="Routine name"
          placeholderTextColor={theme.placeholder}
          style={styles.input}
        />
        <Text style={styles.label}>SPACE</Text>
        <View style={styles.chips}>
          <Pressable
            onPress={() => setSpaceId(undefined)}
            style={[styles.chip, !spaceId && styles.chipActive]}
          >
            <Text style={[styles.chipText, !spaceId && styles.chipTextActive]}>No space</Text>
          </Pressable>
          {spaces.map((space) => (
            <Pressable
              key={space.id}
              onPress={() => setSpaceId(space.id)}
              style={[styles.chip, spaceId === space.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, spaceId === space.id && styles.chipTextActive]}>
                {space.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.section },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 18,
    },
    cancel: { width: 64, color: theme.primary, fontSize: 16 },
    heading: { color: theme.text, fontSize: 17, fontWeight: '700' },
    save: { width: 64, textAlign: 'right', color: theme.primary, fontSize: 16, fontWeight: '700' },
    disabled: { opacity: 0.35 },
    content: { padding: 18, gap: 18 },
    input: {
      backgroundColor: theme.card,
      color: theme.text,
      fontSize: 22,
      padding: 16,
      ...continuousCorner(14),
    },
    label: { color: theme.textSecondary, fontSize: 12, fontWeight: '700' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: theme.input,
    },
    chipActive: { backgroundColor: theme.primary },
    chipText: { color: theme.textSecondary, fontWeight: '600' },
    chipTextActive: { color: theme.onPrimary },
  });
}
