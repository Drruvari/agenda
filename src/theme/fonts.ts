import { Platform } from 'react-native';

export const fonts = {
  sans: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    web: 'Avenir Next, ui-sans-serif, system-ui, sans-serif',
    default: 'System',
  }),
  sansMedium: Platform.select({
    ios: 'AvenirNext-Medium',
    android: 'sans-serif-medium',
    web: 'Avenir Next, ui-sans-serif, system-ui, sans-serif',
    default: 'System',
  }),
  sansSemi: Platform.select({
    ios: 'AvenirNext-DemiBold',
    android: 'sans-serif-medium',
    web: 'Avenir Next, ui-sans-serif, system-ui, sans-serif',
    default: 'System',
  }),
  serif: Platform.select({
    ios: 'Charter',
    android: 'serif',
    web: 'Charter, Georgia, serif',
    default: 'serif',
  }),
  serifItalic: Platform.select({
    ios: 'Charter-Italic',
    android: 'serif',
    web: 'Charter, Georgia, serif',
    default: 'serif',
  }),
} as const;

export function editorFontFamily(font: string): string | undefined {
  if (font === 'avenir' || font === 'switzer' || font === 'instrument-sans') return fonts.sans;
  if (font === 'charter' || font === 'zodiak' || font === 'instrument-serif') return fonts.serif;
  return undefined;
}
