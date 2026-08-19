import { type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from '@/components/ui/Icon';
import { triggerHaptic } from '@/lib/haptics';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { fonts } from '@/theme/fonts';
import { motion } from '@/theme/motion';

const ACTION_WIDTH = 88;
const COMPLETE_THRESHOLD = 58;

type Props = PropsWithChildren<{
  enabled?: boolean;
  onComplete: () => void;
}>;

export function SwipeableRow({ children, enabled = true, onComplete }: Props) {
  const theme = useAppTheme();
  const translateX = useSharedValue(0);
  const thresholdReached = useSharedValue(false);

  const pan = Gesture.Pan()
    .enabled(enabled)
    .maxPointers(1)
    .activeOffsetX([-1000, 10])
    .failOffsetY([-18, 18])
    .onUpdate((event) => {
      translateX.value = Math.min(ACTION_WIDTH, Math.max(0, event.translationX));
      const reached = translateX.value >= COMPLETE_THRESHOLD;
      if (reached !== thresholdReached.value) {
        thresholdReached.value = reached;
        if (reached) scheduleOnRN(triggerHaptic, 'selection');
      }
    })
    .onEnd(() => {
      if (thresholdReached.value) scheduleOnRN(onComplete);
    })
    .onFinalize(() => {
      translateX.value = withSpring(0, motion.settle);
      thresholdReached.value = false;
    });

  const foregroundStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const actionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, COMPLETE_THRESHOLD], [0, 1], 'clamp'),
    transform: [
      { scale: interpolate(translateX.value, [0, COMPLETE_THRESHOLD], [0.8, 1], 'clamp') },
    ],
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.actionTrack, { backgroundColor: theme.primarySoft }]}>
        <Animated.View style={[styles.action, actionStyle]}>
          <Icon name="check" color={theme.primary} size={20} stroke={2.2} />
          <Text style={[styles.actionLabel, { color: theme.primary }]}>Done</Text>
        </Animated.View>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.foreground, { backgroundColor: theme.card }, foregroundStyle]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  actionTrack: {
    ...StyleSheet.absoluteFill,
  },
  action: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionLabel: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
  },
  foreground: {
    backgroundColor: '#FFFFFF',
  },
});
