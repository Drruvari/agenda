import { StyleSheet, Text, View } from 'react-native';

import { type AgendaTheme, continuousCorner, fonts, useThemeStyles } from '@/theme';

type Props = {
  compact?: boolean;
  message: string;
};

export function EmptyState({ compact = false, message }: Props) {
  const { styles } = useThemeStyles(createStyles);
  return (
    <View style={[styles.card, compact ? styles.cardCompact : null]}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    card: {
      minHeight: 56,
      paddingVertical: 16,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card,
      ...continuousCorner(16),
    },
    cardCompact: {
      minHeight: 40,
      paddingVertical: 8,
    },
    message: {
      fontFamily: fonts.sans,
      fontSize: 15,
      lineHeight: 20,
      textAlign: 'center',
      color: theme.textSecondary,
    },
  });
}
