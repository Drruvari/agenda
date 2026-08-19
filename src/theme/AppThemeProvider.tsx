import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccessibilityInfo, Appearance, useColorScheme } from 'react-native';

import type { AppSettings } from '@/data/schema/types';

import { getAccentColor } from './accent';
import {
  type AgendaTheme,
  type AppearanceMode,
  lightTheme,
  resolveAppearanceMode,
  themes,
  withBrandAccent,
} from './colors';

export type ThemeColorScheme = 'light' | 'dark';

export type AppAppearance = {
  accent: string;
  appearanceMode: AppearanceMode;
  colorScheme: ThemeColorScheme;
  theme: AgendaTheme;
};

const ThemeContext = createContext<AppAppearance>({
  accent: lightTheme.primary,
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

  const colorScheme: ThemeColorScheme =
    requestedMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : requestedMode;

  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    Appearance.setColorScheme(requestedMode === 'system' ? 'unspecified' : requestedMode);
  }, [requestedMode]);

  useEffect(() => {
    let mounted = true;

    const readHighContrast = async () => {
      const isEnabled = AccessibilityInfo.isHighTextContrastEnabled;

      if (!isEnabled) {
        return;
      }

      const enabled = await isEnabled();

      if (mounted) {
        setHighContrast(enabled);
      }
    };

    void readHighContrast();

    const subscription = AccessibilityInfo.addEventListener(
      'highTextContrastChanged',
      setHighContrast,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const value = useMemo<AppAppearance>(() => {
    const appearanceMode = resolveAppearanceMode(colorScheme, highContrast);

    const baseTheme = themes[appearanceMode];
    const accent = getAccentColor(settings.general.accent, appearanceMode);

    return {
      accent,
      appearanceMode,
      colorScheme,
      theme: withBrandAccent(baseTheme, accent, appearanceMode),
    };
  }, [colorScheme, highContrast, settings.general.accent]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AgendaTheme {
  return useContext(ThemeContext).theme;
}

export function useAppAppearance(): AppAppearance {
  return useContext(ThemeContext);
}

export function useThemeStyles<T>(factory: (theme: AgendaTheme) => T): {
  styles: T;
  theme: AgendaTheme;
} {
  const theme = useAppTheme();

  const styles = useMemo(() => factory(theme), [factory, theme]);

  return {
    styles,
    theme,
  };
}
