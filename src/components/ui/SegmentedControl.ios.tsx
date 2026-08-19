import NativeSegmentedControl from '@expo/ui/community/segmented-control';

import { useAppAppearance } from '@/theme/AppThemeProvider';

import type { SegmentedControlProps } from './SegmentedControl.types';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const { accent, colorScheme } = useAppAppearance();
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
      tintColor={accent}
      values={options.map((option) => option.label)}
    />
  );
}
