import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { layout, spacing } from '@/theme/tokens';
import { type } from '@/theme/type';

type Props = {
  children: ReactNode;
  title: string;
};

export function FormSection({ children, title }: Props) {
  const theme = useAppTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: theme.textSecondary }]}>{title}</Text>
      <Card radius={layout.controlRadius} style={{ backgroundColor: theme.card }}>
        {children}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  title: {
    ...type.sectionTitle,
    marginLeft: spacing.sm,
    textTransform: 'uppercase',
  },
});
