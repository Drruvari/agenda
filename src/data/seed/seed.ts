import type { DatabaseClient } from '@/data/database/types';
import type { AgendaItem, DailyNote, Routine, Space } from '@/data/schema/types';

const SEED_FLAG = 'seed.version';
const SEED_VERSION = '3';

const SAMPLE_ITEM_TITLES = new Set([
  'Review design proofs',
  'Buy groceries',
  'Inbox triage',
  'Studio standup',
  'Stretch break',
]);
const SAMPLE_ROUTINE_NAMES = new Set(['Water', 'Stretch', 'Read']);
const SAMPLE_SPACE_NAMES = new Set(['Inbox', 'Studio', 'Home', 'Personal']);

/**
 * New installs start empty. Version 1 databases are cleaned only of the exact
 * records created by the former development seed, preserving user-created data.
 * Version 3 normalizes legacy "Inbox" Space rows into unassigned Inbox items.
 */
export async function seedIfNeeded(db: DatabaseClient): Promise<boolean> {
  const existingVersion = await db.getMeta(SEED_FLAG);
  if (existingVersion === SEED_VERSION) {
    return false;
  }

  if (existingVersion === '1') {
    const items = await db.getAll<AgendaItem>('agenda_items');
    for (const item of items) {
      if (SAMPLE_ITEM_TITLES.has(item.title)) {
        await db.delete('agenda_items', item.id);
      }
    }

    const routines = await db.getAll<Routine>('routines');
    for (const routine of routines) {
      if (SAMPLE_ROUTINE_NAMES.has(routine.name)) {
        await db.deleteWhere('routine_completions', { routineId: routine.id });
        await db.delete('routines', routine.id);
      }
    }

    const notes = await db.getAll<DailyNote>('daily_notes');
    for (const note of notes) {
      if (!note.bodyText && !note.drawingId) {
        await db.delete('daily_notes', note.id);
      }
    }

    const [remainingItems, remainingRoutines, spaces] = await Promise.all([
      db.getAll<AgendaItem>('agenda_items'),
      db.getAll<Routine>('routines'),
      db.getAll<Space>('spaces'),
    ]);
    const referencedSpaceIds = new Set([
      ...remainingItems.map((item) => item.spaceId).filter(Boolean),
      ...remainingRoutines.map((routine) => routine.spaceId).filter(Boolean),
    ]);

    for (const space of spaces) {
      if (SAMPLE_SPACE_NAMES.has(space.name) && !referencedSpaceIds.has(space.id)) {
        await db.delete('spaces', space.id);
      }
    }
  }

  await normalizeLegacyInboxSpaces(db);
  await db.setMeta(SEED_FLAG, SEED_VERSION);
  return existingVersion === '1' || existingVersion === '2' || !existingVersion;
}

/** Convert a Space named Inbox into true Inbox (null spaceId) and remove the row. */
async function normalizeLegacyInboxSpaces(db: DatabaseClient): Promise<void> {
  const spaces = await db.getAll<Space>('spaces');
  const inboxSpaces = spaces.filter((space) => space.name.trim().toLowerCase() === 'inbox');
  if (inboxSpaces.length === 0) return;

  const inboxIds = new Set(inboxSpaces.map((space) => space.id));
  const items = await db.getAll<AgendaItem>('agenda_items');
  for (const item of items) {
    if (item.spaceId && inboxIds.has(item.spaceId)) {
      await db.put('agenda_items', { ...item, spaceId: undefined });
    }
  }

  const routines = await db.getAll<Routine>('routines');
  for (const routine of routines) {
    if (routine.spaceId && inboxIds.has(routine.spaceId)) {
      await db.put('routines', { ...routine, spaceId: undefined });
    }
  }

  for (const space of inboxSpaces) {
    await db.delete('spaces', space.id);
  }
}
