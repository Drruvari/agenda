import type { RefObject } from 'react';
import { StyleSheet, type View as NativeView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { BlurSurface } from '@/components/ui/BlurSurface';
import { Icon } from '@/components/ui/Icon';
import { type AgendaTheme, spacing, useThemeStyles } from '@/theme';

type Props = {
  onAdd: () => void;
  onSearch: () => void;
  onMore?: () => void;
  addLabel?: string;
  blurTarget?: RefObject<NativeView | null>;
  bottom?: number;
};

/** Floating action dock with a centered primary action. */
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
        {onMore ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Open Library"
            onPress={onMore}
            pressedStyle={styles.pressedSoft}
            style={styles.iconHit}
          >
            <Icon name="more" size={21} color={theme.floatingTextMuted} stroke={1.9} />
          </AnimatedPressable>
        ) : (
          <View style={styles.iconHit} />
        )}

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={addLabel}
          haptic="medium"
          onPress={onAdd}
          pressScale={0.94}
          style={[styles.addHit, { backgroundColor: theme.primary }]}
        >
          <Icon name="add" size={24} color={theme.onPrimary} stroke={2.5} />
        </AnimatedPressable>

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Search"
          onPress={onSearch}
          pressedStyle={styles.pressedSoft}
          style={styles.iconHit}
        >
          <Icon name="search" size={21} color={theme.floatingText} stroke={1.9} />
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
      width: 224,
    },
    dockContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 7,
    },
    addHit: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOpacity: 0.42,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 5,
    },
    iconHit: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressedSoft: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  });
}
