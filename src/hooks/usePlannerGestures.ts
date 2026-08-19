import { useCallback, useMemo } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { triggerHaptic } from '@/lib/haptics';
import { motion } from '@/theme/motion';

export const PULL_ADD_THRESHOLD = 64;
export const PULL_ADD_MAX = 112;

const IS_IOS = Platform.OS === 'ios';
const IS_ANDROID = Platform.OS === 'android';

const TOP_TOLERANCE = 4;
const SWIPE_DISTANCE = 44;
const SWIPE_VELOCITY = 520;
const SWIPE_ACTIVE_OFFSET = 20;
const SWIPE_FAIL_OFFSET = 16;
const PULL_HORIZONTAL_TOLERANCE = 14;
const PULL_UP_CANCEL_DISTANCE = 8;
const PULL_ACTIVATION_DISTANCE = 10;

type PlannerGestureOptions = {
  onShiftDay: (delta: number) => void;
  onPullAdd: () => void;
  gesturesEnabled?: boolean;
  swipeToChangeDay?: boolean;
  pullDownToAdd?: boolean;
};

export function usePlannerGestures({
  onShiftDay,
  onPullAdd,
  gesturesEnabled = true,
  swipeToChangeDay = true,
  pullDownToAdd = true,
}: PlannerGestureOptions) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  const pullY = useSharedValue(0);
  const pullArmed = useSharedValue(false);
  const isRubberBanding = useSharedValue(false);
  const isAtTop = useSharedValue(true);
  const restingOffsetY = useSharedValue<number | null>(null);

  const touchStartX = useSharedValue(0);
  const touchStartY = useSharedValue(0);

  const triggerSelectionHaptic = useCallback(() => {
    triggerHaptic('selection');
  }, []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (IS_IOS && restingOffsetY.get() === null) {
        restingOffsetY.set(event.contentOffset.y);
      }

      const offsetY = event.contentOffset.y - (restingOffsetY.get() ?? 0);

      isAtTop.set(offsetY <= TOP_TOLERANCE);

      if (IS_IOS && pullDownToAdd && offsetY < 0) {
        isRubberBanding.set(true);

        const distance = Math.min(-offsetY, PULL_ADD_MAX);

        pullY.set(distance);

        const armed = distance >= PULL_ADD_THRESHOLD;

        if (armed !== pullArmed.get()) {
          pullArmed.set(armed);

          if (armed) {
            scheduleOnRN(triggerSelectionHaptic);
          }
        }

        return;
      }

      if (isRubberBanding.get() && offsetY >= 0) {
        isRubberBanding.set(false);
        pullY.set(withSpring(0, motion.settle));
        pullArmed.set(false);
      }
    },
  });

  const onScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!IS_IOS || !pullDownToAdd) {
        return;
      }

      const offsetY = event.nativeEvent.contentOffset.y - (restingOffsetY.get() ?? 0);

      if (offsetY <= -PULL_ADD_THRESHOLD) {
        onPullAdd();
      }

      isRubberBanding.set(false);
      pullY.set(withSpring(0, motion.settle));
      pullArmed.set(false);
    },
    [isRubberBanding, onPullAdd, pullArmed, pullDownToAdd, pullY, restingOffsetY],
  );

  const daySwipe = useMemo(
    () =>
      Gesture.Pan()
        .enabled(gesturesEnabled && swipeToChangeDay)
        .maxPointers(1)
        .averageTouches(true)
        .activeOffsetX([-SWIPE_ACTIVE_OFFSET, SWIPE_ACTIVE_OFFSET])
        .failOffsetY([-SWIPE_FAIL_OFFSET, SWIPE_FAIL_OFFSET])
        .onEnd((event) => {
          const wentLeft =
            event.translationX <= -SWIPE_DISTANCE || event.velocityX < -SWIPE_VELOCITY;

          const wentRight =
            event.translationX >= SWIPE_DISTANCE || event.velocityX > SWIPE_VELOCITY;

          if (wentLeft) {
            scheduleOnRN(onShiftDay, 1);
          } else if (wentRight) {
            scheduleOnRN(onShiftDay, -1);
          }
        }),
    [gesturesEnabled, onShiftDay, swipeToChangeDay],
  );

  const scrollGesture = useMemo(() => {
    const nativeScroll = Gesture.Native();

    if (!IS_ANDROID) {
      return Gesture.Simultaneous(nativeScroll, daySwipe);
    }

    const pullAdd = Gesture.Pan()
      .enabled(gesturesEnabled && pullDownToAdd)
      .maxPointers(1)
      .averageTouches(true)
      .manualActivation(true)
      .onTouchesDown((event) => {
        const touch = event.allTouches[0];

        if (!touch) {
          return;
        }

        touchStartX.set(touch.absoluteX);
        touchStartY.set(touch.absoluteY);
      })
      .onTouchesMove((event, state) => {
        if (!isAtTop.get()) {
          state.fail();
          return;
        }

        const touch = event.allTouches[0];

        if (!touch) {
          state.fail();
          return;
        }

        const deltaX = touch.absoluteX - touchStartX.get();

        const deltaY = touch.absoluteY - touchStartY.get();

        if (Math.abs(deltaX) > PULL_HORIZONTAL_TOLERANCE) {
          state.fail();
          return;
        }

        if (deltaY < -PULL_UP_CANCEL_DISTANCE) {
          state.fail();
          return;
        }

        if (deltaY > PULL_ACTIVATION_DISTANCE) {
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

        const distance = Math.min(raw * 0.72 - raw * raw * 0.00035, PULL_ADD_MAX);

        const next = Math.max(0, distance);

        pullY.set(next);

        const armed = next >= PULL_ADD_THRESHOLD;

        if (armed !== pullArmed.get()) {
          pullArmed.set(armed);

          if (armed) {
            scheduleOnRN(triggerSelectionHaptic);
          }
        }
      })
      .onEnd(() => {
        if (pullArmed.get()) {
          scheduleOnRN(onPullAdd);
        }
      })
      .onFinalize(() => {
        pullY.set(withSpring(0, motion.settle));
        pullArmed.set(false);
      });

    return Gesture.Simultaneous(nativeScroll, pullAdd, daySwipe);
  }, [
    daySwipe,
    gesturesEnabled,
    isAtTop,
    onPullAdd,
    pullArmed,
    pullDownToAdd,
    pullY,
    touchStartX,
    touchStartY,
    triggerSelectionHaptic,
  ]);

  const pullContentStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: IS_ANDROID ? pullY.get() : 0,
      },
    ],
  }));

  const pullHintStyle = useAnimatedStyle(() => {
    const distance = pullY.get();

    return {
      opacity: interpolate(distance, [8, 26], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(distance, [0, PULL_ADD_THRESHOLD], [-8, 12], Extrapolation.CLAMP),
        },
        {
          scale: interpolate(distance, [0, PULL_ADD_THRESHOLD], [0.92, 1], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const pullLabelStyle = useAnimatedStyle(() => {
    const distance = pullY.get();

    return {
      opacity: interpolate(
        distance,
        [PULL_ADD_THRESHOLD - 14, PULL_ADD_THRESHOLD],
        [1, 0],
        Extrapolation.CLAMP,
      ),
    };
  });

  const releaseLabelStyle = useAnimatedStyle(() => {
    const distance = pullY.get();

    return {
      opacity: interpolate(
        distance,
        [PULL_ADD_THRESHOLD - 14, PULL_ADD_THRESHOLD],
        [0, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            distance,
            [PULL_ADD_THRESHOLD - 14, PULL_ADD_THRESHOLD],
            [0.96, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

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

export type PlannerGestures = ReturnType<typeof usePlannerGestures>;
