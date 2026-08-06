import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccessibilityInfo, Appearance, useColorScheme } from 'react-native';

import type { AccentColor, AppSettings } from '@/data/schema/types';

import {
  type AgendaTheme,
  type AppearanceMode,
  categoryColorValues,
  type CategoryColorName,
  lightTheme,
  resolveAppearanceMode,
  softAlpha,
  themes,
  withBrandAccent,
} from './colors';

/**
 * Settings accent → category color.
 * `purple` maps to system Indigo (former #5856D6 brand family).
 * `magenta` maps to system Purple.
 */
const ACCENT_TO_CATEGORY: Record<AccentColor, CategoryColorName> = {
  blue: 'blue',
  red: 'red',
  purple: 'indigo',
  green: 'green',
  brown: 'brown',
  orange: 'orange',
  magenta: 'purple',
  yellow: 'yellow',
};

type AppThemeValue = {
  accent: string;
  appearanceMode: AppearanceMode;
  colorScheme: 'light' | 'dark';
  theme: AgendaTheme;
};

function accentHex(accent: AccentColor, mode: AppearanceMode): string {
  return categoryColorValues[ACCENT_TO_CATEGORY[accent]][mode];
}

const ThemeContext = createContext<AppThemeValue>({
  accent: categoryColorValues.indigo.light,
  appearanceMode: 'light',
  colorScheme: 'light',
  theme: lightTheme,
});

export function AppThemeProvider({
  children,
  settings,
}: PropsWithChildren<{ settings: AppSettings }>) {
  const systemScheme = useColorScheme();
  const requestedMode = settings.general.mode;
  const colorScheme: 'light' | 'dark' =
    requestedMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : requestedMode;

  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    Appearance.setColorScheme(requestedMode === 'system' ? 'unspecified' : requestedMode);
  }, [requestedMode]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isHighTextContrastEnabled?.().then((enabled: boolean) => {
      if (mounted) setHighContrast(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'highTextContrastChanged',
      (enabled: boolean) => setHighContrast(enabled),
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const value = useMemo<AppThemeValue>(() => {
    const appearanceMode = resolveAppearanceMode(colorScheme, highContrast);
    const base = themes[appearanceMode];
    const accent = accentHex(settings.general.accent, appearanceMode);
    return {
      accent,
      appearanceMode,
      colorScheme,
      theme: withBrandAccent(base, accent, appearanceMode),
    };
  }, [colorScheme, highContrast, settings.general.accent]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AgendaTheme {
  return useContext(ThemeContext).theme;
}

export function useAppAppearance(): AppThemeValue {
  return useContext(ThemeContext);
}

export function useThemeStyles<T>(factory: (theme: AgendaTheme) => T) {
  const theme = useAppTheme();
  const styles = useMemo(() => factory(theme), [factory, theme]);
  return { styles, theme };
}

export function getAccentColor(
  accent: AccentColor,
  colorScheme: 'light' | 'dark' = 'light',
  highContrast = false,
): string {
  return accentHex(accent, resolveAppearanceMode(colorScheme, highContrast));
}

export { softAlpha };
