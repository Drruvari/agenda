import { Host } from '@expo/ui';
import { Button as NativeButton } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as nativeDisabled,
  labelStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { useAppAppearance, useAppTheme } from '@/theme/AppThemeProvider';

import type { ItemEditorHeaderActionsProps } from './ItemEditorHeaderActions.types';

export function ItemEditorHeaderActions({
  canSave,
  inputKey,
  saving,
  onDismiss,
  onSave,
}: ItemEditorHeaderActionsProps) {
  const { accent, colorScheme } = useAppAppearance();
  const theme = useAppTheme();

  return (
    <View style={styles.bar}>
      <Host
        key={`${inputKey}-close`}
        colorScheme={colorScheme}
        ignoreSafeArea="all"
        matchContents
        seedColor={accent}
        style={styles.side}
      >
        <NativeButton
          label="Close"
          modifiers={[
            labelStyle('iconOnly'),
            accessibilityLabel('Close editor'),
            buttonStyle('glass'),
            buttonBorderShape('circle'),
            controlSize('large'),
            tint(theme.textSecondary),
          ]}
          onPress={onDismiss}
          systemImage="xmark"
        />
      </Host>
      <View style={styles.spacer} />
      <Host
        colorScheme={colorScheme}
        ignoreSafeArea="all"
        matchContents
        seedColor={accent}
        style={styles.side}
      >
        <NativeButton
          label="Save"
          modifiers={[
            labelStyle('iconOnly'),
            accessibilityLabel('Save item'),
            buttonStyle('glassProminent'),
            buttonBorderShape('circle'),
            controlSize('large'),
            nativeDisabled(!canSave),
          ]}
          onPress={onSave}
          systemImage={saving ? 'ellipsis' : 'checkmark'}
        />
      </Host>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: { flex: 1 },
});
