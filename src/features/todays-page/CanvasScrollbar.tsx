import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useAppTheme } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';

type Props = {
  contentHeight: number;
  viewportHeight: number;
  scrollY: SharedValue<number>;
  onScrollTo: (y: number) => void;
};

const THUMB_MIN = 56;
const TRACK_INSET = 10;
const HIT_WIDTH = 44;

/**
 * Large, grabable scrollbar — drag the thumb or tap the track.
 */
export function CanvasScrollbar({ contentHeight, viewportHeight, scrollY, onScrollTo }: Props) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const trackHeight = useSharedValue(1);
  const dragStartScroll = useSharedValue(0);
  const active = useSharedValue(0);
  const [dragging, setDragging] = useState(false);

  const visible = contentHeight > viewportHeight + 12 && viewportHeight > 0;
  const maxScroll = Math.max(1, contentHeight - viewportHeight);

  const setDraggingJS = (value: boolean) => setDragging(value);

  const jumpToY = (localY: number) => {
    const usable = Math.max(1, trackHeight.value - TRACK_INSET * 2);
    const progress = Math.min(1, Math.max(0, (localY - TRACK_INSET) / usable));
    onScrollTo(progress * maxScroll);
    scrollY.value = progress * maxScroll;
  };

  const thumbStyle = useAnimatedStyle(() => {
    const usableTrack = Math.max(1, trackHeight.value - TRACK_INSET * 2);
    const thumbHeight = Math.max(
      THUMB_MIN,
      Math.min(1, viewportHeight / Math.max(viewportHeight, contentHeight)) * usableTrack,
    );
    const travel = Math.max(1, usableTrack - thumbHeight);
    const progress = Math.min(1, Math.max(0, scrollY.value / maxScroll));
    const scale = 1 + active.value * 0.08;
    return {
      height: thumbHeight,
      transform: [
        { translateY: TRACK_INSET + progress * travel },
        { scaleX: scale },
        { scaleY: scale },
      ],
      opacity: 0.55 + active.value * 0.35,
    };
  }, [contentHeight, maxScroll, scrollY, viewportHeight]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin(() => {
          dragStartScroll.value = scrollY.value;
          active.value = withSpring(1, { damping: 18, stiffness: 220 });
          scheduleOnRN(setDraggingJS, true);
        })
        .onUpdate((event) => {
          const usableTrack = Math.max(1, trackHeight.value - TRACK_INSET * 2);
          const thumbHeight = Math.max(
            THUMB_MIN,
            Math.min(1, viewportHeight / Math.max(viewportHeight, contentHeight)) * usableTrack,
          );
          const travel = Math.max(1, usableTrack - thumbHeight);
          const next = Math.min(
            maxScroll,
            Math.max(0, dragStartScroll.value + (event.translationY / travel) * maxScroll),
          );
          scrollY.value = next;
          scheduleOnRN(onScrollTo, next);
        })
        .onFinalize(() => {
          active.value = withSpring(0, { damping: 16, stiffness: 180 });
          scheduleOnRN(setDraggingJS, false);
        }),
    [
      active,
      contentHeight,
      dragStartScroll,
      maxScroll,
      onScrollTo,
      scrollY,
      trackHeight,
      viewportHeight,
    ],
  );

  if (!visible) return null;

  return (
    <View
      style={styles.track}
      pointerEvents="box-none"
      onLayout={(event) => {
        trackHeight.value = event.nativeEvent.layout.height;
      }}
    >
      <Pressable
        accessibilityLabel="Scroll page"
        accessibilityRole="adjustable"
        onPress={(event) => jumpToY(event.nativeEvent.locationY)}
        style={styles.trackHit}
      />
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.thumbHit, thumbStyle, dragging && styles.thumbHitActive]}
          accessibilityLabel="Scroll handle"
          accessibilityRole="adjustable"
        >
          <View style={[styles.thumb, dragging && styles.thumbActive]} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    track: {
      position: 'absolute',
      top: 4,
      bottom: 4,
      right: 0,
      width: HIT_WIDTH,
      zIndex: 8,
    },
    trackHit: {
      ...StyleSheet.absoluteFill,
    },
    thumbHit: {
      position: 'absolute',
      right: 6,
      width: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbHitActive: {
      right: 4,
      width: 24,
    },
    thumb: {
      width: 8,
      height: '100%',
      borderRadius: 999,
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.34)',
    },
    thumbActive: {
      width: 11,
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.5)',
    },
  });
}
