import { Platform } from 'react-native';

import { lightTheme } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
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
  return Platform.OS === 'ios' ? { ...style, borderCurve: 'continuous' } : style;
}

export function continuousCorner(value: number): ContinuousCornerStyle {
  return withContinuousCurve({ borderRadius: value });
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

export {
  type AgendaTheme,
  type AppearanceMode,
  type CategoryColorName,
  categoryColorValues,
  darkTheme,
  lightTheme,
  rgba,
  type SpaceColorName,
  spaceColors,
  themes,
} from './colors';

export const theme = lightTheme;

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
} as const;
