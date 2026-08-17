import { Button as SwiftUIButton, Host } from '@expo/ui/swift-ui';
import { buttonStyle, disabled as disabledModifier, tint } from '@expo/ui/swift-ui/modifiers';
import type { StyleProp, ViewStyle } from 'react-native';

import { useAppAppearance } from '@/theme';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  role?: 'default' | 'cancel' | 'destructive';
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'prominent';
};

export function Button({
  disabled = false,
  label,
  onPress,
  role = 'default',
  style,
  variant = 'default',
}: ButtonProps) {
  const { accent, colorScheme } = useAppAppearance();
  const modifiers = [
    buttonStyle(variant === 'prominent' ? 'glassProminent' : 'automatic'),
    disabledModifier(disabled),
  ];

  if (role === 'destructive') modifiers.push(tint('#FF3B30'));

  return (
    <Host colorScheme={colorScheme} matchContents seedColor={accent} style={style}>
      <SwiftUIButton label={label} modifiers={modifiers} onPress={onPress} role={role} />
    </Host>
  );
}
