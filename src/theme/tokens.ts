import { Platform } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const layout = {
  screenPadding: 16,
  sectionGap: 24,
  sectionTitleGap: 8,
  rowHeight: 56,
  rowGap: 12,
  cardRadius: 16,
  controlRadius: 12,
  headerHeight: 56,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

type ContinuousCornerStyle = {
  borderRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  borderCurve?: 'continuous';
};

function withContinuousCurve(style: ContinuousCornerStyle): ContinuousCornerStyle {
  if (Platform.OS !== 'ios') {
    return style;
  }

  return {
    ...style,
    borderCurve: 'continuous',
  };
}

export function continuousCorner(value: number): ContinuousCornerStyle {
  return withContinuousCurve({
    borderRadius: value,
  });
}

export function continuousCornerBottom(value: number): ContinuousCornerStyle {
  return withContinuousCurve({
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: value,
    borderBottomRightRadius: value,
  });
}

export const typography = {
  caption: 12,
  label: 13,
  body: 16,
  title: 22,
  display: 34,
} as const;
