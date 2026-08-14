import { BottomSheet, Host, RNHostView } from '@expo/ui';
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
import type { PropsWithChildren } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { fonts, useAppAppearance, useAppTheme } from '@/theme';

export const SHEET_DISMISS_MS = Platform.OS === 'ios' ? 320 : 250;

type SnapPoint = 'half' | 'full' | { fraction: number } | { height: number };

type Props = PropsWithChildren<{
  height: number;
  isPresented: boolean;
  onDismiss: () => void;
  snapPoints?: SnapPoint[];
}>;

/** Single native sheet boundary used by every React Native-backed Agenda sheet. */
export function AgendaBottomSheet({ children, height, isPresented, onDismiss, snapPoints }: Props) {
  const resolvedSnapPoints =
    snapPoints ?? (Platform.OS === 'ios' ? ([{ fraction: 0.92 }] as SnapPoint[]) : undefined);
  const hostHeight = Platform.OS === 'ios' ? Dimensions.get('window').height : height;
  return (
    <BottomSheet isPresented={isPresented} onDismiss={onDismiss} snapPoints={resolvedSnapPoints}>
      <RNHostView style={{ width: '100%', height: hostHeight, backgroundColor: 'transparent' }}>
        <View collapsable={false} style={styles.host}>
          {children}
        </View>
      </RNHostView>
    </BottomSheet>
  );
}

export function AgendaSheetHeader({
  title,
  onCancel,
  cancelLabel = 'Cancel',
  action,
}: {
  title: string;
  onCancel: () => void;
  cancelLabel?: string;
  action?: { label: string; onPress: () => void; icon?: 'add'; disabled?: boolean };
}) {
  const theme = useAppTheme();
  const { accent, colorScheme } = useAppAppearance();
  return (
    <View style={[styles.header, Platform.OS !== 'ios' && { borderBottomColor: theme.separator }]}>
      {Platform.OS === 'ios' ? (
        <Host
          colorScheme={colorScheme}
          ignoreSafeArea="all"
          matchContents
          seedColor={accent}
          style={styles.side}
        >
          <NativeButton
            label={cancelLabel}
            modifiers={[
              labelStyle('iconOnly'),
              accessibilityLabel(cancelLabel),
              buttonStyle('glass'),
              buttonBorderShape('circle'),
              controlSize('large'),
              tint(theme.textSecondary),
            ]}
            onPress={onCancel}
            systemImage="xmark"
          />
        </Host>
      ) : (
        <Pressable onPress={onCancel} style={styles.side}>
          <Text style={[styles.cancel, { color: theme.primary }]}>{cancelLabel}</Text>
        </Pressable>
      )}
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      {Platform.OS === 'ios' ? (
        <Host
          colorScheme={colorScheme}
          ignoreSafeArea="all"
          matchContents
          seedColor={accent}
          style={[styles.side, styles.end]}
        >
          {action ? (
            <NativeButton
              label={action.label}
              modifiers={[
                labelStyle('iconOnly'),
                accessibilityLabel(action.label),
                buttonStyle('glassProminent'),
                buttonBorderShape('circle'),
                controlSize('large'),
                nativeDisabled(Boolean(action.disabled)),
              ]}
              onPress={action.onPress}
              systemImage={action.icon === 'add' ? 'plus' : 'checkmark'}
            />
          ) : null}
        </Host>
      ) : (
        <Pressable
          accessibilityLabel={action?.label}
          disabled={!action || action.disabled}
          onPress={action?.onPress}
          style={[styles.side, styles.end]}
        >
          {action?.icon === 'add' ? <Icon name="add" size={24} color={theme.primary} /> : null}
          {action && !action.icon ? (
            <Text style={[styles.action, { color: theme.primary }]}>{action.label}</Text>
          ) : null}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  header: {
    height: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: Platform.OS === 'ios' ? 0 : StyleSheet.hairlineWidth,
  },
  side: { width: 76, minHeight: 44, justifyContent: 'center' },
  end: { alignItems: 'flex-end' },
  cancel: { fontFamily: fonts.sansMedium, fontSize: 16 },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.sansSemi, fontSize: 17 },
  action: { fontFamily: fonts.sansMedium, fontSize: 16 },
});
