import { StyleSheet, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Typography } from '@/components/ui/Typography';
import {
  type AgendaTheme,
  continuousCorner,
  radius,
  shadow,
  spacing,
  useThemeStyles,
} from '@/theme';

type Props = {
  name: string;
  space?: string;
  completed?: boolean;
  onPress?: () => void;
};

export function RoutineCard({ name, space, completed, onPress }: Props) {
  const { styles, theme } = useThemeStyles(createStyles);
  return (
    <AnimatedPressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
      haptic="selection"
      onPress={onPress}
      pressScale={0.985}
      style={[styles.card, completed && styles.cardDone, shadow.card]}
    >
      <Typography variant="body" color={completed ? theme.primary : theme.text}>
        {name}
      </Typography>
      {space ? (
        <Typography variant="caption" color={completed ? theme.primary : theme.textSecondary}>
          {space}
        </Typography>
      ) : (
        <View style={{ height: 16 }} />
      )}
      <View style={[styles.check, completed && styles.checkDone]}>
        {completed ? <View style={styles.checkFill} /> : null}
      </View>
    </AnimatedPressable>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    card: {
      width: 112,
      minHeight: 112,
      ...continuousCorner(radius.lg),
      backgroundColor: theme.card,
      padding: spacing.md,
    },
    cardDone: {
      backgroundColor: theme.primarySoft,
    },
    check: {
      marginTop: 'auto',
      alignSelf: 'flex-end',
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card,
    },
    checkDone: {
      borderColor: theme.primary,
      padding: 2,
    },
    checkFill: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.primary,
    },
  });
}
