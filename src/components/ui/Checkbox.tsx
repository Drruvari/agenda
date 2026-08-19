import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, ReduceMotion, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Icon } from '@/components/ui/Icon';
import { useThemeStyles } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { motion } from '@/theme/motion';

const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
const checkEnter = ZoomIn.springify()
  .damping(motion.snappy.damping)
  .stiffness(motion.snappy.stiffness)
  .mass(motion.snappy.mass)
  .reduceMotion(ReduceMotion.System);
const checkExit = ZoomOut.duration(motion.duration.instant)
  .easing(easeOut)
  .reduceMotion(ReduceMotion.System);

type Props = {
  checked?: boolean;
  onPress?: () => void;
  clock?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Checkbox({ checked, onPress, clock, style }: Props) {
  const { styles, theme } = useThemeStyles(createStyles);
  const content = (
    <View style={[styles.box, checked && styles.checked, style]}>
      {checked ? (
        <Animated.View entering={checkEnter} exiting={checkExit} style={styles.fill} />
      ) : clock ? (
        <Icon name="clock" size={24} color={theme.border} />
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <AnimatedPressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      haptic="selection"
      onPress={onPress}
      hitSlop={6}
    >
      {content}
    </AnimatedPressable>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    box: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card,
    },
    checked: {
      borderColor: theme.primary,
      padding: 2,
    },
    fill: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.primary,
    },
  });
}
