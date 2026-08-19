import { Host } from '@expo/ui';
import { DatePicker } from '@expo/ui/swift-ui';
import { datePickerStyle } from '@expo/ui/swift-ui/modifiers';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { parseLocalDate, toLocalDateString } from '@/data/schema/ids';
import { useAppAppearance, useAppTheme } from '@/theme/AppThemeProvider';
import { fonts } from '@/theme/fonts';

import { timeToDate, toLocalTimeString } from './NativeDateTimeField.shared';
import type { NativeDateFieldProps, NativeTimeFieldProps } from './NativeDateTimeField.types';

export function NativeDateField({ onChange, value }: NativeDateFieldProps) {
  const { accent, colorScheme } = useAppAppearance();
  const date = useMemo(() => parseLocalDate(value), [value]);

  return (
    <Host
      colorScheme={colorScheme}
      ignoreSafeArea="all"
      matchContents
      seedColor={accent}
      style={styles.host}
    >
      <DatePicker
        displayedComponents={['date']}
        modifiers={[datePickerStyle('compact')]}
        onDateChange={(next) => onChange(toLocalDateString(next))}
        selection={date}
      />
    </Host>
  );
}

export function NativeTimeField({ onChange, optional = true, value }: NativeTimeFieldProps) {
  const { accent, colorScheme } = useAppAppearance();
  const theme = useAppTheme();
  const hasTime = Boolean(value.trim());
  const date = useMemo(() => (hasTime ? timeToDate(value) : new Date()), [hasTime, value]);

  if (!hasTime && optional) {
    return (
      <Pressable
        accessibilityLabel="Add time"
        accessibilityRole="button"
        onPress={() => onChange(toLocalTimeString(new Date()))}
        style={styles.addTime}
      >
        <Text style={[styles.addTimeLabel, { color: accent }]}>Add time</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      <Host
        colorScheme={colorScheme}
        ignoreSafeArea="all"
        matchContents
        seedColor={accent}
        style={styles.host}
      >
        <DatePicker
          displayedComponents={['hourAndMinute']}
          modifiers={[datePickerStyle('compact')]}
          onDateChange={(next) => onChange(toLocalTimeString(next))}
          selection={date}
        />
      </Host>
      {optional && hasTime ? (
        <Pressable accessibilityLabel="Clear time" onPress={() => onChange('')}>
          <Text style={[styles.clear, { color: theme.primary }]}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignSelf: 'center',
    flexShrink: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  addTime: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  addTimeLabel: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
  },
  clear: {
    fontFamily: fonts.sansSemi,
    fontSize: 15,
  },
});
