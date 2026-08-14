import { Button as SwiftUIButton, Host } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  labelStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type { ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { useAppAppearance } from '@/theme';

type SystemImage = ComponentProps<typeof SwiftUIButton>['systemImage'];

export type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: SystemImage;
  iconOnly?: boolean;
  role?: 'default' | 'cancel' | 'destructive';
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'glass' | 'prominent';
};

export function Button({
  disabled = false,
  icon,
  iconOnly = false,
  label,
  onPress,
  role = 'default',
  style,
  variant = 'default',
}: ButtonProps) {
  const { accent, colorScheme } = useAppAppearance();
  const modifiers = [
    buttonStyle(
      variant === 'glass' ? 'glass' : variant === 'prominent' ? 'glassProminent' : 'automatic',
    ),
    disabledModifier(disabled),
  ];

  if (iconOnly) {
    modifiers.push(
      labelStyle('iconOnly'),
      accessibilityLabel(label),
      buttonBorderShape('circle'),
      controlSize('large'),
    );
  }
  if (role === 'destructive') modifiers.push(tint('#FF3B30'));

  return (
    <Host colorScheme={colorScheme} matchContents seedColor={accent} style={style}>
      <SwiftUIButton
        label={label}
        modifiers={modifiers}
        onPress={onPress}
        role={role}
        systemImage={icon}
      />
    </Host>
  );
}
