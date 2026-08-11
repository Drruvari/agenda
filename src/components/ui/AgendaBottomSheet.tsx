import { BottomSheet, Button as NativeButton, Host, RNHostView } from '@expo/ui';
import type { PropsWithChildren } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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
  return (
    <BottomSheet isPresented={isPresented} onDismiss={onDismiss} snapPoints={snapPoints}>
      <RNHostView style={{ width: '100%', height, backgroundColor: 'transparent' }}>
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
  action?: { label: string; onPress: () => void; icon?: 'add' };
}) {
  const theme = useAppTheme();
  const { accent, colorScheme } = useAppAppearance();
  return (
    <View style={[styles.header, { borderBottomColor: theme.separator }]}>
      {Platform.OS === 'ios' ? (
        <Host
          colorScheme={colorScheme}
          ignoreSafeArea="all"
          matchContents
          seedColor={accent}
          style={styles.side}
        >
          <NativeButton label={cancelLabel} onPress={onCancel} variant="text" />
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
            <NativeButton label={action.label} onPress={action.onPress} variant="text" />
          ) : null}
        </Host>
      ) : (
        <Pressable
          accessibilityLabel={action?.label}
          disabled={!action}
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
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { width: 76, minHeight: 44, justifyContent: 'center' },
  end: { alignItems: 'flex-end' },
  cancel: { fontFamily: fonts.sansMedium, fontSize: 16 },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.sansSemi, fontSize: 17 },
  action: { fontFamily: fonts.sansMedium, fontSize: 16 },
});
