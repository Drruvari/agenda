import { describe, expect, it } from 'vitest';

import { lexSmartInput, parseSmartInput, tokenizeSmartInput } from './parseSmartInput';

describe('parseSmartInput', () => {
  it('parses the quick-add shorthand from the product brief', () => {
    expect(parseSmartInput('dentist friday 14:30 1h #personal !!', '2026-08-11')).toEqual({
      title: 'dentist',
      date: '2026-08-14',
      time: '14:30',
      durationMinutes: 60,
      spaceName: 'personal',
      priority: 'medium',
    });
  });

  it('uses the next occurrence when the named weekday is today', () => {
    expect(parseSmartInput('Review tuesday', '2026-08-11')).toMatchObject({
      title: 'Review',
      date: '2026-08-18',
    });
  });

  it('parses combined hour and minute durations', () => {
    expect(parseSmartInput('/event Workshop tomorrow 9am 1h30m', '2026-08-11')).toEqual({
      title: 'Workshop',
      type: 'event',
      date: '2026-08-12',
      time: '09:00',
      durationMinutes: 90,
    });
  });

  it.each(['0m', '0h', '1h99m'])('keeps invalid duration %s in the title', (duration) => {
    expect(parseSmartInput(`Meeting ${duration}`)).toEqual({
      title: `Meeting ${duration}`,
    });
  });

  it('parses a valid minute-qualified duration', () => {
    expect(parseSmartInput('Meeting 1h30m')).toEqual({
      title: 'Meeting',
      durationMinutes: 90,
    });
  });

  it('marks recognized syntax without changing the entered text', () => {
    const input = '/event dentist friday 14:30 1h #personal !!';
    const segments = tokenizeSmartInput(input);

    expect(segments.map((segment) => segment.text).join('')).toBe(input);
    expect(segments.filter((segment) => segment.kind)).toEqual([
      { text: '/event', kind: 'type' },
      { text: 'friday', kind: 'date' },
      { text: '14:30', kind: 'time' },
      { text: '1h', kind: 'time' },
      { text: '#personal', kind: 'space' },
      { text: '!!', kind: 'priority' },
    ]);
  });

  it('returns exact ranges for mixed-order syntax', () => {
    const input = '#personal Plan /event friday 14:30 1h !!';

    expect(lexSmartInput(input)).toEqual([
      { kind: 'space', raw: '#personal', start: 0, end: 9 },
      { kind: 'type', raw: '/event', start: 15, end: 21 },
      { kind: 'date', raw: 'friday', start: 22, end: 28 },
      { kind: 'time', raw: '14:30', start: 29, end: 34 },
      { kind: 'time', raw: '1h', start: 35, end: 37 },
      { kind: 'priority', raw: '!!', start: 38, end: 40 },
    ]);
    expect(parseSmartInput(input, '2026-08-11')).toMatchObject({
      title: 'Plan',
      type: 'event',
      spaceName: 'personal',
    });
  });

  it('does not parse syntax embedded inside normal words', () => {
    const input = '#personal asdasd/event hello!!world';

    expect(lexSmartInput(input)).toEqual([{ kind: 'space', raw: '#personal', start: 0, end: 9 }]);
    expect(parseSmartInput(input)).toMatchObject({
      title: 'asdasd/event hello!!world',
      spaceName: 'personal',
    });
  });

  it('supports unicode space names without offset drift', () => {
    const input = 'Plan #familja_ime nesër';
    expect(lexSmartInput(input)).toContainEqual({
      kind: 'space',
      raw: '#familja_ime',
      start: 5,
      end: 17,
    });
  });

  it('keeps note commands as literal title text', () => {
    expect(parseSmartInput('/note Call Alice')).toEqual({ title: '/note Call Alice' });
  });

  it('keeps unknown spaces in the title when known spaces are supplied', () => {
    expect(parseSmartInput('Plan #unknown', '2026-08-11', ['Personal'])).toEqual({
      title: 'Plan #unknown',
    });
    expect(parseSmartInput('Plan #personal', '2026-08-11', ['Personal'])).toEqual({
      title: 'Plan',
      spaceName: 'personal',
    });
  });
});
