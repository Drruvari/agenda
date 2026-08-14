import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AgendaBottomSheet } from '@/components/ui/sheet/Sheet';
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

/** Settings value picker — accent label + bottom sheet (no Material popup menu). */
export function SettingPicker<T extends PickerValue>({
  last,
  onValueChange,
  options,
  subtitle,
  title,
  value,
}: Props<T>) {
  const { accent } = useAppAppearance();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? String(value);

  const selectOption = (nextValue: T) => {
    onValueChange(nextValue);
    setOpen(false);
  };

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
        </Pressable>
      </View>

      <AgendaBottomSheet
        height={48 + options.length * 56}
        isPresented={open}
        onDismiss={() => setOpen(false)}
      >
        <View style={styles.selectorContent}>
          <Text numberOfLines={1} style={styles.selectorTitle}>
            {title}
          </Text>
          <View style={styles.selectorOptions}>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={String(option.value)}
                  onPress={() => selectOption(option.value)}
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
        </View>
      </AgendaBottomSheet>
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
      paddingHorizontal: 16,
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
      alignItems: 'center',
      marginLeft: 'auto',
      paddingVertical: 8,
    },
    selectorValue: {
      fontFamily: fonts.sansMedium,
      fontSize: 15,
    },
    selectorContent: { flex: 1, paddingTop: 4 },
    selectorTitle: {
      color: theme.text,
      fontFamily: fonts.sansSemi,
      fontSize: 20,
    },
    selectorOptions: {
      overflow: 'hidden',
      marginTop: 16,
      backgroundColor: theme.background,
      ...continuousCorner(16),
    },
    selectorOption: {
      minHeight: 56,
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
    pressed: { opacity: 0.72 },
  });
}
