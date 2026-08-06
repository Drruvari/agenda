import { useCallback, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/theme/motion';

const OUT_MS = motion.duration.fast;
const IN_MS = motion.duration.normal;
const easeOut = Easing.bezier(0.22, 1, 0.36, 1);

export function useDayTransition() {
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const slide = useSharedValue(0);
  const opacity = useSharedValue(1);
  const busy = useSharedValue(false);
  const hasMounted = useRef(false);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: slide.get() }],
  }));

  const run = useCallback(
    (direction: -1 | 0 | 1, commit: () => void) => {
      if (!hasMounted.current) {
        hasMounted.current = true;
        commit();
        return;
      }

      if (reduceMotion || direction === 0) {
        commit();
        return;
      }

      if (busy.get()) return;

      const exitX = direction > 0 ? -Math.min(36, width * 0.08) : Math.min(36, width * 0.08);
      const enterX = -exitX;

      busy.set(true);
      opacity.set(withTiming(0, { duration: OUT_MS, easing: easeOut }));
      slide.set(
        withTiming(exitX, { duration: OUT_MS, easing: easeOut }, (finished) => {
          if (!finished) {
            busy.set(false);
            return;
          }
          runOnJS(commit)();
          slide.set(enterX);
          opacity.set(0);
          opacity.set(withTiming(1, { duration: IN_MS, easing: easeOut }));
          slide.set(
            withSpring(0, motion.soft, () => {
              busy.set(false);
            }),
          );
        }),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable
    [reduceMotion, width],
  );

  return { style, run };
}
