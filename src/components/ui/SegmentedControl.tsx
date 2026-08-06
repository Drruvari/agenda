import { useEffect, useMemo } from 'react';
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { type AgendaTheme, continuousCorner, fonts, motion, useAppTheme } from '@/theme';

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

export function SegmentedControl<T extends string>({ options, value, onChange, style }: Props<T>) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reduceMotion = useReducedMotion();
  const segmentWidth = useSharedValue(0);
  const activeIndex = useSharedValue(
    Math.max(
      0,
      options.findIndex((option) => option.value === value),
    ),
  );
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  useEffect(() => {
    activeIndex.set(reduceMotion ? selectedIndex : withSpring(selectedIndex, motion.snappy));
  }, [activeIndex, reduceMotion, selectedIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segmentWidth.get(),
    transform: [{ translateX: activeIndex.get() * segmentWidth.get() }],
  }));

  return (
    <View
      onLayout={(event) => {
        segmentWidth.set((event.nativeEvent.layout.width - 6) / options.length);
      }}
      style={[styles.control, style]}
    >
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <AnimatedPressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            haptic="selection"
            key={option.value}
            onPress={() => {
              if (!active) onChange(option.value);
            }}
            pressedStyle={styles.pressed}
            style={styles.segment}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {option.label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    control: {
      flex: 1,
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 3,
      backgroundColor: theme.section,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.separator,
      ...continuousCorner(999),
    },
    segment: {
      flex: 1,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      ...continuousCorner(999),
    },
    indicator: {
      position: 'absolute',
      left: 3,
      top: 3,
      bottom: 3,
      backgroundColor: theme.card,
      ...continuousCorner(999),
      shadowColor: '#000000',
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    segmentText: {
      fontFamily: fonts.sansMedium,
      fontSize: 13,
      lineHeight: 16,
      letterSpacing: -0.1,
      color: theme.textSecondary,
    },
    segmentTextActive: {
      color: theme.text,
      fontFamily: fonts.sansSemi,
    },
    pressed: { opacity: 0.72 },
  });
}
