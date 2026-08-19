import { useEffect } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const MARK_PATH =
  'M27.8185 0.00772336C30.0554 -0.148696 32.7319 2.07084 35.8478 6.66593C36.9317 8.26559 38.6246 11.6203 40.9259 16.7294C43.2273 21.8386 45.1941 26.0729 46.8263 29.4316C48.4585 32.7903 50.2584 36.8076 52.2257 41.4833C54.221 46.1263 55.637 49.2105 56.4728 50.7362C57.3366 52.2295 58.7705 53.6223 60.7745 54.914C62.7786 56.2056 63.8175 57.3822 63.8917 58.4433C63.9636 59.4738 63.3615 60.2016 62.0851 60.6259C60.0049 61.2892 54.7775 61.9134 46.4044 62.4989C42.5963 62.7651 40.6345 62.0799 40.5197 60.4433C40.49 60.0189 40.72 58.9663 41.2101 57.287C41.698 55.5778 41.9145 54.3291 41.8595 53.5409C41.6462 50.4905 40.8629 47.8779 39.5111 45.7022C39.313 45.3834 39.5857 44.9364 39.9611 44.9364C43.2747 44.9364 45.961 42.25 45.9611 38.9364C45.9611 35.6227 43.2748 32.9364 39.9611 32.9364C37.8285 32.9365 34.7027 32.2013 33.8733 30.2366C33.1434 28.5078 32.1988 26.3989 31.0392 23.9101C28.0056 17.3994 25.1952 17.637 23.1075 24.5097C21.0066 31.389 19.9941 35.3754 20.0704 36.4667L20.1017 36.9208C20.1273 37.2845 21.5465 37.3683 24.3575 37.1718L29.5714 36.8075C30.4059 36.7492 31.1557 36.6866 31.8207 36.6201C32.9364 36.5084 33.9611 37.8151 33.9611 38.9364C33.9611 39.1361 33.9709 39.3335 33.99 39.5281C34.1235 40.8888 32.9353 43.1516 31.5714 43.247C24.5288 43.7394 20.5544 44.2463 19.6486 44.7665C18.7735 45.2847 17.9162 46.5021 17.0783 48.4189C16.2705 50.3336 15.9221 52.0798 16.0324 53.6562C16.1426 55.2324 16.6848 56.9005 17.6583 58.6601C18.6621 60.4176 19.1995 61.812 19.2716 62.8427C19.3605 64.1158 18.0449 64.8478 15.3243 65.038C8.85545 65.4903 4.51099 65.4892 2.29212 65.0351C0.874451 64.7381 0.110417 63.8015 0.000127219 62.2255C-0.0147116 62.0133 1.26854 60.5979 3.84974 57.9804C5.26775 56.5409 6.35512 54.7135 7.11146 52.498C12.5492 36.4291 15.8996 24.8314 17.1632 17.706C18.4549 10.5482 19.6482 5.87956 20.7413 3.70108C21.8324 1.49268 23.7534 0.291894 26.504 0.0995202L27.8185 0.00772336ZM39.9611 34.9364C42.1702 34.9364 43.9611 36.7273 43.9611 38.9364C43.961 41.1455 42.1702 42.9364 39.9611 42.9364C37.752 42.9364 35.9611 41.1455 35.9611 38.9364C35.9611 36.7273 37.7519 34.9364 39.9611 34.9364Z';

type Props = {
  size?: number;
  color?: string;
  spin?: boolean;
};

export function AgendaLogo({ size = 24, color = '#000000', spin = false }: Props) {
  const rotation = useSharedValue(0);
  const frame = PixelRatio.roundToNearestPixel(size);

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
    <Svg width={frame} height={frame} viewBox="0 0 64 66">
      <Path d={MARK_PATH} fill={color} fillRule="evenodd" />
    </Svg>
  );

  if (!spin) return mark;

  return (
    <View collapsable={false} style={[styles.frame, { width: frame, height: frame }]}>
      <Animated.View collapsable={false} style={spinStyle}>
        {mark}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
