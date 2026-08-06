import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { type AgendaTheme, continuousCorner, fonts, useAppAppearance, useAppTheme } from '@/theme';

type PickerValue = string | number;

type Props<T extends PickerValue> = {
  last?: boolean;
  onValueChange: (value: T) => void;
  options: { label: string; value: T }[];
  subtitle?: string;
  title: string;
  value: T;
};

/** Settings value picker — accent label + bottom sheet. */
export function SettingPicker<T extends PickerValue>({
  last,
  onValueChange,
  options,
  subtitle,
  title,
  value,
}: Props<T>) {
  const { accent } = useAppAppearance();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? String(value);

  return (
    <>
      <View style={[styles.settingRow, last && styles.lastRow]}>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
        <Pressable
          accessibilityLabel={`${title}, ${selectedLabel}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          hitSlop={8}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.selectorControl, pressed && styles.pressed]}
        >
          <Text numberOfLines={1} style={[styles.selectorValue, { color: accent }]}>
            {selectedLabel}
          </Text>
          <Icon color={accent} name="chevronDown" size={17} stroke={2} />
        </Pressable>
      </View>

      <Modal animationType="fade" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <View style={styles.selectorModal}>
          <Pressable
            accessibilityLabel="Close selector"
            onPress={() => setOpen(false)}
            style={styles.selectorBackdrop}
          />
          <View style={[styles.selectorSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.selectorTitle}>{title}</Text>
            <View style={styles.selectorOptions}>
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={String(option.value)}
                    onPress={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.selectorOption,
                      selected && styles.selectorOptionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.selectorOptionText, selected && { color: accent }]}>
                      {option.label}
                    </Text>
                    {selected ? <Icon color={accent} name="check" size={20} stroke={2.2} /> : null}
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={() => setOpen(false)} style={styles.selectorCancel}>
              <Text style={[styles.selectorCancelText, { color: accent }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    settingRow: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingLeft: 16,
      paddingRight: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    lastRow: { borderBottomWidth: 0 },
    rowCopy: { flex: 1, minWidth: 0, gap: 3 },
    rowTitle: { color: theme.text, fontFamily: fonts.sansMedium, fontSize: 16 },
    rowSubtitle: {
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 12.5,
      lineHeight: 17,
    },
    selectorControl: {
      flexShrink: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginLeft: 'auto',
      paddingVertical: 8,
      paddingLeft: 10,
      paddingRight: 4,
    },
    selectorValue: {
      fontFamily: fonts.sansMedium,
      fontSize: 15,
    },
    selectorModal: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    selectorBackdrop: {
      ...StyleSheet.absoluteFill,
    },
    selectorSheet: {
      paddingTop: 10,
      paddingHorizontal: 16,
      backgroundColor: theme.section,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      marginBottom: 14,
      borderRadius: 2,
      backgroundColor: theme.border,
    },
    selectorTitle: {
      marginBottom: 12,
      color: theme.text,
      fontFamily: fonts.sansSemi,
      fontSize: 17,
    },
    selectorOptions: {
      overflow: 'hidden',
      backgroundColor: theme.card,
      ...continuousCorner(14),
    },
    selectorOption: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    selectorOptionSelected: {
      backgroundColor: theme.primarySoft,
    },
    selectorOptionText: {
      flex: 1,
      color: theme.text,
      fontFamily: fonts.sansMedium,
      fontSize: 16,
    },
    selectorCancel: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      marginBottom: 4,
      minHeight: 48,
      backgroundColor: theme.card,
      ...continuousCorner(14),
    },
    selectorCancelText: {
      fontFamily: fonts.sansSemi,
      fontSize: 16,
    },
    pressed: { opacity: 0.72 },
  });
}
