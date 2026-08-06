import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Typography } from '@/components/ui/Typography';
import { type AgendaTheme, continuousCorner, radius, spacing, useThemeStyles } from '@/theme';

type PlaceholderScreenProps = {
  description: string;
  dismissible?: boolean;
  title: string;
};

export function PlaceholderScreen({
  description,
  dismissible = false,
  title,
}: PlaceholderScreenProps) {
  const { styles, theme } = useThemeStyles(createStyles);
  const dismiss = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  return (
    <Screen title={title} description={description}>
      {dismissible ? (
        <Pressable accessibilityRole="button" onPress={dismiss} style={styles.button}>
          <Typography variant="body" color={theme.onPrimary}>
            Done
          </Typography>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    button: {
      alignSelf: 'flex-start',
      minHeight: 44,
      justifyContent: 'center',
      ...continuousCorner(radius.md),
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.lg,
    },
  });
}
