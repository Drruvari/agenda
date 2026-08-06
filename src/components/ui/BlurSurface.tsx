import { type BlurTint, BlurView } from 'expo-blur';
import type { PropsWithChildren, RefObject } from 'react';
import {
  Platform,
  type StyleProp,
  StyleSheet,
  type View as NativeView,
  View,
  type ViewStyle,
} from 'react-native';

import { continuousCorner, continuousCornerBottom, radius, rgba, useAppAppearance } from '@/theme';

type Props = PropsWithChildren<{
  blurTarget?: RefObject<NativeView | null>;
  /** Uniform corner radius. Ignored when `borderBottomRadius` is set. */
  borderRadius?: number;
  /** Round only the bottom corners (sticky headers). */
  borderBottomRadius?: number;
  contentStyle?: StyleProp<ViewStyle>;
  elevated?: boolean;
  intensity?: number;
  overlayColor?: string;
  style?: StyleProp<ViewStyle>;
  tint?: BlurTint;
}>;

export function BlurSurface({
  blurTarget,
  borderRadius = 999,
  borderBottomRadius,
  children,
  contentStyle,
  elevated = true,
  intensity = 80,
  overlayColor,
  style,
  tint = 'dark',
}: Props) {
  const { colorScheme } = useAppAppearance();
  const cornerStyle =
    borderBottomRadius != null
      ? continuousCornerBottom(borderBottomRadius)
      : borderRadius === radius.pill
        ? { borderRadius }
        : continuousCorner(borderRadius);

  const useAndroidBlur = Platform.OS === 'android' && blurTarget != null;
  const isDark = colorScheme === 'dark';
  const resolvedTint = resolveTint(tint, useAndroidBlur, isDark);
  const androidScrim =
    useAndroidBlur && isDarkTint(resolvedTint) ? rgba('#000000', 0.42) : undefined;
  const scrim = overlayColor ?? androidScrim;

  return (
    <View style={[elevated ? styles.shadow : null, styles.clip, cornerStyle, style]}>
      <BlurView
        {...(useAndroidBlur
          ? {
              blurMethod: 'dimezisBlurView' as const,
              blurTarget,
              blurReductionFactor: 1,
            }
          : {})}
        intensity={intensity}
        tint={resolvedTint}
        style={[styles.blur, cornerStyle]}
      >
        {scrim ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]}
          />
        ) : null}
        <View style={contentStyle}>{children}</View>
      </BlurView>
    </View>
  );
}

function isDarkTint(tint: BlurTint): boolean {
  return (
    tint === 'dark' ||
    tint.endsWith('Dark') ||
    tint === 'systemThickMaterialDark' ||
    tint === 'systemChromeMaterialDark'
  );
}

function resolveTint(tint: BlurTint, android: boolean, isDark: boolean): BlurTint {
  if (!android) return tint;

  if (tint === 'dark' || tint === 'default' || tint === 'prominent' || tint === 'regular') {
    return isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight';
  }
  if (tint === 'light' || tint === 'extraLight') {
    return 'systemChromeMaterialLight';
  }
  return tint;
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  clip: {
    overflow: 'hidden',
  },
  blur: {
    overflow: 'hidden',
  },
});
