import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { triggerHaptic } from '@/lib/haptics';
import { motion } from '@/theme/motion';

export const PULL_ADD_THRESHOLD = 64;
export const PULL_ADD_MAX = 112;

type Options = {
  onShiftDay: (delta: number) => void;
  onPullAdd: () => void;
  /** Master kill (e.g. finger drawing active). */
  gesturesEnabled?: boolean;
  /** Horizontal swipe between days. */
  swipeToChangeDay?: boolean;
  /** Pull down at top to open quick add. */
  pullDownToAdd?: boolean;
};

/**
 * Planner scroll + day-swipe + pull-to-add.
 *
 * A single simultaneous composition keeps native scrolling, horizontal day
 * navigation, and Android pull-to-add on the UI thread without making one
 * recognizer wait for another to fail.
 */
export function usePlannerGestures({
  onShiftDay,
  onPullAdd,
  gesturesEnabled = true,
  swipeToChangeDay = true,
  pullDownToAdd = true,
}: Options) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const pullY = useSharedValue(0);
  const pullArmed = useSharedValue(false);
  const wasRubberBanding = useSharedValue(false);
  const isAtTopSV = useSharedValue(true);
  const touchStartX = useSharedValue(0);
  const touchStartY = useSharedValue(0);

  const hapticJS = useCallback((type: 'selection' | 'medium') => {
    triggerHaptic(type);
  }, []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      isAtTopSV.set(y <= 4);

      if (Platform.OS === 'ios' && pullDownToAdd && y < 0) {
        wasRubberBanding.set(true);
        const next = Math.min(-y, PULL_ADD_MAX);
        pullY.set(next);
        const armed = next >= PULL_ADD_THRESHOLD;
        if (armed !== pullArmed.get()) {
          pullArmed.set(armed);
          if (armed) runOnJS(hapticJS)('selection');
        }
      } else if (wasRubberBanding.get() && y >= 0) {
        wasRubberBanding.set(false);
        pullY.set(withSpring(0, motion.settle));
        pullArmed.set(false);
      }
    },
  });

  const onScrollEndDrag = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (!pullDownToAdd || Platform.OS !== 'ios') return;
      if (event.nativeEvent.contentOffset.y <= -PULL_ADD_THRESHOLD) {
        onPullAdd();
      }
    },
    [onPullAdd, pullDownToAdd],
  );

  const makeDaySwipe = useCallback(() => {
    return Gesture.Pan()
      .enabled(gesturesEnabled && swipeToChangeDay)
      .maxPointers(1)
      .averageTouches(true)
      .activeOffsetX([-20, 20])
      .failOffsetY([-16, 16])
      .onEnd((event) => {
        const wentLeft = event.translationX <= -44 || event.velocityX < -520;
        const wentRight = event.translationX >= 44 || event.velocityX > 520;
        if (wentLeft) runOnJS(onShiftDay)(1);
        else if (wentRight) runOnJS(onShiftDay)(-1);
      });
  }, [gesturesEnabled, onShiftDay, swipeToChangeDay]);

  /** Android pull uses manual activation so vertical scrolling remains native. */
  const scrollGesture = useMemo(() => {
    const nativeScroll = Gesture.Native();
    const daySwipe = makeDaySwipe();
    if (Platform.OS !== 'android') {
      return Gesture.Simultaneous(nativeScroll, daySwipe);
    }

    const pullAdd = Gesture.Pan()
      .enabled(gesturesEnabled && pullDownToAdd)
      .maxPointers(1)
      .averageTouches(true)
      .manualActivation(true)
      .onTouchesDown((event) => {
        const t = event.allTouches[0];
        if (!t) return;
        touchStartX.set(t.absoluteX);
        touchStartY.set(t.absoluteY);
      })
      .onTouchesMove((event, state) => {
        if (!isAtTopSV.get()) {
          state.fail();
          return;
        }
        const t = event.allTouches[0];
        if (!t) {
          state.fail();
          return;
        }
        const dx = t.absoluteX - touchStartX.get();
        const dy = t.absoluteY - touchStartY.get();
        if (Math.abs(dx) > 14) {
          state.fail();
          return;
        }
        // Finger up → let the ScrollView scroll the list.
        if (dy < -8) {
          state.fail();
          return;
        }
        if (dy > 10) {
          state.activate();
        }
      })
      .onUpdate((event) => {
        if (event.translationY <= 0) {
          pullY.set(0);
          pullArmed.set(false);
          return;
        }
        const raw = event.translationY;
        const next = Math.min(raw * 0.72 - raw * raw * 0.00035, PULL_ADD_MAX);
        pullY.set(Math.max(0, next));
        const armed = pullY.get() >= PULL_ADD_THRESHOLD;
        if (armed !== pullArmed.get()) {
          pullArmed.set(armed);
          if (armed) runOnJS(hapticJS)('selection');
        }
      })
      .onEnd(() => {
        if (pullArmed.get()) runOnJS(onPullAdd)();
      })
      .onFinalize(() => {
        pullY.set(withSpring(0, motion.settle));
        pullArmed.set(false);
      });

    return Gesture.Simultaneous(nativeScroll, pullAdd, daySwipe);
  }, [
    gesturesEnabled,
    hapticJS,
    isAtTopSV,
    makeDaySwipe,
    onPullAdd,
    pullDownToAdd,
    pullArmed,
    pullY,
    touchStartX,
    touchStartY,
  ]);

  const pullContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Platform.OS === 'android' ? pullY.get() : 0 }],
  }));

  const pullHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pullY.get(), [8, 26], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          pullY.get(),
          [0, PULL_ADD_THRESHOLD],
          [-8, 12],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(pullY.get(), [0, PULL_ADD_THRESHOLD], [0.92, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  const pullLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      pullY.get(),
      [PULL_ADD_THRESHOLD - 14, PULL_ADD_THRESHOLD],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const releaseLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      pullY.get(),
      [PULL_ADD_THRESHOLD - 14, PULL_ADD_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          pullY.get(),
          [PULL_ADD_THRESHOLD - 14, PULL_ADD_THRESHOLD],
          [0.96, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return {
    scrollRef,
    scrollGesture,
    onScroll,
    onScrollEndDrag,
    pullContentStyle,
    pullHintStyle,
    pullLabelStyle,
    releaseLabelStyle,
  };
}
