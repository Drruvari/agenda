import { Host, Picker } from '@expo/ui';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppAppearance, useAppTheme } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { spacing } from '@/theme/tokens';

import type { EditorPickerRowProps } from './EditorPickerRow.types';

export function EditorPickerRow({ label, last, onChange, options, value }: EditorPickerRowProps) {
  const { accent, colorScheme } = useAppAppearance();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Host
          colorScheme={colorScheme}
          ignoreSafeArea="all"
          matchContents
          seedColor={accent}
          style={styles.pickerHost}
        >
          <Picker appearance="menu" onValueChange={onChange} selectedValue={value}>
            {options.map((option) => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </Host>
      </View>
      {!last ? <View style={styles.insetSeparator} /> : null}
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    row: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    rowLabel: {
      color: theme.text,
      fontFamily: fonts.sans,
      fontSize: 17,
    },
    pickerHost: { flexShrink: 0 },
    insetSeparator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: spacing.lg,
      backgroundColor: theme.separator,
    },
  });
}
