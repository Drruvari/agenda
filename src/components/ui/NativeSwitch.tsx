import { Host, Switch } from '@expo/ui';

import { useAppAppearance } from '@/theme';

type Props = {
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
  value: boolean;
};

export function NativeSwitch({ disabled, onValueChange, value }: Props) {
  const { accent, colorScheme } = useAppAppearance();
  const seedColor =
    colorScheme === 'dark' && accent.toUpperCase() === '#FFFFFF' ? '#34C759' : accent;

  return (
    <Host colorScheme={colorScheme} ignoreSafeArea="all" matchContents seedColor={seedColor}>
      <Switch disabled={disabled} onValueChange={onValueChange} value={value} />
    </Host>
  );
}
