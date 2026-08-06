import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { type CSSProperties, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { parseLocalDate, toLocalDateString } from '@/data/schema/ids';
import { type AgendaTheme, continuousCorner, fonts, useAppAppearance, useAppTheme } from '@/theme';

type DateFieldProps = {
  embedded?: boolean;
  onChange: (value: string) => void;
  value: string;
};

type TimeFieldProps = {
  embedded?: boolean;
  onChange: (value: string) => void;
  optional?: boolean;
  value: string;
};

export function NativeDateField({ embedded = false, onChange, value }: DateFieldProps) {
  const theme = useAppTheme();
  const { colorScheme } = useAppAppearance();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseLocalDate(value));
  const date = parseLocalDate(value);

  if (Platform.OS === 'web') {
    return (
      <WebDateInput onChange={onChange} style={webInputStyle(theme)} type="date" value={value} />
    );
  }

  const openPicker = () => {
    setDraft(date);
    setOpen(true);
  };

  return (
    <View>
      <Pressable
        accessibilityLabel="Choose date"
        accessibilityRole="button"
        onPress={openPicker}
        style={embedded ? styles.embeddedTrigger : styles.trigger}
      >
        <Text style={styles.triggerText}>{formatDisplayDate(date)}</Text>
      </Pressable>

      {Platform.OS === 'android' && open ? (
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

      {Platform.OS === 'ios' ? (
        <Modal
          animationType="fade"
          transparent
          visible={open}
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
            <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={styles.modalAction}>Cancel</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Date</Text>
                <Pressable
                  onPress={() => {
                    onChange(toLocalDateString(draft));
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.modalAction, styles.modalDone]}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                accentColor={theme.primary}
                display="spinner"
                mode="date"
                onValueChange={(_, next) => setDraft(next)}
                themeVariant={colorScheme}
                value={draft}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

export function NativeTimeField({
  embedded = false,
  onChange,
  optional = true,
  value,
}: TimeFieldProps) {
  const theme = useAppTheme();
  const { colorScheme } = useAppAppearance();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const hasTime = Boolean(value.trim());
  const date = hasTime ? timeToDate(value) : new Date();
  const [draft, setDraft] = useState(date);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.row}>
        <WebDateInput onChange={onChange} style={webInputStyle(theme)} type="time" value={value} />
        {optional && hasTime ? (
          <Pressable accessibilityLabel="Clear time" onPress={() => onChange('')}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const openPicker = () => {
    setDraft(hasTime ? timeToDate(value) : new Date());
    setOpen(true);
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={hasTime ? 'Change time' : 'Add time'}
        accessibilityRole="button"
        onPress={openPicker}
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

      {Platform.OS === 'android' && open ? (
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

      {Platform.OS === 'ios' ? (
        <Modal
          animationType="fade"
          transparent
          visible={open}
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
            <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={styles.modalAction}>Cancel</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Time</Text>
                <Pressable
                  onPress={() => {
                    onChange(toLocalTimeString(draft));
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.modalAction, styles.modalDone]}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                accentColor={theme.primary}
                display="spinner"
                mode="time"
                onValueChange={(_, next) => setDraft(next)}
                themeVariant={colorScheme}
                value={draft}
              />
            </Pressable>
          </Pressable>
        </Modal>
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

function formatDisplayTime(time: string): string {
  const [hourRaw, minuteRaw] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hourRaw || 0, minuteRaw || 0, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function webInputStyle(theme: AgendaTheme): CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    borderRadius: 10,
    boxSizing: 'border-box',
    color: theme.text,
    colorScheme: theme.isDark ? 'dark' : 'light',
    font: 'inherit',
    fontSize: 16,
    fontWeight: 500,
    minHeight: 28,
    padding: '0',
    textAlign: 'right',
    width: '100%',
  };
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
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.35)',
      padding: 16,
    },
    modalCard: {
      overflow: 'hidden',
      backgroundColor: theme.card,
      ...continuousCorner(18),
    },
    modalHeader: {
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    modalTitle: {
      color: theme.text,
      fontFamily: fonts.sansSemi,
      fontSize: 17,
    },
    modalAction: {
      color: theme.textSecondary,
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      minWidth: 64,
    },
    modalDone: {
      color: theme.primary,
      textAlign: 'right',
      fontFamily: fonts.sansSemi,
    },
  });
}
