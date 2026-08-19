import { Platform } from 'react-native';

const sans = Platform.select({
  ios: 'System',
  default: 'Switzer-Regular',
});

const sansMedium = Platform.select({
  ios: 'System',
  default: 'Switzer-Medium',
});

const sansSemi = Platform.select({
  ios: 'System',
  default: 'Switzer-Semibold',
});

export const fonts = {
  sans,
  sansMedium,
  sansSemi,

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
      return fonts.sans;
  }
}
