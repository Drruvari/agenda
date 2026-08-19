import { type CSSProperties, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

import type { NativeDateFieldProps, NativeTimeFieldProps } from './NativeDateTimeField.types';

export function NativeDateField({ onChange, value }: NativeDateFieldProps) {
  const theme = useAppTheme();

  return (
    <WebDateInput onChange={onChange} style={webInputStyle(theme)} type="date" value={value} />
  );
}

export function NativeTimeField({ onChange, optional = true, value }: NativeTimeFieldProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const hasTime = Boolean(value.trim());

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
    clear: {
      color: theme.primary,
      fontFamily: fonts.sansSemi,
      fontSize: 15,
    },
  });
}
