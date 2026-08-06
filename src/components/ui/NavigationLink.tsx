import { type Href, Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { type AgendaTheme, continuousCorner, radius, spacing, useThemeStyles } from '@/theme';

type NavigationLinkProps = {
  detail?: string;
  href: Href;
  label: string;
};

export function NavigationLink({ detail, href, label }: NavigationLinkProps) {
  const { styles, theme } = useThemeStyles(createStyles);
  return (
    <Link asChild href={href}>
      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}
      >
        <View style={styles.copy}>
          <Typography variant="body">{label}</Typography>
          {detail ? (
            <Typography variant="label" muted>
              {detail}
            </Typography>
          ) : null}
        </View>
        <Typography variant="title" color={theme.textSecondary} style={styles.arrow}>
          →
        </Typography>
      </Pressable>
    </Link>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    link: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      ...continuousCorner(radius.md),
      backgroundColor: theme.card,
      paddingHorizontal: 18,
      paddingVertical: spacing.md,
    },
    pressed: {
      opacity: 0.65,
    },
    copy: {
      flex: 1,
      gap: 3,
    },
    arrow: {
      fontWeight: '400',
    },
  });
}
