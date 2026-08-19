import { type ColorValue, Platform } from 'react-native';

export type AppearanceMode = 'light' | 'dark' | 'lightHighContrast' | 'darkHighContrast';

type ModeValues = Record<AppearanceMode, string>;

export const categoryColorValues = {
  red: {
    light: '#C4514A',
    dark: '#F07C74',
    lightHighContrast: '#A83934',
    darkHighContrast: '#FF9B94',
  },
  orange: {
    light: '#C56B32',
    dark: '#E9955E',
    lightHighContrast: '#9B4B19',
    darkHighContrast: '#FFB17D',
  },
  yellow: {
    light: '#A67C24',
    dark: '#D8B45A',
    lightHighContrast: '#7B590D',
    darkHighContrast: '#F2D27F',
  },
  green: {
    light: '#4F7F62',
    dark: '#79AD8A',
    lightHighContrast: '#315E43',
    darkHighContrast: '#9DCCAA',
  },
  mint: {
    light: '#3D857B',
    dark: '#72B6AA',
    lightHighContrast: '#246158',
    darkHighContrast: '#98D3C8',
  },
  teal: {
    light: '#397D86',
    dark: '#6BAAB3',
    lightHighContrast: '#205A63',
    darkHighContrast: '#91C9D0',
  },
  cyan: {
    light: '#397C9B',
    dark: '#70A9C3',
    lightHighContrast: '#205977',
    darkHighContrast: '#98C8DD',
  },
  blue: {
    light: '#456F9A',
    dark: '#78A0C9',
    lightHighContrast: '#294F76',
    darkHighContrast: '#9CBEE0',
  },
  indigo: {
    light: '#655F91',
    dark: '#918ABC',
    lightHighContrast: '#49436F',
    darkHighContrast: '#B5AED9',
  },
  purple: {
    light: '#845B85',
    dark: '#B387B2',
    lightHighContrast: '#633D64',
    darkHighContrast: '#D1A8CF',
  },
  pink: {
    light: '#A95570',
    dark: '#D17F99',
    lightHighContrast: '#84374F',
    darkHighContrast: '#EFA3B9',
  },
  brown: {
    light: '#866750',
    dark: '#B49379',
    lightHighContrast: '#624731',
    darkHighContrast: '#D2B29A',
  },
} as const satisfies Record<string, ModeValues>;

export type CategoryColorName = keyof typeof categoryColorValues;

const categoryColorNames = Object.keys(categoryColorValues) as CategoryColorName[];

export const spaceColors: Record<CategoryColorName, string> = Object.fromEntries(
  categoryColorNames.map((name) => [name, categoryColorValues[name].light]),
) as Record<CategoryColorName, string>;

const neutralColorValues = {
  gray1: {
    light: '#77736C',
    dark: '#999B9C',
    lightHighContrast: '#59554F',
    darkHighContrast: '#B8BABC',
  },
  gray2: {
    light: '#9C978E',
    dark: '#777B7E',
    lightHighContrast: '#777169',
    darkHighContrast: '#929699',
  },
  gray3: {
    light: '#BBB4A9',
    dark: '#555B60',
    lightHighContrast: '#948C81',
    darkHighContrast: '#6B7175',
  },
  gray4: {
    light: '#D2C9BC',
    dark: '#3D444A',
    lightHighContrast: '#AFA497',
    darkHighContrast: '#50575D',
  },
  gray5: {
    light: '#E7DED1',
    dark: '#293037',
    lightHighContrast: '#D7CCBE',
    darkHighContrast: '#373F46',
  },
  gray6: {
    light: '#F1EADF',
    dark: '#1B2229',
    lightHighContrast: '#E9DFD1',
    darkHighContrast: '#242C33',
  },
} as const satisfies Record<string, ModeValues>;

export type AgendaTheme = {
  mode: AppearanceMode;
  isDark: boolean;
  isHighContrast: boolean;

  control: {
    fill: ColorValue;
    fillSecondary: ColorValue;
    fillQuaternary: ColorValue;
    pressed: ColorValue;
  };

  category: Record<CategoryColorName, ColorValue>;
  overlay: ColorValue;

  background: string;
  section: string;
  card: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  placeholder: string;

  primary: string;
  primarySoft: string;
  onPrimary: string;

  separator: string;
  border: string;
  input: string;

  warning: string;
  danger: string;

  floating: string;
  floatingText: string;
  floatingTextMuted: string;
};

