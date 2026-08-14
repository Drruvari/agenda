import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { fonts, useAppTheme } from '@/theme';

export function Label({ children, style, ...props }: PropsWithChildren<TextProps>) {
  const theme = useAppTheme();
  return (
    <Text {...props} style={[styles.label, { color: theme.textSecondary }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18 },
});
