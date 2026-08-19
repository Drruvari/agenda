import { StyleSheet, Text, View } from 'react-native';

import { IosChooseSpaceControl } from '@/features/library/IosChooseSpaceControl';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { fonts } from '@/theme/fonts';
import { spacing } from '@/theme/tokens';

import type { SpacePickerRowProps } from './SpacePickerRow.types';

export function SpacePickerRow({ label, last, onChange, spaces, value }: SpacePickerRowProps) {
  const theme = useAppTheme();

  return (
    <View>
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        <IosChooseSpaceControl onChange={onChange} spaces={spaces} value={value} />
      </View>
      {!last ? <View style={[styles.separator, { backgroundColor: theme.separator }]} /> : null}
    </View>
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
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg,
  },
});
