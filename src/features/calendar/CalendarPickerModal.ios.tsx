import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type AgendaTheme, continuousCorner, fonts, useAppAppearance, useAppTheme } from '@/theme';

type Props = {
  onChange: (date: Date) => void;
  onClose: () => void;
  onToday: () => void;
  value: Date;
  visible: boolean;
  weekStartsOn?: 'sunday' | 'monday';
};

export function CalendarPickerModal({ onChange, onClose, onToday, value, visible }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { colorScheme } = useAppAppearance();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modal}>
        <Pressable accessibilityLabel="Close calendar" onPress={onClose} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={onToday}>
              <Text style={styles.actionLabel}>Today</Text>
            </Pressable>
            <Text style={styles.title}>Choose a date</Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose}>
              <Text style={styles.actionLabel}>Done</Text>
            </Pressable>
          </View>
          <View style={styles.picker}>
            <DateTimePicker
              accentColor={theme.primary}
              display="inline"
              mode="date"
              onValueChange={(_, date) => onChange(date)}
              style={styles.nativePicker}
              themeVariant={colorScheme}
              value={value}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    modal: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: theme.overlay },
    sheet: {
      overflow: 'hidden',
      backgroundColor: theme.card,
      ...continuousCorner(20),
    },
    topBar: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    title: { color: theme.text, fontFamily: fonts.sansSemi, fontSize: 16 },
    actionLabel: { color: theme.primary, fontFamily: fonts.sansSemi, fontSize: 15 },
    picker: { paddingVertical: 8 },
    nativePicker: { width: '100%' },
  });
}
