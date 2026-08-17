import { describe, expect, it, vi } from 'vitest';

import { lightTheme, withBrandAccent } from './colors';

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

describe('accent foreground contrast', () => {
  it('uses dark text on bright accents', () => {
    expect(withBrandAccent(lightTheme, '#FFCC00').onPrimary).toBe('#000000');
  });

  it('uses light text on dark accents', () => {
    expect(withBrandAccent(lightTheme, '#191919').onPrimary).toBe('#FFFFFF');
  });
});
