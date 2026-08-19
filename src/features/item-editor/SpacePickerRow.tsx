import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { useLibrary } from '@/features/library/LibraryContext';
import { useAppAppearance, useAppTheme } from '@/theme/AppThemeProvider';
import { fonts } from '@/theme/fonts';
import { spacing } from '@/theme/tokens';

import type { SpacePickerRowProps } from './SpacePickerRow.types';

const NONE_SPACE = '__none__';

export function SpacePickerRow({ label, last, onChange, spaces, value }: SpacePickerRowProps) {
  const { accent } = useAppAppearance();
  const theme = useAppTheme();
  const { openSpacePicker } = useLibrary();
  const selected = spaces.find((option) => option.value === value)?.label ?? 'Inbox';

  return (
    <Pressable
      accessibilityLabel={`${label}, ${selected}`}
      accessibilityRole="button"
      onPress={() =>
        openSpacePicker(value === NONE_SPACE ? null : value, (spaceId) =>
          onChange(spaceId ?? NONE_SPACE),
        )
      }
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        <View style={styles.trailing}>
          <Text style={[styles.value, { color: accent }]}>{selected}</Text>
          <Icon color={theme.textSecondary} name="chevronRight" size={18} />
        </View>
      </View>
      {!last ? <View style={[styles.separator, { backgroundColor: theme.separator }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 22,
    paddingRight: spacing.md,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  value: {
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 22,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg,
  },
  pressed: { opacity: 0.72 },
});
