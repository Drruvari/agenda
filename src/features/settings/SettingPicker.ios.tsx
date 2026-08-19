import { Host, Picker } from '@expo/ui';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppAppearance, useAppTheme } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type PickerValue = string | number;

type Props<T extends PickerValue> = {
  last?: boolean;
  onValueChange: (value: T) => void;
  options: { label: string; value: T }[];
  subtitle?: string;
  title: string;
  value: T;
};

export function SettingPicker<T extends PickerValue>({
  last,
  onValueChange,
  options,
  subtitle,
  title,
  value,
}: Props<T>) {
  const { accent, colorScheme } = useAppAppearance();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.settingRow, last && styles.lastRow]}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Host
        colorScheme={colorScheme}
        ignoreSafeArea="all"
        matchContents
        seedColor={accent}
        style={styles.pickerHost}
      >
        <Picker appearance="menu" onValueChange={onValueChange} selectedValue={value}>
          {options.map((option) => (
            <Picker.Item key={String(option.value)} label={option.label} value={option.value} />
          ))}
        </Picker>
      </Host>
    </View>
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
      paddingRight: 6,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    lastRow: { borderBottomWidth: 0 },
    rowCopy: { flex: 1, minWidth: 0, gap: 3 },
    rowTitle: { color: theme.text, fontFamily: fonts.sansMedium, fontWeight: '500', fontSize: 16 },
    rowSubtitle: {
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 12.5,
      lineHeight: 17,
    },
    pickerHost: {
      flexShrink: 0,
      alignSelf: 'center',
      marginLeft: 'auto',
    },
  });
}
