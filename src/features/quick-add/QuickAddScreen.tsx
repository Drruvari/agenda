import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NativeDateField, NativeTimeField } from '@/components/ui/NativeDateTimeField';
import { NativeSwitch } from '@/components/ui/NativeSwitch';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { type ItemType, localDateTime, parseLocalDate, useData } from '@/data';
import { createDeviceEvent } from '@/native/calendar/deviceCalendar';
import { scheduleReminder } from '@/native/notifications/reminders';
import { type AgendaTheme, continuousCorner, useAppAppearance, useThemeStyles } from '@/theme';

type QuickType = ItemType | 'routine';

const TYPE_OPTIONS: { value: QuickType; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'event', label: 'Event' },
  { value: 'note', label: 'Note' },
  { value: 'routine', label: 'Routine' },
];

export function QuickAddScreen() {
  const { styles, theme } = useThemeStyles(createStyles);
  const { accent, colorScheme } = useAppAppearance();
  const { repos, refresh, ui, settings } = useData();
  const [type, setType] = useState<QuickType>(settings.editor.defaultAddType);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(ui.selectedDate);
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(String(settings.editor.defaultEventDurationMinutes));
  const [remindAtTime, setRemindAtTime] = useState(false);
  const [saving, setSaving] = useState(false);

  const setTimeValue = (next: string) => {
    setTime(next);
    if (!next.trim()) setRemindAtTime(false);
  };

  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const submit = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle || saving) return;
    setSaving(true);
    try {
      if (type === 'routine') {
        await repos.routines.create({ name: cleanTitle });
      } else if (type === 'task') {
        const when = remindAtTime && time ? localDateTime(date, time) : null;
        const notificationId = when
          ? await scheduleReminder(cleanTitle, details.trim() || undefined, when)
          : null;
        await repos.agenda.createTask({
          title: cleanTitle,
          details: details.trim() || undefined,
          date,
          time: time || undefined,
          spaceId: settings.editor.defaultSpaceId ?? undefined,
          reminderAt: notificationId && when ? when.toISOString() : undefined,
          notificationId: notificationId ?? undefined,
        });
      } else if (type === 'event') {
        const start = time ? localDateTime(date, time) : parseLocalDate(date);
        if (!start) return;
        const end = time
          ? new Date(start.getTime() + Math.max(1, Number(duration) || 30) * 60_000)
          : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
        const deviceEventId = await createDeviceEvent({
          title: cleanTitle,
          details: details.trim() || undefined,
          startDate: start,
          endDate: end,
          allDay: !time,
        }).catch(() => null);
        const notificationId = remindAtTime
          ? await scheduleReminder(cleanTitle, details.trim() || undefined, start)
          : null;
        await repos.agenda.createEvent({
          title: cleanTitle,
          details: details.trim() || undefined,
          date,
          time: time || undefined,
          spaceId: settings.editor.defaultSpaceId ?? undefined,
          durationMinutes: Math.max(1, Number(duration) || 30),
          deviceEventId: deviceEventId ?? undefined,
          reminderAt: notificationId ? start.toISOString() : undefined,
          notificationId: notificationId ?? undefined,
        });
      } else {
        await repos.agenda.createNote({
          title: cleanTitle,
          details: details.trim() || undefined,
          date,
          time: time || undefined,
          spaceId: settings.editor.defaultSpaceId ?? undefined,
        });
      }
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
        <Text style={styles.heading}>Quick add</Text>
        <Pressable onPress={() => void submit()} disabled={!title.trim() || saving}>
          <Text style={[styles.save, (!title.trim() || saving) && styles.disabled]}>Save</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SegmentedControl onChange={setType} options={TYPE_OPTIONS} value={type} />

        <TextInput
          autoFocus
          value={title}
          onChangeText={setTitle}
          placeholder={
            type === 'routine' ? 'Routine name' : `${type[0].toUpperCase() + type.slice(1)} title`
          }
          placeholderTextColor={theme.placeholder}
          style={styles.titleInput}
        />

        {type !== 'routine' ? (
          <>
            <View style={styles.fieldRow}>
              <View style={styles.flex}>
                <NativeDateField onChange={setDate} value={date} />
              </View>
              <View style={styles.timeField}>
                <NativeTimeField onChange={setTimeValue} value={time} />
              </View>
            </View>
            {type === 'event' ? (
              <TextInput
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                placeholder="Duration in minutes"
                placeholderTextColor={theme.placeholder}
                style={styles.input}
              />
            ) : null}
            <TextInput
              value={details}
              onChangeText={setDetails}
              multiline
              placeholder="Details (optional)"
              placeholderTextColor={theme.placeholder}
              style={[styles.input, styles.details]}
            />
            {type === 'task' || type === 'event' ? (
              <View style={styles.reminderRow}>
                <Text style={styles.reminderText}>Remind at item time</Text>
                <NativeSwitch
                  accent={accent}
                  colorScheme={colorScheme}
                  disabled={!time.trim()}
                  onValueChange={setRemindAtTime}
                  value={remindAtTime}
                />
              </View>
            ) : null}
          </>
        ) : null}
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
    content: { padding: 18, gap: 14 },
    titleInput: { color: theme.text, fontSize: 26, fontWeight: '700', paddingVertical: 10 },
    fieldRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    flex: { flex: 1 },
    timeField: { flexShrink: 0 },
    input: {
      backgroundColor: theme.card,
      color: theme.text,
      fontSize: 16,
      padding: 14,
      ...continuousCorner(12),
    },
    details: { minHeight: 100, textAlignVertical: 'top' },
    reminderRow: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.input,
      ...continuousCorner(12),
    },
    reminderText: { flex: 1, color: theme.text, fontSize: 15, fontWeight: '600' },
  });
}
