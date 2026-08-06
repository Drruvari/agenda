import { type ReactNode, useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { type HapticFeedback, triggerHaptic } from '@/lib/haptics';
import { motion } from '@/theme/motion';

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode | ((pressed: boolean) => ReactNode);
  haptic?: HapticFeedback;
  pressedStyle?: StyleProp<ViewStyle>;
  pressScale?: number;
  style?: StyleProp<ViewStyle>;
};

export function AnimatedPressable({
  children,
  disabled,
  haptic = 'light',
  onPressIn,
  onPressOut,
  pressedStyle,
  pressScale = motion.pressScale,
  style,
  ...props
}: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <ReanimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        setPressed(true);
        scale.set(withSpring(reduceMotion ? 1 : pressScale, motion.snappy));
        if (haptic) triggerHaptic(haptic);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        scale.set(withSpring(1, motion.snappy));
        onPressOut?.(event);
      }}
      style={[style, animatedStyle, pressed && pressedStyle]}
    >
      {typeof children === 'function' ? children(pressed) : children}
    </ReanimatedPressable>
  );
}
