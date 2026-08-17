import { describe, expect, it } from 'vitest';

import { isTimePast } from './isTimePast';

describe('isTimePast', () => {
  const now = new Date(2026, 7, 17, 14, 30);

  it('compares valid 12-hour and 24-hour times', () => {
    expect(isTimePast('2:29 PM', now)).toBe(true);
    expect(isTimePast('14:30', now)).toBe(false);
    expect(isTimePast('23:00', now)).toBe(false);
  });

  it.each(['99:99', '25:00', '13:30 PM', '0:45 AM', '12:87 PM'])('rejects %s', (time) => {
    expect(isTimePast(time, now)).toBe(false);
  });
});
