import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '@/theme/AppThemeProvider';
import { continuousCorner, layout } from '@/theme/tokens';

type Props = ViewProps & {
  children: ReactNode;
  radius?: number;
};

export function Card({ children, radius = layout.cardRadius, style, ...props }: Props) {
  const theme = useAppTheme();

  return (
    <View
      {...props}
      style={[styles.card, { backgroundColor: theme.section, ...continuousCorner(radius) }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
