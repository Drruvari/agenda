import type { RefObject } from 'react';
import { StyleSheet, Text, type View as NativeView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { BlurSurface } from '@/components/ui/BlurSurface';
import { Icon } from '@/components/ui/Icon';
import { type AgendaTheme, fonts, spacing, useThemeStyles } from '@/theme';

type Props = {
  onAdd: () => void;
  onSearch: () => void;
  onMore?: () => void;
  addLabel?: string;
  blurTarget?: RefObject<NativeView | null>;
  bottom?: number;
};

/** Floating action dock — glass capsule with primary add + utility actions. */
export function BottomBar({
  onAdd,
  onSearch,
  onMore,
  addLabel = 'Add a task',
  blurTarget,
  bottom,
}: Props) {
  const { styles, theme } = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const offset = bottom ?? Math.max(insets.bottom + 10, spacing.md);

  return (
    <View style={[styles.wrap, { bottom: offset }]} pointerEvents="box-none">
      <BlurSurface
        blurTarget={blurTarget}
        intensity={85}
        overlayColor={theme.floating}
        tint="systemChromeMaterialDark"
        style={styles.dock}
        contentStyle={styles.dockContent}
      >
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={addLabel}
          haptic="medium"
          onPress={onAdd}
          pressScale={0.98}
          pressedStyle={styles.pressedSoft}
          style={styles.addHit}
        >
          <View style={[styles.addBadge, { backgroundColor: theme.primary }]}>
            <Icon name="add" size={18} color={theme.onPrimary} stroke={2.6} />
          </View>
          <Text style={styles.addLabel}>{addLabel}</Text>
        </AnimatedPressable>

        <View style={styles.divider} />

        {onMore ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="More actions"
            onPress={onMore}
            pressedStyle={styles.pressedSoft}
            style={styles.iconHit}
          >
            <Icon name="more" size={20} color={theme.floatingTextMuted} stroke={1.9} />
          </AnimatedPressable>
        ) : null}

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Search"
          onPress={onSearch}
          pressedStyle={styles.pressedSoft}
          style={styles.iconHit}
        >
          <Icon name="search" size={20} color={theme.floatingText} stroke={1.9} />
        </AnimatedPressable>
      </BlurSurface>
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      alignItems: 'center',
    },
    dock: {
      width: '100%',
      maxWidth: 360,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255, 255, 255, 0.16)',
    },
    dockContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 6,
      gap: 2,
    },
    addHit: {
      flex: 1,
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingLeft: 6,
      paddingRight: 10,
      borderRadius: 999,
    },
    addBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    addLabel: {
      flex: 1,
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      lineHeight: 20,
      letterSpacing: -0.2,
      color: theme.floatingText,
    },
    divider: {
      width: StyleSheet.hairlineWidth,
      height: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
      marginHorizontal: 4,
    },
    iconHit: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressedSoft: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  });
}
