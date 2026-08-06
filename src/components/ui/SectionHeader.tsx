import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Typography } from '@/components/ui/Typography';
import { spacing, useAppTheme } from '@/theme';

type Props = {
  title: string;
  accent?: boolean;
  icon?: IconName;
  meta?: string;
  onAdd?: () => void;
  onToggle?: () => void;
  toggleIcon?: IconName;
  onMore?: () => void;
};

export function SectionHeader({
  title,
  accent,
  icon,
  meta,
  onAdd,
  onToggle,
  toggleIcon,
  onMore,
}: Props) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <View style={styles.leading}>
        {icon ? <Icon name={icon} size={24} color={theme.primary} /> : null}
        <Typography variant="section" color={accent ? theme.primary : theme.textSecondary}>
          {title}
        </Typography>
      </View>
      <View style={styles.trailing}>
        {meta ? (
          <Typography variant="label" color={theme.textTertiary}>
            {meta}
          </Typography>
        ) : null}
        {onToggle ? (
          <IconButton name={toggleIcon ?? 'chevronDown'} variant="ghost" onPress={onToggle} />
        ) : null}
        {onMore ? <IconButton name="more" variant="ghost" onPress={onMore} /> : null}
        {onAdd ? <IconButton name="add" variant="accent" onPress={onAdd} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
