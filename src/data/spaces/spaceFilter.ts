/** Sentinel for the Inbox filter — not a real Space row id. */
export const INBOX_FILTER_ID = 'inbox';

export function isAllSpaceFilter(activeSpaceId: string | null | undefined): boolean {
  return activeSpaceId == null || activeSpaceId === 'all';
}

export function isInboxSpaceFilter(activeSpaceId: string | null | undefined): boolean {
  return activeSpaceId === INBOX_FILTER_ID;
}

/** True when `activeSpaceId` refers to a user Space uuid. */
export function isSpaceUuidFilter(activeSpaceId: string | null | undefined): boolean {
  return (
    Boolean(activeSpaceId) && !isAllSpaceFilter(activeSpaceId) && !isInboxSpaceFilter(activeSpaceId)
  );
}

/**
 * Whether an item's `spaceId` belongs in the current Today / browse filter.
 * - All (`null` / `'all'`): everything
 * - Inbox (`'inbox'`): unassigned only
 * - Space uuid: exact match
 */
export function matchesSpaceFilter(
  itemSpaceId: string | null | undefined,
  activeSpaceId: string | null | undefined,
): boolean {
  if (isAllSpaceFilter(activeSpaceId)) return true;
  if (isInboxSpaceFilter(activeSpaceId)) return !itemSpaceId;
  return itemSpaceId === activeSpaceId;
}

/**
 * Routines under All or Inbox show everything.
 * Under a specific Space, only routines assigned to that Space.
 */
export function matchesRoutineSpaceFilter(
  routineSpaceId: string | null | undefined,
  activeSpaceId: string | null | undefined,
): boolean {
  if (!isSpaceUuidFilter(activeSpaceId)) return true;
  return routineSpaceId === activeSpaceId;
}

/**
 * Space id to assign when creating an item under the current filter.
 * - Specific Space selected → that Space
 * - Inbox selected → unassigned (Inbox)
 * - All selected → editor default Space, else Inbox
 */
export function resolveCreateSpaceId(
  activeSpaceId: string | null | undefined,
  defaultSpaceId: string | null | undefined,
): string | undefined {
  if (isInboxSpaceFilter(activeSpaceId)) return undefined;
  if (isSpaceUuidFilter(activeSpaceId)) return activeSpaceId ?? undefined;
  return defaultSpaceId || undefined;
}
