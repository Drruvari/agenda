import { Platform, StyleSheet, Text, View } from 'react-native';

import { useThemeStyles } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { continuousCorner } from '@/theme/tokens';

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
      backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.card,
      ...continuousCorner(Platform.OS === 'ios' ? 0 : 16),
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
