import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { useAppAppearance, useAppTheme } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { continuousCorner, spacing } from '@/theme/tokens';

import type { EditorPickerRowProps } from './EditorPickerRow.types';

export function EditorPickerRow({
  displayValue,
  label,
  last,
  onChange,
  options,
  value,
}: EditorPickerRowProps) {
  const { accent } = useAppAppearance();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme, accent), [theme, accent]);
  const [open, setOpen] = useState(false);
  const selected = displayValue ?? options.find((option) => option.value === value)?.label ?? value;

  return (
    <>
      <Pressable
        accessibilityLabel={`${label}, ${selected}`}
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text numberOfLines={1} style={[styles.rowPickerValue, { color: accent }]}>
            {selected}
          </Text>
        </View>
        {!last ? <View style={styles.insetSeparator} /> : null}
      </Pressable>

      <Modal animationType="fade" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <Pressable onPress={() => setOpen(false)} style={styles.modalBackdrop}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{label}</Text>
            {options.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value || 'none'}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.modalOption,
                    active && styles.modalOptionActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.modalOptionLabel, active && { color: accent }]}>
                    {option.label}
                  </Text>
                  {active ? <Icon color={accent} name="check" size={20} stroke={2.2} /> : null}
                </Pressable>
              );
            })}
            <Pressable onPress={() => setOpen(false)} style={styles.modalCancel}>
              <Text style={[styles.modalCancelLabel, { color: accent }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(theme: AgendaTheme, accent: string) {
  return StyleSheet.create({
    row: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    insetSeparator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: spacing.lg,
      backgroundColor: theme.separator,
    },
    rowLabel: {
      flex: 1,
      color: theme.text,
      fontFamily: fonts.sans,
      fontSize: 17,
      lineHeight: 22,
      paddingRight: spacing.md,
    },
    rowPickerValue: {
      flexShrink: 1,
      textAlign: 'right',
      fontFamily: fonts.sans,
      fontSize: 17,
      lineHeight: 22,
    },
    pressed: { opacity: 0.72 },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
      padding: spacing.md,
      paddingBottom: spacing.lg,
    },
    modalSheet: {
      overflow: 'hidden',
      backgroundColor: theme.card,
      ...continuousCorner(16),
    },
    modalTitle: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      color: theme.textSecondary,
      fontFamily: fonts.sansSemi,
      fontSize: 13,
      textTransform: 'uppercase',
    },
    modalOption: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
    },
    modalOptionActive: { backgroundColor: accent + '14' },
    modalOptionLabel: {
      color: theme.text,
      fontFamily: fonts.sans,
      fontSize: 17,
    },
    modalCancel: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelLabel: {
      fontFamily: fonts.sansSemi,
      fontSize: 17,
    },
  });
}
