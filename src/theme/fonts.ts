export const fonts = {
  sans: 'Switzer-Regular',
  sansMedium: 'Switzer-Medium',
  sansSemi: 'Switzer-Semibold',
  serif: 'Zodiak-Regular',
  serifItalic: 'Zodiak-Italic',
} as const;

export const fontAssets = {
  [fonts.sans]: require('../../assets/fonts/Switzer-Regular.ttf'),
  [fonts.sansMedium]: require('../../assets/fonts/Switzer-Medium.ttf'),
  [fonts.sansSemi]: require('../../assets/fonts/Switzer-Semibold.ttf'),
  [fonts.serif]: require('../../assets/fonts/Zodiak-Regular.ttf'),
  [fonts.serifItalic]: require('../../assets/fonts/Zodiak-Italic.ttf'),
} as const;

export function editorFontFamily(font: string): string | undefined {
  if (font === 'switzer' || font === 'instrument-sans') return fonts.sans;
  if (font === 'zodiak' || font === 'instrument-serif') return fonts.serif;
  return undefined;
}
