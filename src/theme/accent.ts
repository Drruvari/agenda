import type { AccentColor } from '@/data/schema/types';

import { type AppearanceMode, type CategoryColorName, categoryColorValues } from './colors';

const ACCENT_TO_CATEGORY = {
  blue: 'blue',
  red: 'red',
  purple: 'indigo',
  green: 'green',
  brown: 'brown',
  orange: 'orange',
  magenta: 'purple',
  yellow: 'yellow',
} as const satisfies Record<Exclude<AccentColor, 'black'>, CategoryColorName>;

export function getAccentColor(accent: AccentColor, mode: AppearanceMode): string {
  if (accent === 'black') {
    return mode === 'dark' || mode === 'darkHighContrast' ? '#FFFFFF' : '#191919';
  }

  return categoryColorValues[ACCENT_TO_CATEGORY[accent]][mode];
}
