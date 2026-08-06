import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { Typography } from '@/components/ui/Typography';
import { type AgendaTheme, spacing, useThemeStyles } from '@/theme';

type ScreenProps = PropsWithChildren<{
  description?: string;
  title: string;
  showBack?: boolean;
}>;

export function Screen({ children, description, title, showBack = true }: ScreenProps) {
  const { styles } = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const canBack = showBack && router.canGoBack();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {canBack ? (
        <View style={styles.topBar}>
          <IconButton name="back" onPress={() => router.back()} />
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Typography variant="display" style={styles.title}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body" muted style={styles.description}>
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
      paddingHorizontal: 18,
      paddingTop: spacing.sm,
    },
    scroll: {
      paddingHorizontal: 18,
    },
    title: {
      marginTop: spacing.md,
    },
    description: {
      marginTop: spacing.sm,
      fontWeight: '400',
    },
    body: {
      marginTop: spacing.xl,
    },
  });
}
