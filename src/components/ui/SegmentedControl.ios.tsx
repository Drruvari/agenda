import NativeSegmentedControl from '@expo/ui/community/segmented-control';
import type { StyleProp, ViewStyle } from 'react-native';

import { useAppAppearance } from '@/theme';

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

export function SegmentedControl<T extends string>({ options, value, onChange, style }: Props<T>) {
  const { colorScheme } = useAppAppearance();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <NativeSegmentedControl
      appearance={colorScheme}
      onChange={(event) => {
        const option = options[event.nativeEvent.selectedSegmentIndex];
        if (option && option.value !== value) onChange(option.value);
      }}
      selectedIndex={selectedIndex}
      style={[{ minHeight: 32 }, style]}
      values={options.map((option) => option.label)}
    />
  );
}
