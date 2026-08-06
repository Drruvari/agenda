import { type PressableProps, StyleSheet, type ViewStyle } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Icon, type IconName } from '@/components/ui/Icon';
import { type AgendaTheme, continuousCorner, radius, useThemeStyles } from '@/theme';

type Props = PressableProps & {
  name: IconName;
  size?: number;
  color?: string;
  variant?: 'ghost' | 'outline' | 'filled' | 'accent';
  style?: ViewStyle;
};

export function IconButton({
  name,
  size = 16,
  color,
  variant = 'outline',
  style,
  ...props
}: Props) {
  const { styles, theme } = useThemeStyles(createStyles);
  const tint =
    color ?? (variant === 'filled' || variant === 'accent' ? theme.onPrimary : theme.text);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      hitSlop={6}
      pressedStyle={styles.pressed}
      style={[styles.base, styles[variant], style]}
      {...props}
    >
      <Icon name={name} size={size} color={tint} />
    </AnimatedPressable>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    base: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    outline: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    filled: {
      backgroundColor: theme.floating,
    },
    accent: {
      backgroundColor: theme.primary,
      ...continuousCorner(radius.sm),
      width: 28,
      height: 28,
    },
    pressed: {
      opacity: 0.75,
    },
  });
}
