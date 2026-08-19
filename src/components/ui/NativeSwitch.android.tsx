import { Switch } from 'react-native';

import { useAppAppearance, useAppTheme } from '@/theme/AppThemeProvider';

type Props = {
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
  value: boolean;
};

export function NativeSwitch({ disabled, onValueChange, value }: Props) {
  const { accent } = useAppAppearance();
  const theme = useAppTheme();

  return (
    <Switch
      disabled={disabled}
      onValueChange={onValueChange}
      thumbColor="#FFFFFF"
      trackColor={{ false: theme.separator, true: accent }}
      value={value}
    />
  );
}
