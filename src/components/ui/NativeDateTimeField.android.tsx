import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { parseLocalDate, toLocalDateString } from '@/data/schema/ids';
import { useAppTheme } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { continuousCorner } from '@/theme/tokens';

import {
  formatDisplayDate,
  formatDisplayTime,
  timeToDate,
  toLocalTimeString,
} from './NativeDateTimeField.shared';
import type { NativeDateFieldProps, NativeTimeFieldProps } from './NativeDateTimeField.types';

export function NativeDateField({ embedded = false, onChange, value }: NativeDateFieldProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const date = parseLocalDate(value);

  return (
    <View>
      <Pressable
        accessibilityLabel="Choose date"
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={embedded ? styles.embeddedTrigger : styles.trigger}
      >
        <Text style={styles.triggerText}>{formatDisplayDate(date)}</Text>
      </Pressable>

      {open ? (
        <DateTimePicker
          accentColor={theme.primary}
          mode="date"
          onDismiss={() => setOpen(false)}
          onValueChange={(_, next) => {
            onChange(toLocalDateString(next));
            setOpen(false);
          }}
          presentation="dialog"
          value={date}
        />
      ) : null}
    </View>
  );
}

export function NativeTimeField({
  embedded = false,
  onChange,
  optional = true,
  value,
}: NativeTimeFieldProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const hasTime = Boolean(value.trim());
  const date = hasTime ? timeToDate(value) : new Date();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={hasTime ? 'Change time' : 'Add time'}
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={[
          embedded ? styles.embeddedTrigger : styles.trigger,
          !embedded && styles.timeTrigger,
        ]}
      >
        <Text style={[styles.triggerText, !hasTime && styles.placeholder]}>
          {hasTime ? formatDisplayTime(value) : 'Add time'}
        </Text>
      </Pressable>

      {optional && hasTime ? (
        <Pressable accessibilityLabel="Clear time" onPress={() => onChange('')}>
          <Text style={styles.clear}>Clear</Text>
        </Pressable>
      ) : null}

      {open ? (
        <DateTimePicker
          accentColor={theme.primary}
          is24Hour
          mode="time"
          onDismiss={() => setOpen(false)}
          onValueChange={(_, next) => {
            onChange(toLocalTimeString(next));
            setOpen(false);
          }}
          presentation="dialog"
          value={date}
        />
      ) : null}
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 10,
    },
    trigger: {
      minHeight: 36,
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.input,
      ...continuousCorner(10),
    },
    embeddedTrigger: {
      minHeight: 28,
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingHorizontal: 0,
      paddingVertical: 0,
      backgroundColor: 'transparent',
    },
    timeTrigger: { flexGrow: 0, minWidth: 96 },
    triggerText: {
      color: theme.text,
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      lineHeight: 22,
      textAlign: 'right',
    },
    placeholder: { color: theme.placeholder },
    clear: {
      color: theme.primary,
      fontFamily: fonts.sansSemi,
      fontSize: 15,
    },
  });
}
