import { describe, expect, it } from 'vitest';

import {
  INBOX_FILTER_ID,
  isAllSpaceFilter,
  isInboxSpaceFilter,
  isSpaceUuidFilter,
  matchesRoutineSpaceFilter,
  matchesSpaceFilter,
  resolveCreateSpaceId,
} from './spaceFilter';

describe('spaceFilter', () => {
  it('classifies filter sentinels', () => {
    expect(isAllSpaceFilter(null)).toBe(true);
    expect(isAllSpaceFilter('all')).toBe(true);
    expect(isAllSpaceFilter(INBOX_FILTER_ID)).toBe(false);
    expect(isInboxSpaceFilter(INBOX_FILTER_ID)).toBe(true);
    expect(isSpaceUuidFilter('space-1')).toBe(true);
    expect(isSpaceUuidFilter(INBOX_FILTER_ID)).toBe(false);
  });

  it('matchesSpaceFilter for All / Inbox / Space', () => {
    expect(matchesSpaceFilter('a', null)).toBe(true);
    expect(matchesSpaceFilter(undefined, 'all')).toBe(true);

    expect(matchesSpaceFilter(undefined, INBOX_FILTER_ID)).toBe(true);
    expect(matchesSpaceFilter(null, INBOX_FILTER_ID)).toBe(true);
    expect(matchesSpaceFilter('a', INBOX_FILTER_ID)).toBe(false);

    expect(matchesSpaceFilter('a', 'a')).toBe(true);
    expect(matchesSpaceFilter('b', 'a')).toBe(false);
    expect(matchesSpaceFilter(undefined, 'a')).toBe(false);
  });

  it('matchesRoutineSpaceFilter only under a specific Space', () => {
    expect(matchesRoutineSpaceFilter(undefined, null)).toBe(true);
    expect(matchesRoutineSpaceFilter('a', INBOX_FILTER_ID)).toBe(true);
    expect(matchesRoutineSpaceFilter(undefined, INBOX_FILTER_ID)).toBe(true);
    expect(matchesRoutineSpaceFilter('a', 'a')).toBe(true);
    expect(matchesRoutineSpaceFilter(undefined, 'a')).toBe(false);
    expect(matchesRoutineSpaceFilter('b', 'a')).toBe(false);
  });

  it('resolveCreateSpaceId inherits filter or default', () => {
    expect(resolveCreateSpaceId('studio', null)).toBe('studio');
    expect(resolveCreateSpaceId(INBOX_FILTER_ID, 'studio')).toBeUndefined();
    expect(resolveCreateSpaceId(null, 'studio')).toBe('studio');
    expect(resolveCreateSpaceId(null, null)).toBeUndefined();
    expect(resolveCreateSpaceId('all', 'studio')).toBe('studio');
  });
});
