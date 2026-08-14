import { Platform } from 'react-native';

export const fonts = {
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'System',
  }),
  sansMedium: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'System',
  }),
  sansSemi: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'System',
  }),
  serif: Platform.select({
    ios: 'System',
    android: 'serif',
    web: 'Charter, Georgia, serif',
    default: 'serif',
  }),
  serifItalic: Platform.select({
    ios: 'System',
    android: 'serif',
    web: 'Charter, Georgia, serif',
    default: 'serif',
  }),
} as const;

export function editorFontFamily(font: string): string | undefined {
  if (Platform.OS === 'ios') return fonts.sans;
  if (font === 'avenir' || font === 'switzer' || font === 'instrument-sans') return fonts.sans;
  if (font === 'charter' || font === 'zodiak' || font === 'instrument-serif') return fonts.serif;
  return undefined;
}
