import { router } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NativeDateField, NativeTimeField } from '@/components/ui/NativeDateTimeField';
import { NativeSwitch } from '@/components/ui/NativeSwitch';
import { localDateTime, type Priority, useData } from '@/data';
import { parseSmartInput } from '@/lib/smart-parse/parseSmartInput';
import { scheduleReminder } from '@/native/notifications/reminders';
import { type AgendaTheme, continuousCorner, useAppAppearance, useThemeStyles } from '@/theme';

const PRIORITIES: Priority[] = ['none', 'low', 'medium', 'high'];

export function TaskCreateScreen() {
  const { styles, theme } = useThemeStyles(createStyles);
  const { accent, colorScheme } = useAppAppearance();
  const { repos, ui, settings, refresh } = useData();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(ui.selectedDate);
  const [time, setTime] = useState('');
  const [spaceId, setSpaceId] = useState<string | undefined>(
    ui.activeSpaceId ?? settings.editor.defaultSpaceId ?? undefined,
  );
  const [priority, setPriority] = useState<Priority>('none');
  const [remindAtTime, setRemindAtTime] = useState(false);
  const [spaces, setSpaces] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void repos.spaces.list().then((list) => {
      setSpaces(list.map((space) => ({ id: space.id, name: space.name })));
    });
  }, [repos.spaces]);

  const setTimeValue = (next: string) => {
    setTime(next);
    if (!next.trim()) setRemindAtTime(false);
  };

  const applySmartParse = (value: string) => {
    setTitle(value);
    if (!settings.editor.smartParsingEnabled) {
      return;
    }

    const parsed = parseSmartInput(value, ui.selectedDate);
    if (parsed.date) setDate(parsed.date);
    if (parsed.time) setTimeValue(parsed.time);
    if (parsed.priority) setPriority(parsed.priority);
    if (parsed.spaceName) {
      const match = spaces.find(
        (space) => space.name.toLowerCase() === parsed.spaceName!.toLowerCase(),
      );
      if (match) setSpaceId(match.id);
    }
  };

  const dismiss = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const submit = async () => {
    const parsed = settings.editor.smartParsingEnabled
      ? parseSmartInput(title, ui.selectedDate)
      : { title: title.trim() };

    const finalTitle = parsed.title.trim();
    if (!finalTitle || saving) {
      return;
    }

    setSaving(true);
    try {
      const finalDate = parsed.date ?? date;
      const finalTime = parsed.time ?? (time.trim() || undefined);
      const reminderDate = remindAtTime && finalTime ? localDateTime(finalDate, finalTime) : null;
      const notificationId = reminderDate
        ? await scheduleReminder(finalTitle, details.trim() || undefined, reminderDate)
        : null;
      await repos.agenda.createTask({
        title: finalTitle,
        details: details.trim() || undefined,
        date: finalDate,
        time: finalTime,
        spaceId,
        priority: parsed.priority ?? priority,
        reminderAt: notificationId && reminderDate ? reminderDate.toISOString() : undefined,
        notificationId: notificationId ?? undefined,
      });
      refresh();
      dismiss();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable onPress={dismiss} hitSlop={8}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Text style={styles.heading}>New task</Text>
        <Pressable
          onPress={() => void submit()}
          style={[styles.submit, (!title.trim() || saving) && styles.submitDisabled]}
          disabled={!title.trim() || saving}
        >
          <Text style={styles.submitLabel}>↑</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          value={title}
          onChangeText={applySmartParse}
          placeholder="What needs to be done?"
          placeholderTextColor={theme.placeholder}
          style={styles.titleInput}
          autoFocus
        />

        <Field label="Date">
          <NativeDateField onChange={setDate} value={date} />
        </Field>

        <Field label="Time">
          <NativeTimeField onChange={setTimeValue} value={time} />
        </Field>

        <Field label="Space">
          <View style={styles.chips}>
            <Pressable
              onPress={() => setSpaceId(undefined)}
              style={[styles.chip, !spaceId && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, !spaceId && styles.chipLabelActive]}>No space</Text>
            </Pressable>
            {spaces.map((space) => (
              <Pressable
                key={space.id}
                onPress={() => setSpaceId(space.id)}
                style={[styles.chip, spaceId === space.id && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, spaceId === space.id && styles.chipLabelActive]}>
                  {space.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="Priority">
          <View style={styles.chips}>
            {PRIORITIES.map((value) => (
              <Pressable
                key={value}
                onPress={() => setPriority(value)}
                style={[styles.chip, priority === value && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, priority === value && styles.chipLabelActive]}>
                  {value === 'none' ? 'None' : value}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="Reminder">
          <View style={styles.reminderRow}>
            <Text style={styles.reminderLabel}>Remind at task time</Text>
            <NativeSwitch
              accent={accent}
              colorScheme={colorScheme}
              disabled={!time.trim()}
              onValueChange={setRemindAtTime}
              value={remindAtTime}
            />
          </View>
        </Field>

        <Field label="Details">
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Details (optional)"
            placeholderTextColor={theme.placeholder}
            style={[styles.fieldInput, styles.detailsInput]}
            multiline
          />
        </Field>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const { styles } = useThemeStyles(createStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    close: {
      color: theme.textSecondary,
      fontSize: 18,
      width: 36,
    },
    heading: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '700',
    },
    submit: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitDisabled: {
      opacity: 0.35,
    },
    submitLabel: {
      color: theme.onPrimary,
      fontSize: 18,
      fontWeight: '700',
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      gap: 18,
    },
    titleInput: {
      color: theme.text,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.4,
      paddingVertical: 8,
    },
    field: {
      gap: 8,
    },
    fieldLabel: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    fieldInput: {
      ...continuousCorner(12),
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: theme.text,
      fontSize: 16,
    },
    detailsInput: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.input,
    },
    chipActive: {
      backgroundColor: theme.primary,
    },
    chipLabel: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    chipLabelActive: {
      color: theme.onPrimary,
    },
    reminderRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    reminderLabel: {
      flex: 1,
      color: theme.text,
      fontSize: 16,
      fontWeight: '500',
    },
  });
}
