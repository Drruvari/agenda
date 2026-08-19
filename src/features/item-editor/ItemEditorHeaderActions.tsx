import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/theme/AppThemeProvider';

import type { ItemEditorHeaderActionsProps } from './ItemEditorHeaderActions.types';

export function ItemEditorHeaderActions({
  canSave,
  saving,
  onDismiss,
  onSave,
}: ItemEditorHeaderActionsProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityLabel="Close editor"
        onPress={onDismiss}
        style={({ pressed }) => [
          styles.side,
          { backgroundColor: theme.section },
          pressed && styles.pressed,
        ]}
      >
        <Icon name="close" size={18} color={theme.text} />
      </Pressable>
      <View style={styles.spacer} />
      <Pressable
        accessibilityLabel="Save item"
        disabled={!canSave}
        onPress={onSave}
        style={({ pressed }) => [
          styles.side,
          { backgroundColor: theme.primary, opacity: canSave ? 1 : 0.4 },
          pressed && canSave && styles.pressed,
        ]}
      >
        <Icon name={saving ? 'more' : 'check'} size={20} color={theme.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: {
    width: 44,
    height: 44,
    minWidth: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: { flex: 1 },
  pressed: { opacity: 0.72 },
});
