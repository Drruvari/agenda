import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { Typography } from '@/components/ui/Typography';
import { type AgendaTheme, spacing, useThemeStyles } from '@/theme';

type ScreenProps = PropsWithChildren<{
  description?: string;
  showBack?: boolean;
  title: string;
}>;

export function Screen({ children, description, showBack = true, title }: ScreenProps) {
  const { styles } = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {showBack && router.canGoBack() ? (
        <View style={styles.topBar}>
          <IconButton accessibilityLabel="Go back" name="back" onPress={router.back} />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Typography variant="display">{title}</Typography>

        {description ? (
          <Typography muted style={styles.description} variant="body">
            {description}
          </Typography>
        ) : null}

        {children ? <View style={styles.body}>{children}</View> : null}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.section,
    },
    topBar: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    description: {
      marginTop: spacing.sm,
    },
    body: {
      marginTop: spacing.xl,
    },
  });
}
