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
  switch (font) {
    case 'avenir':
    case 'switzer':
    case 'instrument-sans':
      return fonts.sans;

    case 'charter':
    case 'zodiak':
    case 'instrument-serif':
      return fonts.serif;

    default:
      return Platform.OS === 'ios' ? fonts.sans : undefined;
  }
}