export function rgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function foregroundForAccent(accentHex: string): '#000000' | '#FFFFFF' {
  const hex = accentHex.replace('#', '');

  if (!/^[\da-f]{6}$/i.test(hex)) {
    return '#FFFFFF';
  }

  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;

    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;

  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

export function softAlpha(mode: AppearanceMode): number {
  switch (mode) {
    case 'darkHighContrast':
      return 0.28;

    case 'lightHighContrast':
      return 0.2;

    case 'dark':
      return 0.18;

    case 'light':
      return 0.12;
  }
}

export function resolveAppearanceMode(
  colorScheme: 'light' | 'dark',
  highContrast: boolean,
): AppearanceMode {
  if (colorScheme === 'dark') {
    return highContrast ? 'darkHighContrast' : 'dark';
  }

  return highContrast ? 'lightHighContrast' : 'light';
}

function createTheme(mode: AppearanceMode): AgendaTheme {
  const isDark = mode === 'dark' || mode === 'darkHighContrast';

  const isHighContrast = mode === 'lightHighContrast' || mode === 'darkHighContrast';

  const useNativePalette = Platform.OS === 'ios' || Platform.OS === 'android';

  const primaryReference = categoryColorValues.indigo[mode];

  const onPrimary = foregroundForAccent(primaryReference);

  const primarySoft = rgba(primaryReference, softAlpha(mode));

  const category = Object.fromEntries(
    categoryColorNames.map((name) => [name, categoryColorValues[name][mode]]),
  ) as Record<CategoryColorName, ColorValue>;

  const text = useNativePalette ? (isDark ? '#FFFFFF' : '#1C1C1E') : isDark ? '#F3F0EA' : '#27231F';

  const textSecondary = useNativePalette
    ? isDark
      ? '#A1A1A6'
      : '#636366'
    : isDark
      ? '#B0AFAB'
      : '#6E675F';

  const textTertiary = useNativePalette
    ? isDark
      ? '#7C7C80'
      : '#8E8E93'
    : isDark
      ? '#85888A'
      : '#928A80';

  const background = useNativePalette
    ? isDark
      ? '#000000'
      : '#F2F2F7'
    : isDark
      ? '#10161C'
      : '#F8F4EC';

  const section = useNativePalette
    ? isDark
      ? '#1C1C1E'
      : '#FFFFFF'
    : neutralColorValues.gray6[mode];

  const card = useNativePalette
    ? isDark
      ? '#2C2C2E'
      : '#FFFFFF'
    : isDark
      ? neutralColorValues.gray5[mode]
      : '#FFFDF8';

  const fillBase = useNativePalette
    ? isDark
      ? '#FFFFFF'
      : '#000000'
    : isDark
      ? '#AAB0B4'
      : '#6E675F';

  const alphaBoost = isHighContrast ? 0.06 : 0;

  const separator = useNativePalette
    ? isDark
      ? '#38383A'
      : '#C6C6C8'
    : isDark
      ? '#30383F'
      : '#DDD4C7';

  const input = rgba(fillBase, 0.12 + alphaBoost);

  const warning = categoryColorValues.orange[mode];

  const danger = categoryColorValues.red[mode];

  return {
    mode,
    isDark,
    isHighContrast,

    control: {
      fill: rgba(fillBase, 0.2 + alphaBoost),
      fillSecondary: rgba(fillBase, 0.16 + alphaBoost),
      fillQuaternary: rgba(fillBase, 0.08 + alphaBoost),
      pressed: rgba(primaryReference, softAlpha(mode) + 0.08),
    },

    category,

    overlay: rgba('#000000', isDark ? 0.55 : 0.25),

    background,
    section,
    card,

    text,
    textSecondary,
    textTertiary,
    placeholder: textTertiary,

    primary: primaryReference,
    primarySoft,
    onPrimary,

    separator,
    border: neutralColorValues.gray4[mode],
    input,

    warning,
    danger,

    floating: useNativePalette
      ? isDark
        ? rgba('#1C1C1E', 0.86)
        : rgba('#FFFFFF', 0.86)
      : isDark
        ? rgba('#06090C', 0.72)
        : rgba('#27231F', 0.72),

    floatingText: useNativePalette && !isDark ? '#1C1C1E' : '#FFFFFF',

    floatingTextMuted: useNativePalette && !isDark ? rgba('#1C1C1E', 0.58) : rgba('#FFFFFF', 0.65),
  };
}

export function withBrandAccent(
  theme: AgendaTheme,
  accentHex: string,
  mode: AppearanceMode = theme.mode,
): AgendaTheme {
  return {
    ...theme,

    control: {
      ...theme.control,
      pressed: rgba(accentHex, softAlpha(mode) + 0.08),
    },

    primary: accentHex,

    primarySoft: rgba(accentHex, softAlpha(mode)),

    onPrimary: foregroundForAccent(accentHex),
  };
}

export const lightTheme = createTheme('light');

export const darkTheme = createTheme('dark');

export const lightHighContrastTheme = createTheme('lightHighContrast');

export const darkHighContrastTheme = createTheme('darkHighContrast');

export const themes: Record<AppearanceMode, AgendaTheme> = {
  light: lightTheme,
  dark: darkTheme,
  lightHighContrast: lightHighContrastTheme,
  darkHighContrast: darkHighContrastTheme,
};
