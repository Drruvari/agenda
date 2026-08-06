import { StyleSheet, View } from 'react-native';

import { Checkbox } from '@/components/ui/Checkbox';
import { Surface } from '@/components/ui/Surface';
import { Typography } from '@/components/ui/Typography';
import { type AgendaTheme, spacing, useThemeStyles } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  time?: string;
  priority?: string;
  completed?: boolean;
  showClock?: boolean;
  onToggle?: () => void;
};

export function TaskRow({
  title,
  subtitle,
  time,
  priority,
  completed,
  showClock,
  onToggle,
}: Props) {
  const { styles, theme } = useThemeStyles(createStyles);
  return (
    <Surface padded style={styles.row}>
      {time ? (
        <Typography variant="label" color={theme.textSecondary} style={styles.time}>
          {time}
        </Typography>
      ) : null}

      {onToggle || showClock ? (
        <Checkbox checked={completed} clock={showClock && !onToggle} onPress={onToggle} />
      ) : null}

      <View style={styles.body}>
        <Typography variant="body" style={[completed ? styles.titleDone : null]} numberOfLines={2}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography
            variant="label"
            muted
            color={subtitle.includes('late') ? theme.danger : undefined}
          >
            {subtitle}
          </Typography>
        ) : null}
      </View>

      {priority ? (
        <Typography variant="label" color={theme.warning} style={styles.priority}>
          {priority}
        </Typography>
      ) : null}
    </Surface>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    time: {
      width: 44,
      paddingTop: 2,
      fontVariant: ['tabular-nums'],
    },
    body: {
      flex: 1,
      gap: 3,
    },
    titleDone: {
      color: theme.textSecondary,
      textDecorationLine: 'line-through',
    },
    priority: {
      fontWeight: '700',
      paddingTop: 2,
    },
  });
}
