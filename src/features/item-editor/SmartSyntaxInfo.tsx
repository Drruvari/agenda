import { Pressable } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/theme';

/** Web fallback; native platforms use their platform popover implementations. */
export function SmartSyntaxInfo() {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityLabel="Smart syntax information" style={{ padding: 8 }}>
      <Icon name="info" size={20} color={String(theme.textSecondary)} />
    </Pressable>
  );
}
