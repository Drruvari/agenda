import { BottomSheet, RNHostView } from '@expo/ui';
import {
  BottomSheet as SwiftUIBottomSheet,
  Button as NativeButton,
  Group,
  Host as SwiftUIHost,
  RNHostView as SwiftUIRNHostView,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as nativeDisabled,
  frame,
  labelStyle,
  padding,
  presentationBackground,
  type PresentationDetent,
  presentationDetents,
  presentationDragIndicator,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type { PropsWithChildren } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { useAppAppearance, useAppTheme } from '@/theme/AppThemeProvider';
import { layout } from '@/theme/tokens';
import { type } from '@/theme/type';

export const SHEET_DISMISS_MS = Platform.OS === 'ios' ? 320 : 250;

type SnapPoint = 'half' | 'full' | { fraction: number } | { height: number };

type Props = PropsWithChildren<{
  backgroundColor?: string;
  height: number;
  isPresented: boolean;
  onDismiss: () => void;
  snapPoints?: SnapPoint[];
}>;

export function AgendaBottomSheet({
  backgroundColor,
  children,
  height,
  isPresented,
  onDismiss,
  snapPoints,
}: Props) {
  const theme = useAppTheme();

  if (Platform.OS === 'ios') {
    return (
      <IosAgendaBottomSheet
        backgroundColor={backgroundColor ?? theme.background}
        height={height}
        isPresented={isPresented}
        onDismiss={onDismiss}
        snapPoints={snapPoints}
      >
        {children}
      </IosAgendaBottomSheet>
    );
  }

  const sheetBg = backgroundColor ?? theme.background;
  const resolvedSnapPoints = snapPoints ?? ['half', 'full'];
  return (
    <BottomSheet isPresented={isPresented} onDismiss={onDismiss} snapPoints={resolvedSnapPoints}>
      <RNHostView style={{ width: '100%', height, backgroundColor: sheetBg }}>
        <View collapsable={false} style={[styles.host, { backgroundColor: sheetBg }]}>
          {children}
        </View>
      </RNHostView>
    </BottomSheet>
  );
}

function toDetent(point: SnapPoint): PresentationDetent {
  if (point === 'half') return 'medium';
  if (point === 'full') return 'large';
  return point;
}

function isFullDetent(detent: PresentationDetent): boolean {
  return detent === 'large';
}

function IosAgendaBottomSheet({
  backgroundColor,
  children,
  height,
  isPresented,
  onDismiss,
  snapPoints,
}: Props) {
  const theme = useAppTheme();
  const fullBg = backgroundColor ?? theme.background;
  const hostHeight = Dimensions.get('window').height;
  const detents = useMemo(
    () =>
      snapPoints && snapPoints.length > 0
        ? snapPoints.map(toDetent)
        : (['medium', 'large'] as PresentationDetent[]),
    [snapPoints],
  );
  const initialDetent = detents[0] ?? 'medium';
  const [selection, setSelection] = useState<PresentationDetent>(initialDetent);

  useEffect(() => {
    if (!isPresented) return;
    const timeout = setTimeout(() => {
      setSelection(initialDetent);
    }, 100);
    return () => clearTimeout(timeout);
  }, [initialDetent, isPresented]);

  const expanded = isFullDetent(selection);
  const surfaceBg = expanded ? fullBg : 'transparent';

  return (
    <SwiftUIHost style={{ position: 'absolute' }} pointerEvents="none">
      <SwiftUIBottomSheet
        isPresented={isPresented}
        onIsPresentedChange={(presented) => {
          if (!presented) onDismiss();
        }}
      >
        <Group
          modifiers={[
            frame({ maxWidth: Infinity, alignment: 'topLeading' }),
            padding({ top: 8, leading: 16, trailing: 16, bottom: 0 }),
            presentationDragIndicator('visible'),
            presentationDetents([...detents], {
              selection,
              onSelectionChange: setSelection,
            }),
            ...(expanded ? [presentationBackground(fullBg)] : []),
          ]}
        >
          <SwiftUIRNHostView matchContents={false}>
            <View
              collapsable={false}
              style={[
                styles.host,
                {
                  width: '100%',
                  height: Math.max(height, hostHeight * 0.55),
                  backgroundColor: surfaceBg,
                },
              ]}
            >
              {children}
            </View>
          </SwiftUIRNHostView>
        </Group>
      </SwiftUIBottomSheet>
    </SwiftUIHost>
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
    <View style={styles.header}>
      <Text pointerEvents="none" style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerBar}>
        {Platform.OS === 'ios' ? (
          <SwiftUIHost
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
          </SwiftUIHost>
        ) : (
          <Pressable
            accessibilityLabel={cancelLabel}
            onPress={onCancel}
            style={[styles.side, styles.iconButton, { backgroundColor: theme.section }]}
          >
            <Icon name="close" size={18} color={theme.text} />
          </Pressable>
        )}
        <View style={styles.sideSpacer} />
        {Platform.OS === 'ios' ? (
          <SwiftUIHost
            colorScheme={colorScheme}
            ignoreSafeArea="all"
            matchContents
            seedColor={accent}
            style={styles.side}
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
          </SwiftUIHost>
        ) : (
          <Pressable
            accessibilityLabel={action?.label}
            disabled={!action || action.disabled}
            onPress={action?.onPress}
            style={[
              styles.side,
              styles.iconButton,
              {
                backgroundColor: action?.disabled ? theme.section : theme.primary,
                opacity: action ? (action.disabled ? 0.4 : 1) : 0,
              },
            ]}
          >
            {action?.icon === 'add' ? (
              <Icon name="add" size={20} color={theme.onPrimary} />
            ) : (
              <Icon name="check" size={20} color={theme.onPrimary} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  header: {
    height: layout.headerHeight,
    justifyContent: 'center',
  },
  headerBar: {
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
  iconButton: {
    borderRadius: 22,
  },
  sideSpacer: { flex: 1 },
  title: {
    ...StyleSheet.absoluteFill,
    textAlign: 'center',
    textAlignVertical: 'center',
    ...type.sheetTitle,
    lineHeight: layout.headerHeight,
  },
});
