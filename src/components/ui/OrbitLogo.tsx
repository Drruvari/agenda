import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';

const ARM = 'M12,12 C12,9.2 13.4,7.1 15.8,6.1 C17.6,5.35 19.5,5.5 21,6.5';

type Props = {
  size?: number;
  color?: string;
  stroke?: number;
  spin?: boolean;
};

export function OrbitLogo({ size = 24, color = '#000000', stroke = 1.7, spin = false }: Props) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!spin) {
      rotation.value = 0;
      return;
    }
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1100,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      false,
    );
  }, [rotation, spin]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const mark = (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        <Path d={ARM} />
        <Path d={ARM} transform="rotate(120 12 12)" />
        <Path d={ARM} transform="rotate(240 12 12)" />
      </G>
      <Circle cx={12} cy={12} r={1.3} fill={color} stroke="none" />
    </Svg>
  );

  if (!spin) {
    return mark;
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={spinStyle}>{mark}</Animated.View>
    </View>
  );
}
