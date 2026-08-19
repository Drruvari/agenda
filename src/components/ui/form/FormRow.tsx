import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/AppThemeProvider';
import { spacing } from '@/theme/tokens';
import { type } from '@/theme/type';

type Props = {
  children?: ReactNode;
  label: string;
  last?: boolean;
  onPress?: () => void;
  value?: ReactNode;
};

export function FormRow({ children, label, last, onPress, value }: Props) {
  const theme = useAppTheme();
  const content = (
    <View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <View style={styles.trailing}>{value ?? children}</View>
      </View>
      {!last ? <View style={[styles.separator, { backgroundColor: theme.separator }]} /> : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: {
    ...type.formLabel,
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.md,
  },
  trailing: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg,
  },
  pressed: { opacity: 0.72 },
});
