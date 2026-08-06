import { StyleSheet, View, type ViewProps } from 'react-native';

import { type AgendaTheme, continuousCorner, radius, shadow, useThemeStyles } from '@/theme';

type Props = ViewProps & {
  raised?: boolean;
  padded?: boolean;
};

export function Surface({ raised = true, padded = false, style, ...props }: Props) {
  const { styles } = useThemeStyles(createStyles);
  return (
    <View {...props} style={[styles.base, raised && shadow.card, padded && styles.padded, style]} />
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    base: {
      backgroundColor: theme.card,
      ...continuousCorner(radius.lg),
    },
    padded: {
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
  });
}
