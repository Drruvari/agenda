import { Host, Picker } from '@expo/ui';
import type { StyleProp, ViewStyle } from 'react-native';

import { useAppAppearance } from '@/theme/AppThemeProvider';

export type SelectOption<T extends string | number> = { label: string; value: T };

export function Select<T extends string | number>({
  disabled,
  onValueChange,
  options,
  style,
  value,
}: {
  disabled?: boolean;
  onValueChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  style?: StyleProp<ViewStyle>;
  value: T;
}) {
  const { accent, colorScheme } = useAppAppearance();
  return (
    <Host colorScheme={colorScheme} seedColor={accent} style={style}>
      <Picker enabled={!disabled} selectedValue={value} onValueChange={onValueChange}>
        {options.map((option) => (
          <Picker.Item key={String(option.value)} label={option.label} value={option.value} />
        ))}
      </Picker>
    </Host>
  );
}
