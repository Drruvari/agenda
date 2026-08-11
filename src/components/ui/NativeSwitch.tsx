import { Host, Switch } from '@expo/ui';

type Props = {
  accent?: string;
  colorScheme?: 'light' | 'dark';
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
  value: boolean;
};

/** Latest platform switch — SwiftUI on iOS, Material 3 on Android. */
export function NativeSwitch({ accent, colorScheme, disabled, onValueChange, value }: Props) {
  const seedColor =
    colorScheme === 'dark' && accent?.toUpperCase() === '#FFFFFF' ? '#8E8E93' : accent;

  return (
    <Host colorScheme={colorScheme} ignoreSafeArea="all" matchContents seedColor={seedColor}>
      <Switch disabled={disabled} onValueChange={onValueChange} value={value} />
    </Host>
  );
}
