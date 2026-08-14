import { Pressable, type StyleProp, StyleSheet, Text, type ViewStyle } from 'react-native';

import { fonts, useAppTheme } from '@/theme';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: string;
  iconOnly?: boolean;
  role?: 'default' | 'cancel' | 'destructive';
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'glass' | 'prominent';
};

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
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        prominent && { backgroundColor: theme.primary },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color:
              role === 'destructive' ? theme.danger : prominent ? theme.onPrimary : theme.primary,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.sansMedium, fontSize: 16 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.4 },
});
