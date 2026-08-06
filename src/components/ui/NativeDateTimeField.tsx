import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { type CSSProperties, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { parseLocalDate, toLocalDateString } from '@/data/schema/ids';
import { type AgendaTheme, continuousCorner, useAppAppearance, useAppTheme } from '@/theme';

type DateFieldProps = {
  onChange: (value: string) => void;
  value: string;
};

type TimeFieldProps = {
  onChange: (value: string) => void;
  optional?: boolean;
  value: string;
};

export function NativeDateField({ onChange, value }: DateFieldProps) {
  const theme = useAppTheme();
  const { colorScheme } = useAppAppearance();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [androidOpen, setAndroidOpen] = useState(false);
  const date = parseLocalDate(value);

  if (Platform.OS === 'web') {
    return (
      <WebDateInput onChange={onChange} style={webInputStyle(theme)} type="date" value={value} />
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View>
        <Pressable
          accessibilityLabel="Choose date"
          accessibilityRole="button"
          onPress={() => setAndroidOpen(true)}
          style={styles.androidTrigger}
        >
          <Text style={styles.triggerText}>{formatDisplayDate(date)}</Text>
        </Pressable>
        {androidOpen ? (
          <DateTimePicker
            accentColor={theme.primary}
            mode="date"
            onDismiss={() => setAndroidOpen(false)}
            onValueChange={(_, next) => {
              onChange(toLocalDateString(next));
              setAndroidOpen(false);
            }}
            presentation="dialog"
            value={date}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.iosWrap}>
      <DateTimePicker
        accentColor={theme.primary}
        display="compact"
        mode="date"
        onValueChange={(_, next) => onChange(toLocalDateString(next))}
        themeVariant={colorScheme}
        value={date}
      />
    </View>
  );
}

export function NativeTimeField({ onChange, optional = true, value }: TimeFieldProps) {
  const theme = useAppTheme();
  const { colorScheme } = useAppAppearance();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [androidOpen, setAndroidOpen] = useState(false);
  const hasTime = Boolean(value.trim());
  const date = hasTime ? timeToDate(value) : new Date();

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webRow}>
        <WebDateInput onChange={onChange} style={webInputStyle(theme)} type="time" value={value} />
        {optional && hasTime ? (
          <Pressable accessibilityLabel="Clear time" onPress={() => onChange('')}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View style={styles.androidRow}>
        <Pressable
          accessibilityLabel={hasTime ? 'Change time' : 'Add time'}
          accessibilityRole="button"
          onPress={() => setAndroidOpen(true)}
          style={[styles.androidTrigger, styles.androidTimeTrigger]}
        >
          <Text style={[styles.triggerText, !hasTime && styles.placeholder]}>
            {hasTime ? value : 'Add time'}
          </Text>
        </Pressable>
        {optional && hasTime ? (
          <Pressable accessibilityLabel="Clear time" onPress={() => onChange('')}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        ) : null}
        {androidOpen ? (
          <DateTimePicker
            accentColor={theme.primary}
            is24Hour
            mode="time"
            onDismiss={() => setAndroidOpen(false)}
            onValueChange={(_, next) => {
              onChange(toLocalTimeString(next));
              setAndroidOpen(false);
            }}
            presentation="dialog"
            value={date}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.iosRow}>
      {hasTime || !optional ? (
        <DateTimePicker
          accentColor={theme.primary}
          display="compact"
          mode="time"
          onValueChange={(_, next) => onChange(toLocalTimeString(next))}
          themeVariant={colorScheme}
          value={date}
        />
      ) : (
        <Pressable
          accessibilityLabel="Add time"
          accessibilityRole="button"
          onPress={() => onChange(toLocalTimeString(new Date()))}
          style={styles.addTime}
        >
          <Text style={styles.addTimeLabel}>Add time</Text>
        </Pressable>
      )}
      {optional && hasTime ? (
        <Pressable accessibilityLabel="Clear time" onPress={() => onChange('')}>
          <Text style={styles.clear}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function WebDateInput({
  onChange,
  style,
  type,
  value,
}: {
  onChange: (value: string) => void;
  style: CSSProperties;
  type: 'date' | 'time';
  value: string;
}) {
  return (
    <input
      aria-label={type === 'date' ? 'Choose date' : 'Choose time'}
      onChange={(event) => onChange(event.target.value)}
      style={style}
      type={type}
      value={value}
    />
  );
}

function timeToDate(time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour || 0, minute || 0, 0, 0);
  return date;
}

function toLocalTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function webInputStyle(theme: AgendaTheme): CSSProperties {
  return {
    background: theme.section,
    border: 'none',
    borderRadius: 14,
    boxSizing: 'border-box',
    color: theme.text,
    colorScheme: theme.isDark ? 'dark' : 'light',
    font: 'inherit',
    fontSize: 16,
    minHeight: 50,
    padding: '12px 14px',
    width: '100%',
  };
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    iosWrap: { alignItems: 'flex-start' },
    iosRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    androidRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    webRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    androidTrigger: {
      minHeight: 50,
      justifyContent: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: theme.section,
      ...continuousCorner(14),
    },
    androidTimeTrigger: { flexGrow: 0, minWidth: 120 },
    triggerText: { color: theme.text, fontSize: 16, fontWeight: '500' },
    placeholder: { color: theme.placeholder },
    addTime: {
      minHeight: 36,
      justifyContent: 'center',
      paddingHorizontal: 12,
      backgroundColor: theme.input,
      ...continuousCorner(10),
    },
    addTimeLabel: { color: theme.primary, fontSize: 15, fontWeight: '600' },
    clear: { color: theme.primary, fontSize: 15, fontWeight: '600' },
  });
}
