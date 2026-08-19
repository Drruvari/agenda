import { Switch, View } from 'react-native';

import { useAppAppearance, useAppTheme } from '@/theme/AppThemeProvider';

import type { NativeSwitchProps } from './NativeSwitch.types';

export function NativeSwitch({ disabled, onValueChange, value }: NativeSwitchProps) {
  const { accent } = useAppAppearance();
  const theme = useAppTheme();

  return (
    <View style={{ height: 32, justifyContent: 'center' }}>
      <Switch
        disabled={disabled}
        onValueChange={onValueChange}
        thumbColor="#FFFFFF"
        trackColor={{ false: theme.separator, true: accent }}
        value={value}
      />
    </View>
  );
}
