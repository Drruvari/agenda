import { Host, TextInput, type TextInputProps } from '@expo/ui';
import type { StyleProp, ViewStyle } from 'react-native';

import { useAppAppearance, useAppTheme } from '@/theme';

export type InputProps = TextInputProps & { style?: StyleProp<ViewStyle> };

export function Input({ style, ...props }: InputProps) {
  const { accent, colorScheme } = useAppAppearance();
  const theme = useAppTheme();
  return (
    <Host colorScheme={colorScheme} seedColor={accent} style={style}>
      <TextInput
        cursorColor={accent}
        placeholderTextColor={theme.placeholder}
        selectionColor={accent}
        {...props}
      />
    </Host>
  );
}
