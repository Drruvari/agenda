import { StyleSheet, Text } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { continuousCorner, layout } from '@/theme/tokens';
import { type } from '@/theme/type';

import type { ButtonProps } from './Button.types';

export function Button({
  disabled,
  label,
  onPress,
  role,
  style,
  variant = 'default',
}: ButtonProps) {
  const theme = useAppTheme();
  const prominent = variant === 'prominent';
  const color = role === 'destructive' ? theme.danger : prominent ? theme.onPrimary : theme.primary;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      pressedStyle={styles.pressed}
      style={[
        styles.root,
        prominent && { backgroundColor: theme.primary },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...continuousCorner(layout.controlRadius),
  },
  label: {
    ...type.rowLabel,
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.4 },
});
