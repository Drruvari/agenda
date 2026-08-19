import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { layout } from '@/theme/tokens';
import { type } from '@/theme/type';

type Props = {
  icon?: IconName;
  last?: boolean;
  leading?: ReactNode;
  label: string;
  onPress?: () => void;
  showChevron?: boolean;
  subtitle?: string;
  trailing?: ReactNode;
  value?: string;
};

export function SettingsRow({
  icon,
  last = false,
  label,
  leading,
  onPress,
  showChevron,
  subtitle,
  trailing,
  value,
}: Props) {
  const theme = useAppTheme();
  const chevron = showChevron ?? Boolean(onPress);
  const rowStyle = [
    styles.row,
    !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.separator },
  ];
  const body = (
    <>
      {leading ??
        (icon ? (
          <View style={[styles.iconWrap, { backgroundColor: theme.control.fill }]}>
            <Icon color={theme.textSecondary} name={icon} size={20} />
          </View>
        ) : null)}
      <View style={styles.copy}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {value ? <Text style={[styles.value, { color: theme.textSecondary }]}>{value}</Text> : null}
      {trailing}
      {chevron ? <Icon color={theme.textTertiary} name="chevronRight" size={18} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={rowStyle}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed && { backgroundColor: theme.control.pressed }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: layout.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: layout.rowGap,
  },
  iconWrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  label: {
    ...type.rowLabel,
  },
  subtitle: {
    ...type.subtitle,
  },
  value: {
    fontFamily: type.subtitle.fontFamily,
    fontSize: 15,
    lineHeight: 20,
  },
});
