import { type ChangeEvent, type CSSProperties, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { continuousCorner } from '@/theme/tokens';

import type { CalendarPickerModalProps } from './CalendarPickerModal.types';

export function CalendarPickerModal({
  onChange,
  onClose,
  value,
  visible,
}: CalendarPickerModalProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const webInputStyle = useMemo<CSSProperties>(
    () => ({
      background: theme.card,
      border: `1px solid ${theme.separator}`,
      borderRadius: 12,
      boxSizing: 'border-box',
      color: theme.text,
      colorScheme: theme.isDark ? 'dark' : 'light',
      font: 'inherit',
      fontSize: 16,
      minHeight: 48,
      padding: '0 14px',
      width: '100%',
    }),
    [theme],
  );

  const inputValue = [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = event.target.value.split('-').map(Number);
    if (!year || !month || !day) return;
    onChange(new Date(year, month - 1, day));
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modal}>
        <Pressable accessibilityLabel="Close calendar" onPress={onClose} style={styles.backdrop} />
        <View style={styles.card}>
          <Text style={styles.title}>Choose a date</Text>
          <input
            aria-label="Choose date"
            onChange={handleChange}
            style={webInputStyle}
            type="date"
            value={inputValue}
          />
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.actionButton}>
              <Text style={styles.actionLabel}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    modal: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: theme.overlay },
    card: {
      width: '100%',
      maxWidth: 380,
      gap: 16,
      padding: 18,
      backgroundColor: theme.card,
      ...continuousCorner(20),
    },
    title: { color: theme.text, fontSize: 18, fontWeight: '700' },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    actionButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14 },
    actionLabel: { color: theme.primary, fontSize: 15, fontWeight: '600' },
  });
}
