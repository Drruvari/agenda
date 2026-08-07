import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  runOnUI,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { triggerHaptic } from '@/lib/haptics';
import { motion } from '@/theme/motion';

export const PULL_ADD_THRESHOLD = 72;
export const PULL_ADD_MAX = 120;

type Options = {
  onShiftDay: (delta: number) => void;
  onPullAdd: () => void;
  /** When false, day-swipe / pull-add gestures are disabled (e.g. finger drawing). */
  gesturesEnabled?: boolean;
};

export function usePlannerGestures({
  onShiftDay,
  onPullAdd,
  gesturesEnabled = true,
}: Options) {
  const [isAtTop, setIsAtTop] = useState(true);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const pullY = useSharedValue(0);
  const pullArmed = useSharedValue(false);
  const wasAtTop = useSharedValue(true);
  const wasRubberBanding = useSharedValue(false);

  const hapticJS = useCallback((type: 'selection' | 'medium') => {
    triggerHaptic(type);
  }, []);

  const syncAtTop = useCallback((atTop: boolean) => {
    setIsAtTop(atTop);
  }, []);

  const settlePull = () => {
    'worklet';
    pullY.value = withSpring(0, motion.settle);
    pullArmed.value = false;
  };

  const scrollBy = useCallback(
    (delta: number) => {
      if (delta <= 0) return;
      runOnUI(() => {
        'worklet';
        scrollTo(scrollRef, 0, Math.max(0, scrollY.value + delta), false);
      })();
    },
    [scrollRef, scrollY],
  );

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      scrollY.value = y;
      const atTop = y <= 4;
      if (atTop !== wasAtTop.value) {
        wasAtTop.value = atTop;
        runOnJS(syncAtTop)(atTop);
      }

      if (Platform.OS === 'ios' && y < 0) {
        wasRubberBanding.value = true;
        const next = Math.min(-y, PULL_ADD_MAX);
        pullY.value = next;
        const armed = next >= PULL_ADD_THRESHOLD;
        if (armed !== pullArmed.value) {
          pullArmed.value = armed;
          if (armed) runOnJS(hapticJS)('selection');
        }
      } else if (wasRubberBanding.value && y >= 0) {
        wasRubberBanding.value = false;
        settlePull();
      }
    },
  });

  const onScrollEndDrag = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (Platform.OS !== 'ios') return;
      if (event.nativeEvent.contentOffset.y <= -PULL_ADD_THRESHOLD) {
        onPullAdd();
      }
    },
    [onPullAdd],
  );

  const composedGesture = useMemo(() => {
    const daySwipe = Gesture.Pan()
      .enabled(gesturesEnabled)
      .maxPointers(1)
      // High horizontal threshold so vertical taps on rows aren't claimed on iOS.
      .activeOffsetX([-72, 72])
      .failOffsetY([-18, 18])
      .onEnd((event) => {
        const wentLeft = event.translationX <= -52 || event.velocityX < -650;
        const wentRight = event.translationX >= 52 || event.velocityX > 650;
        if (wentLeft) runOnJS(onShiftDay)(1);
        else if (wentRight) runOnJS(onShiftDay)(-1);
      });

    const pullAdd = Gesture.Pan()
      .enabled(gesturesEnabled && Platform.OS === 'android' && isAtTop)
      .maxPointers(1)
      .activeOffsetY(18)
      .failOffsetX([-24, 24])
      .onUpdate((event) => {
        if (event.translationY <= 0) {
          pullY.value = 0;
          pullArmed.value = false;
          return;
        }
        const raw = event.translationY;
        const next = Math.min(raw * 0.52 - raw * raw * 0.00035, PULL_ADD_MAX);
        pullY.value = Math.max(0, next);
        const armed = pullY.value >= PULL_ADD_THRESHOLD;
        if (armed !== pullArmed.value) {
          pullArmed.value = armed;
          if (armed) runOnJS(hapticJS)('selection');
        }
      })
      .onEnd(() => {
        if (pullArmed.value) runOnJS(onPullAdd)();
        settlePull();
      })
      .onFinalize(() => {
        if (pullY.value > 0) settlePull();
        else pullArmed.value = false;
      });

    return Gesture.Simultaneous(Gesture.Native(), Gesture.Exclusive(daySwipe, pullAdd));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pull shared values are stable
  }, [gesturesEnabled, hapticJS, isAtTop, onPullAdd, onShiftDay]);

  const pullContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Platform.OS === 'android' ? pullY.value : 0 }],
  }));

  const pullHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pullY.value, [8, 26], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          pullY.value,
          [0, PULL_ADD_THRESHOLD],
          [-8, 12],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(pullY.value, [0, PULL_ADD_THRESHOLD], [0.92, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  const pullLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      pullY.value,
      [PULL_ADD_THRESHOLD - 14, PULL_ADD_THRESHOLD],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const releaseLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      pullY.value,
      [PULL_ADD_THRESHOLD - 14, PULL_ADD_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          pullY.value,
          [PULL_ADD_THRESHOLD - 14, PULL_ADD_THRESHOLD],
          [0.96, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return {
    scrollRef,
    scrollBy,
    composedGesture,
    onScroll,
    onScrollEndDrag,
    pullContentStyle,
    pullHintStyle,
    pullLabelStyle,
    releaseLabelStyle,
  };
}
