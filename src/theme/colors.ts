import { type ColorValue, Platform } from 'react-native';

/** Four appearance modes — Light / Dark / Light HC / Dark HC. */
export type AppearanceMode = 'light' | 'dark' | 'lightHighContrast' | 'darkHighContrast';

export type ModeValues = Record<AppearanceMode, string>;

export function rgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Calendar / event / space category palette. */
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

/** @deprecated Prefer `CategoryColorName` — kept for space color pickers. */
export type SpaceColorName = CategoryColorName;

/** Light-mode category hexes for storing space colors. */
export const spaceColors: Record<CategoryColorName, string> = Object.fromEntries(
  (Object.keys(categoryColorValues) as CategoryColorName[]).map((name) => [
    name,
    categoryColorValues[name].light,
  ]),
) as Record<CategoryColorName, string>;

export const neutralColorValues = {
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

export type NeutralColorName = keyof typeof neutralColorValues;

/** Material / glass effect tokens — not RGB; map to BlurView / UIVisualEffect. */
export type MaterialToken =
  'ultraThin' | 'thin' | 'regular' | 'thick' | 'glassRegular' | 'glassClear';

export type AgendaTheme = {
  mode: AppearanceMode;
  isDark: boolean;
  isHighContrast: boolean;

  brand: {
    primary: ColorValue;
    primarySoft: ColorValue;
    onPrimary: ColorValue;
  };
  content: {
    text: ColorValue;
    secondary: ColorValue;
    tertiary: ColorValue;
    quaternary: ColorValue;
    placeholder: ColorValue;
    link: ColorValue;
    disabled: ColorValue;
  };
  surface: {
    background: ColorValue;
    secondary: ColorValue;
    tertiary: ColorValue;
    grouped: ColorValue;
    groupedSecondary: ColorValue;
    groupedTertiary: ColorValue;
  };
  control: {
    fill: ColorValue;
    fillSecondary: ColorValue;
    fillTertiary: ColorValue;
    fillQuaternary: ColorValue;
    input: ColorValue;
    inputClear: ColorValue;
    selected: ColorValue;
    pressed: ColorValue;
    disabled: ColorValue;
  };
  boundary: {
    separator: ColorValue;
    border: ColorValue;
    borderStrong: ColorValue;
    focus: ColorValue;
  };
  status: {
    info: ColorValue;
    infoSoft: ColorValue;
    success: ColorValue;
    successSoft: ColorValue;
    warning: ColorValue;
    warningSoft: ColorValue;
    danger: ColorValue;
    dangerSoft: ColorValue;
  };
  category: Record<CategoryColorName, ColorValue>;
  neutral: Record<NeutralColorName, ColorValue>;
  overlay: ColorValue;
  material: Record<MaterialToken, MaterialToken>;

  /**
   * Flat aliases (string fallbacks) for Icon / Text props and StyleSheet.
   * Background → Background, Section → Surface Secondary, Card → Surface Tertiary.
   * Prefer nested semantic tokens for new code when ColorValue is accepted.
   */
  background: string;
  section: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  placeholder: string;
  link: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  separator: string;
  border: string;
  input: string;
  warning: string;
  danger: string;
  success: string;
  floating: string;
  floatingText: string;
  floatingTextMuted: string;
};

export function getCategoryReference(name: CategoryColorName, mode: AppearanceMode): string {
  return categoryColorValues[name][mode];
}

export function getCategoryColor(name: CategoryColorName, mode: AppearanceMode): ColorValue {
  return getCategoryReference(name, mode);
}

/** Primary Soft opacity per Apple guidance. */
export function softAlpha(mode: AppearanceMode): number {
  if (mode === 'darkHighContrast') return 0.28;
  if (mode === 'lightHighContrast') return 0.2;
  return mode === 'dark' ? 0.18 : 0.12;
}

export function resolveAppearanceMode(
  colorScheme: 'light' | 'dark',
  highContrast: boolean,
): AppearanceMode {
  if (colorScheme === 'dark') return highContrast ? 'darkHighContrast' : 'dark';
  return highContrast ? 'lightHighContrast' : 'light';
}

function createTheme(mode: AppearanceMode): AgendaTheme {
  const isDark = mode === 'dark' || mode === 'darkHighContrast';
  const isHighContrast = mode === 'lightHighContrast' || mode === 'darkHighContrast';
  const useNeutralIOSPalette = Platform.OS === 'ios';
  const useMaterialAndroidPalette = Platform.OS === 'android';
  const primaryReference = getCategoryReference('indigo', mode);
  const primary = getCategoryColor('indigo', mode);
  const onPrimary = isDark ? '#000000' : '#FFFFFF';
  const primarySoft = rgba(primaryReference, softAlpha(mode));

  const category = Object.fromEntries(
    (Object.keys(categoryColorValues) as CategoryColorName[]).map((name) => [
      name,
      getCategoryColor(name, mode),
    ]),
  ) as Record<CategoryColorName, ColorValue>;

  const neutral = Object.fromEntries(
    (Object.keys(neutralColorValues) as NeutralColorName[]).map((name) => [
      name,
      neutralColorValues[name][mode],
    ]),
  ) as Record<NeutralColorName, ColorValue>;

  const text = useNeutralIOSPalette
    ? isDark
      ? '#FFFFFF'
      : '#1C1C1E'
    : useMaterialAndroidPalette
      ? isDark
        ? '#E6E1E5'
        : '#1D1B20'
      : isDark
        ? '#F3F0EA'
        : '#27231F';
  const secondaryText = useNeutralIOSPalette
    ? isDark
      ? '#A1A1A6'
      : '#636366'
    : useMaterialAndroidPalette
      ? isDark
        ? '#CAC4D0'
        : '#49454F'
      : isDark
        ? '#B0AFAB'
        : '#6E675F';
  const tertiaryText = useNeutralIOSPalette
    ? isDark
      ? '#7C7C80'
      : '#8E8E93'
    : useMaterialAndroidPalette
      ? isDark
        ? '#938F99'
        : '#79747E'
      : isDark
        ? '#85888A'
        : '#928A80';
  const quaternaryText = useNeutralIOSPalette
    ? isDark
      ? '#5A5A5E'
      : '#AEAEB2'
    : useMaterialAndroidPalette
      ? isDark
        ? '#79747E'
        : '#938F99'
      : isDark
        ? '#666B6E'
        : '#B0A79C';
  const surfaceBackground = useNeutralIOSPalette
    ? isDark
      ? '#000000'
      : '#F2F2F7'
    : useMaterialAndroidPalette
      ? isDark
        ? '#141218'
        : '#FFFBFE'
      : isDark
        ? '#10161C'
        : '#F8F4EC';
  const surfaceSecondary = useNeutralIOSPalette
    ? isDark
      ? '#1C1C1E'
      : '#FFFFFF'
    : useMaterialAndroidPalette
      ? isDark
        ? '#211F26'
        : '#F3EDF7'
      : neutralColorValues.gray6[mode];
  const surfaceTertiary = useNeutralIOSPalette
    ? isDark
      ? '#2C2C2E'
      : '#FFFFFF'
    : useMaterialAndroidPalette
      ? isDark
        ? '#2B2930'
        : '#E7E0EC'
      : isDark
        ? neutralColorValues.gray5[mode]
        : '#FFFDF8';
  const fillBase = useNeutralIOSPalette
    ? isDark
      ? '#FFFFFF'
      : '#000000'
    : useMaterialAndroidPalette
      ? isDark
        ? '#E6E1E5'
        : '#1D1B20'
      : isDark
        ? '#AAB0B4'
        : '#6E675F';
  const alphaBoost = isHighContrast ? 0.06 : 0;
  const separatorFallback = useNeutralIOSPalette
    ? isDark
      ? '#38383A'
      : '#C6C6C8'
    : useMaterialAndroidPalette
      ? isDark
        ? '#49454F'
        : '#CAC4D0'
      : isDark
        ? '#30383F'
        : '#DDD4C7';
  const inputFallback = rgba(fillBase, 0.12 + alphaBoost);
  const blueRef = getCategoryReference('blue', mode);
  const greenRef = getCategoryReference('green', mode);
  const orangeRef = getCategoryReference('orange', mode);
  const redRef = getCategoryReference('red', mode);

  return {
    mode,
    isDark,
    isHighContrast,
    brand: {
      primary,
      primarySoft,
      onPrimary,
    },
    content: {
      text,
      secondary: secondaryText,
      tertiary: tertiaryText,
      quaternary: quaternaryText,
      placeholder: tertiaryText,
      link: blueRef,
      disabled: quaternaryText,
    },
    surface: {
      background: surfaceBackground,
      secondary: surfaceSecondary,
      tertiary: surfaceTertiary,
      grouped: surfaceSecondary,
      groupedSecondary: surfaceTertiary,
      groupedTertiary: surfaceSecondary,
    },
    control: {
      fill: rgba(fillBase, 0.2 + alphaBoost),
      fillSecondary: rgba(fillBase, 0.16 + alphaBoost),
      fillTertiary: inputFallback,
      fillQuaternary: rgba(fillBase, 0.08 + alphaBoost),
      input: inputFallback,
      inputClear: 'transparent',
      selected: primarySoft,
      pressed: rgba(primaryReference, softAlpha(mode) + 0.08),
      disabled: rgba(fillBase, 0.08 + alphaBoost),
    },
    boundary: {
      separator: separatorFallback,
      border: neutral.gray4,
      borderStrong: neutralColorValues.gray3[mode],
      focus: primary,
    },
    status: {
      info: category.blue,
      infoSoft: rgba(blueRef, softAlpha(mode)),
      success: category.green,
      successSoft: rgba(greenRef, softAlpha(mode)),
      warning: category.orange,
      warningSoft: rgba(orangeRef, softAlpha(mode)),
      danger: category.red,
      dangerSoft: rgba(redRef, softAlpha(mode)),
    },
    category,
    neutral,
    overlay: rgba('#000000', isDark ? 0.55 : 0.25),
    material: {
      ultraThin: 'ultraThin',
      thin: 'thin',
      regular: 'regular',
      thick: 'thick',
      glassRegular: 'glassRegular',
      glassClear: 'glassClear',
    },
    // Flat string aliases for components that require string colors
    background: surfaceBackground,
    section: surfaceSecondary,
    card: surfaceTertiary,
    text,
    textSecondary: secondaryText,
    textTertiary: tertiaryText,
    placeholder: tertiaryText,
    link: blueRef,
    primary: primaryReference,
    primarySoft,
    onPrimary,
    separator: separatorFallback,
    border: neutralColorValues.gray4[mode],
    input: inputFallback,
    warning: orangeRef,
    danger: redRef,
    success: greenRef,
    floating: useNeutralIOSPalette
      ? isDark
        ? rgba('#1C1C1E', 0.86)
        : rgba('#FFFFFF', 0.86)
      : useMaterialAndroidPalette
        ? isDark
          ? rgba('#211F26', 0.94)
          : rgba('#F3EDF7', 0.94)
        : isDark
          ? rgba('#06090C', 0.72)
          : rgba('#27231F', 0.72),
    floatingText:
      (useNeutralIOSPalette || useMaterialAndroidPalette) && !isDark ? '#1C1C1E' : '#FFFFFF',
    floatingTextMuted:
      (useNeutralIOSPalette || useMaterialAndroidPalette) && !isDark
        ? rgba('#1C1C1E', 0.58)
        : rgba('#FFFFFF', 0.65),
  };
}

/** Apply a user accent (hex reference) onto brand + flat aliases. */
export function withBrandAccent(
  theme: AgendaTheme,
  accentHex: string,
  mode: AppearanceMode = theme.mode,
): AgendaTheme {
  const isDark = mode === 'dark' || mode === 'darkHighContrast';
  const primarySoft = rgba(accentHex, softAlpha(mode));
  const onPrimary = isDark ? '#000000' : '#FFFFFF';

  return {
    ...theme,
    brand: {
      primary: accentHex,
      primarySoft,
      onPrimary,
    },
    control: {
      ...theme.control,
      selected: primarySoft,
      pressed: rgba(accentHex, softAlpha(mode) + 0.08),
    },
    boundary: {
      ...theme.boundary,
      focus: accentHex,
    },
    content: {
      ...theme.content,
      link: accentHex,
    },
    primary: accentHex,
    primarySoft,
    onPrimary,
    link: accentHex,
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
