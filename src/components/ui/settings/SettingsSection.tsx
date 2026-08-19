import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { layout, spacing } from '@/theme/tokens';
import { type } from '@/theme/type';

type Props = {
  children: ReactNode;
  title?: string;
};

export function SettingsSection({ children, title }: Props) {
  const theme = useAppTheme();

  return (
    <View style={styles.wrap}>
      {title ? <Text style={[styles.title, { color: theme.textSecondary }]}>{title}</Text> : null}
      <Card>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: layout.sectionTitleGap,
  },
  title: {
    ...type.sectionTitle,
    paddingHorizontal: spacing.xs,
    textTransform: 'uppercase',
  },
});
