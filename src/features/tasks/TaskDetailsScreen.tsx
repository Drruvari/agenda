import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { NativeDateField, NativeTimeField } from '@/components/ui/NativeDateTimeField';
import { useToast } from '@/components/ui/ToastProvider';
import { type AgendaItem, useData } from '@/data';
import { deleteAgendaItem, updateAgendaItem } from '@/domain/agendaLifecycle';
import { type AgendaTheme, continuousCorner, useThemeStyles } from '@/theme';

export function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const itemId = Array.isArray(id) ? id[0] : id;
  const { refresh, repos } = useData();
  const { showToast } = useToast();
  const { styles, theme } = useThemeStyles(createStyles);
  const [item, setItem] = useState<AgendaItem | null>(null);
  const [original, setOriginal] = useState<AgendaItem | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    void repos.agenda.getById(itemId).then((next) => {
      setItem(next);
      setOriginal(next);
    });
  }, [itemId, repos.agenda]);

  const update = (patch: Partial<AgendaItem>) => {
    setItem((current) => (current ? ({ ...current, ...patch } as AgendaItem) : current));
  };

  const save = async () => {
    if (!item?.title.trim() || !original || saving) return;
    setSaving(true);
    try {
      await updateAgendaItem(repos, original, {
        ...item,
        title: item.title.trim(),
        details: item.details?.trim() || undefined,
        time: item.time?.trim() || undefined,
      });
      refresh();
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save item', {
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!item) return;
    Alert.alert('Delete item?', 'This permanently removes the item.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          void deleteAgendaItem(repos, item)
            .then(() => {
              refresh();
              router.back();
            })
            .catch((error) => {
              showToast(error instanceof Error ? error.message : 'Could not delete item', {
                tone: 'error',
              });
            }),
      },
    ]);
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.loading}>Item not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
          <Icon name="back" color={theme.text} />
        </Pressable>
        <Text style={styles.heading}>Edit {item.type}</Text>
        <Pressable disabled={saving || !item.title.trim()} onPress={() => void save()}>
          <Text style={[styles.save, (saving || !item.title.trim()) && styles.disabled]}>Save</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Title">
          <TextInput
            autoFocus
            onChangeText={(title) => update({ title })}
            placeholder="Title"
            placeholderTextColor={theme.placeholder}
            style={styles.input}
            value={item.title}
          />
        </Field>
        <Field label="Date">
          <NativeDateField onChange={(date) => update({ date })} value={item.date} />
        </Field>
        <Field label="Time">
          <NativeTimeField
            onChange={(time) => update({ time: time || undefined })}
            value={item.time ?? ''}
          />
        </Field>
        <Field label="Details">
          <TextInput
            multiline
            onChangeText={(details) => update({ details })}
            placeholder="Details (optional)"
            placeholderTextColor={theme.placeholder}
            style={[styles.input, styles.details]}
            value={item.details ?? ''}
          />
        </Field>
        <Pressable onPress={remove} style={styles.deleteButton}>
          <Text style={styles.deleteLabel}>Delete item</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  const { styles } = useThemeStyles(createStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    header: {
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 16,
    },
    back: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.section,
      borderRadius: 22,
    },
    heading: { flex: 1, color: theme.text, fontSize: 20, fontWeight: '700' },
    save: { color: theme.primary, fontSize: 16, fontWeight: '600' },
    disabled: { opacity: 0.35 },
    loading: { margin: 24, color: theme.textSecondary },
    content: { gap: 18, padding: 20, paddingBottom: 48 },
    field: { gap: 7 },
    label: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
    input: {
      minHeight: 50,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: theme.text,
      backgroundColor: theme.section,
      fontSize: 16,
      ...continuousCorner(14),
    },
    details: { minHeight: 120, textAlignVertical: 'top' },
    deleteButton: {
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primarySoft,
      ...continuousCorner(14),
    },
    deleteLabel: { color: theme.danger, fontSize: 16, fontWeight: '600' },
  });
}
