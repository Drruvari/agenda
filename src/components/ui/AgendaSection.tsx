import { StyleSheet, View, type ViewProps } from 'react-native';

import type { IconName } from '@/components/ui/Icon';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { spacing } from '@/theme';

type Props = ViewProps & {
  title: string;
  accent?: boolean;
  icon?: IconName;
  meta?: string;
  onAdd?: () => void;
  onToggle?: () => void;
  toggleIcon?: IconName;
  onMore?: () => void;
};

export function AgendaSection({
  title,
  accent,
  icon,
  meta,
  onAdd,
  onToggle,
  toggleIcon,
  onMore,
  children,
  style,
  ...props
}: Props) {
  return (
    <View {...props} style={[styles.section, style]}>
      <SectionHeader
        title={title}
        accent={accent}
        icon={icon}
        meta={meta}
        onAdd={onAdd}
        onToggle={onToggle}
        toggleIcon={toggleIcon}
        onMore={onMore}
      />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xxl - 4,
  },
  body: {
    gap: spacing.sm,
  },
});
