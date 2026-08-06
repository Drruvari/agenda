import { Color } from 'expo-router';
import type { ColorValue } from 'react-native';

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

/** Calendar / event / space category palette — Apple system colors 2025+. */
export const categoryColorValues = {
  red: {
    light: '#FF383C',
    dark: '#FF4245',
    lightHighContrast: '#E9152D',
    darkHighContrast: '#FF6165',
  },
  orange: {
    light: '#FF8D28',
    dark: '#FF9230',
    lightHighContrast: '#C55300',
    darkHighContrast: '#FFA056',
  },
  yellow: {
    light: '#FFCC00',
    dark: '#FFD600',
    lightHighContrast: '#A16A00',
    darkHighContrast: '#FEDF43',
  },
  green: {
    light: '#34C759',
    dark: '#30D158',
    lightHighContrast: '#008932',
    darkHighContrast: '#4AD968',
  },
  mint: {
    light: '#00C8B3',
    dark: '#00DAC3',
    lightHighContrast: '#008575',
    darkHighContrast: '#54DFCB',
  },
  teal: {
    light: '#00C3D0',
    dark: '#00D2E0',
    lightHighContrast: '#008198',
    darkHighContrast: '#3BDDEC',
  },
  cyan: {
    light: '#00C0E8',
    dark: '#3CD3FE',
    lightHighContrast: '#007EAE',
    darkHighContrast: '#6DD9FF',
  },
  blue: {
    light: '#0088FF',
    dark: '#0091FF',
    lightHighContrast: '#1E6EF4',
    darkHighContrast: '#5CB8FF',
  },
  indigo: {
    light: '#6155F5',
    dark: '#6D7CFF',
    lightHighContrast: '#564ADE',
    darkHighContrast: '#A7AAFF',
  },
  purple: {
    light: '#CB30E0',
    dark: '#DB34F2',
    lightHighContrast: '#B02FC2',
    darkHighContrast: '#EA8DFF',
  },
  pink: {
    light: '#FF2D55',
    dark: '#FF375F',
    lightHighContrast: '#E7124D',
    darkHighContrast: '#FF8AC4',
  },
  brown: {
    light: '#AC7F5E',
    dark: '#B78A66',
    lightHighContrast: '#956D51',
    darkHighContrast: '#DBA679',
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
    light: '#8E8E93',
    dark: '#8E8E93',
    lightHighContrast: '#6C6C70',
    darkHighContrast: '#AEAEB2',
  },
  gray2: {
    light: '#AEAEB2',
    dark: '#636366',
    lightHighContrast: '#8E8E93',
    darkHighContrast: '#7C7C80',
  },
  gray3: {
    light: '#C7C7CC',
    dark: '#48484A',
    lightHighContrast: '#AEAEB2',
    darkHighContrast: '#545456',
  },
  gray4: {
    light: '#D1D1D6',
    dark: '#3A3A3C',
    lightHighContrast: '#BCBCC0',
    darkHighContrast: '#444446',
  },
  gray5: {
    light: '#E5E5EA',
    dark: '#2C2C2E',
    lightHighContrast: '#D8D8DC',
    darkHighContrast: '#363638',
  },
  gray6: {
    light: '#F2F2F7',
    dark: '#1C1C1E',
    lightHighContrast: '#EBEBF0',
    darkHighContrast: '#242426',
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

const IOS_CATEGORY_COLORS: Record<CategoryColorName, ColorValue> = {
  red: Color.ios.systemRed,
  orange: Color.ios.systemOrange,
  yellow: Color.ios.systemYellow,
  green: Color.ios.systemGreen,
  mint: Color.ios.systemMint,
  teal: Color.ios.systemTeal,
  cyan: Color.ios.systemCyan,
  blue: Color.ios.systemBlue,
  indigo: Color.ios.systemIndigo,
  purple: Color.ios.systemPurple,
  pink: Color.ios.systemPink,
  brown: Color.ios.systemBrown,
};

const IOS_NEUTRAL_COLORS: Record<NeutralColorName, ColorValue> = {
  gray1: Color.ios.systemGray,
  gray2: Color.ios.systemGray2,
  gray3: Color.ios.systemGray3,
  gray4: Color.ios.systemGray4,
  gray5: Color.ios.systemGray5,
  gray6: Color.ios.systemGray6,
};

function iosColor(nativeColor: ColorValue, fallback: string): ColorValue {
  return (nativeColor as ColorValue | null) ?? fallback;
}

export function getCategoryReference(name: CategoryColorName, mode: AppearanceMode): string {
  return categoryColorValues[name][mode];
}

export function getCategoryColor(name: CategoryColorName, mode: AppearanceMode): ColorValue {
  return iosColor(IOS_CATEGORY_COLORS[name], getCategoryReference(name, mode));
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
      iosColor(IOS_NEUTRAL_COLORS[name], neutralColorValues[name][mode]),
    ]),
  ) as Record<NeutralColorName, ColorValue>;

  const text = isDark ? '#FFFFFF' : '#000000';
  const secondaryText = rgba(isDark ? '#EBEBF5' : '#3C3C43', 0.6);
  const tertiaryText = rgba(isDark ? '#EBEBF5' : '#3C3C43', 0.3);
  const quaternaryText = rgba(isDark ? '#EBEBF5' : '#3C3C43', isHighContrast ? 0.28 : 0.18);
  const surfaceBackground = isDark ? '#000000' : '#FFFFFF';
  const surfaceSecondary = neutralColorValues.gray6[mode];
  const surfaceTertiary = isDark ? neutralColorValues.gray5[mode] : '#FFFFFF';
  const fillBase = '#787880';
  const alphaBoost = isHighContrast ? 0.06 : 0;
  const separatorFallback = rgba('#787880', isDark ? 0.24 : 0.12);
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
      text: iosColor(Color.ios.label, text),
      secondary: iosColor(Color.ios.secondaryLabel, secondaryText),
      tertiary: iosColor(Color.ios.tertiaryLabel, tertiaryText),
      quaternary: iosColor(Color.ios.quaternaryLabel, quaternaryText),
      placeholder: iosColor(Color.ios.placeholderText, tertiaryText),
      link: iosColor(Color.ios.link, blueRef),
      disabled: iosColor(Color.ios.quaternaryLabel, quaternaryText),
    },
    surface: {
      background: iosColor(Color.ios.systemBackground, surfaceBackground),
      secondary: iosColor(Color.ios.secondarySystemBackground, surfaceSecondary),
      tertiary: iosColor(Color.ios.tertiarySystemBackground, surfaceTertiary),
      grouped: iosColor(Color.ios.systemGroupedBackground, surfaceSecondary),
      groupedSecondary: iosColor(Color.ios.secondarySystemGroupedBackground, surfaceTertiary),
      groupedTertiary: iosColor(Color.ios.tertiarySystemGroupedBackground, surfaceSecondary),
    },
    control: {
      fill: iosColor(Color.ios.systemFill, rgba(fillBase, 0.2 + alphaBoost)),
      fillSecondary: iosColor(Color.ios.secondarySystemFill, rgba(fillBase, 0.16 + alphaBoost)),
      fillTertiary: iosColor(Color.ios.tertiarySystemFill, inputFallback),
      fillQuaternary: iosColor(Color.ios.quaternarySystemFill, rgba(fillBase, 0.08 + alphaBoost)),
      input: iosColor(Color.ios.tertiarySystemFill, inputFallback),
      inputClear: 'transparent',
      selected: primarySoft,
      pressed: rgba(primaryReference, softAlpha(mode) + 0.08),
      disabled: iosColor(Color.ios.quaternarySystemFill, rgba(fillBase, 0.08 + alphaBoost)),
    },
    boundary: {
      separator: iosColor(Color.ios.separator, separatorFallback),
      border: neutral.gray4,
      borderStrong: iosColor(Color.ios.opaqueSeparator, neutralColorValues.gray3[mode]),
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
    floating: isDark ? rgba('#000000', 0.35) : rgba('#1C1C1E', 0.28),
    floatingText: '#FFFFFF',
    floatingTextMuted: rgba('#FFFFFF', 0.65),
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
