import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createMemoryDatabase } from '@/data/database/memory';
import {
  createNotesRepository,
  NoteConflictError,
  shouldRecoverDraft,
} from '@/data/repositories/notes.repository';
import type { DailyNote, NoteDraft } from '@/data/schema/types';
import { DailyNoteSession } from '@/features/todays-page/dailyNoteSession';

function createNotes() {
  return createNotesRepository(createMemoryDatabase());
}

describe('shouldRecoverDraft', () => {
  const note: DailyNote = {
    id: 'n1',
    date: '2026-08-07',
    bodyText: 'saved',
    updatedAt: '2026-08-07T10:00:00.000Z',
  };

  it('returns false when there is no draft', () => {
    expect(shouldRecoverDraft(note, null)).toBe(false);
  });

  it('returns false when draft matches saved body', () => {
    const draft: NoteDraft = {
      date: note.date,
      bodyText: 'saved',
      baseUpdatedAt: note.updatedAt,
      updatedAt: '2026-08-07T10:01:00.000Z',
    };
    expect(shouldRecoverDraft(note, draft)).toBe(false);
  });

  it('returns true when draft is newer and different', () => {
    const draft: NoteDraft = {
      date: note.date,
      bodyText: 'typed but not flushed',
      baseUpdatedAt: note.updatedAt,
      updatedAt: '2026-08-07T10:01:00.000Z',
    };
    expect(shouldRecoverDraft(note, draft)).toBe(true);
  });

  it('returns false when draft is older than the note', () => {
    const draft: NoteDraft = {
      date: note.date,
      bodyText: 'stale',
      baseUpdatedAt: '2026-08-07T09:00:00.000Z',
      updatedAt: '2026-08-07T09:30:00.000Z',
    };
    expect(shouldRecoverDraft(note, draft)).toBe(false);
  });
});

describe('notes.repository CAS + drafts', () => {
  it('saveBody succeeds when expectedUpdatedAt matches', async () => {
    const notes = createNotes();
    const created = await notes.getOrCreateForDate('2026-08-07');
    const saved = await notes.saveBody('2026-08-07', 'hello', created.updatedAt);
    expect(saved.bodyText).toBe('hello');
    expect(saved.updatedAt).not.toBe(created.updatedAt);
  });

  it('saveBody rejects when expectedUpdatedAt mismatches', async () => {
    const notes = createNotes();
    const created = await notes.getOrCreateForDate('2026-08-07');
    await notes.saveBody('2026-08-07', 'first', created.updatedAt);

    await expect(notes.saveBody('2026-08-07', 'clobber', created.updatedAt)).rejects.toBeInstanceOf(
      NoteConflictError,
    );

    const current = await notes.getByDate('2026-08-07');
    expect(current?.bodyText).toBe('first');
  });

  it('loadForDate recovers a newer differing draft', async () => {
    const db = createMemoryDatabase();
    const notes = createNotesRepository(db);
    const created = await notes.getOrCreateForDate('2026-08-07');
    const saved = await notes.saveBody('2026-08-07', 'on disk', created.updatedAt);

    await db.put('note_drafts', {
      date: '2026-08-07',
      bodyText: 'recovered text',
      baseUpdatedAt: saved.updatedAt,
      updatedAt: new Date(Date.parse(saved.updatedAt) + 1000).toISOString(),
    } satisfies NoteDraft);

    const loaded = await notes.loadForDate('2026-08-07');
    expect(loaded.recovered).toBe(true);
    expect(loaded.body).toBe('recovered text');
    expect(loaded.note.bodyText).toBe('on disk');
  });

  it('clears matching draft on load', async () => {
    const notes = createNotes();
    const created = await notes.getOrCreateForDate('2026-08-08');
    const saved = await notes.saveBody('2026-08-08', 'same', created.updatedAt);
    await notes.upsertDraft('2026-08-08', 'same', saved.updatedAt);

    const loaded = await notes.loadForDate('2026-08-08');
    expect(loaded.recovered).toBe(false);
    expect(loaded.body).toBe('same');
    expect(await notes.getDraft('2026-08-08')).toBeNull();
  });
});

describe('DailyNoteSession', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes the previous date before loading the next (no cross-date stamp)', async () => {
    const notes = createNotes();
    const session = new DailyNoteSession({ notes });

    await session.setDate('2026-08-07');
    session.changeBody('day one notes');

    const switchPromise = session.setDate('2026-08-08');
    await vi.runAllTimersAsync();
    await switchPromise;

    expect((await notes.getByDate('2026-08-07'))?.bodyText).toBe('day one notes');

    const snap = session.getSnapshot();
    expect(snap.date).toBe('2026-08-08');
    expect(snap.ready).toBe(true);
    expect(snap.body).toBe('');

    session.changeBody('day two');
    await session.flushPending();
    await vi.runAllTimersAsync();

    expect((await notes.getByDate('2026-08-07'))?.bodyText).toBe('day one notes');
    expect((await notes.getByDate('2026-08-08'))?.bodyText).toBe('day two');

    session.dispose();
  });

  it('does not accept edits while not ready', async () => {
    const notes = createNotes();
    const session = new DailyNoteSession({ notes });

    const loading = session.setDate('2026-08-09');
    expect(session.getSnapshot().ready).toBe(false);
    session.changeBody('should be ignored');
    expect(session.getSnapshot().body).toBe('');

    await loading;
    expect(session.getSnapshot().body).toBe('');

    session.dispose();
  });

  it('writes a draft quickly and recovers it after a fresh session', async () => {
    const notes = createNotes();
    const session = new DailyNoteSession({ notes });

    await session.setDate('2026-08-10');
    const base = session.getSnapshot().baseUpdatedAt!;
    session.changeBody('crash window text');

    await vi.advanceTimersByTimeAsync(120);
    const draft = await notes.getDraft('2026-08-10');
    expect(draft?.bodyText).toBe('crash window text');
    expect(draft?.baseUpdatedAt).toBe(base);

    session.dispose();

    const note = await notes.getByDate('2026-08-10');
    expect(note?.bodyText).toBe('');

    const session2 = new DailyNoteSession({ notes });
    await session2.setDate('2026-08-10');
    expect(session2.getSnapshot().recovered).toBe(true);
    expect(session2.getSnapshot().body).toBe('crash window text');
    expect(['dirty', 'saving', 'saved', 'clean']).toContain(session2.getSnapshot().saveStatus);

    await session2.flushPending();
    await vi.runAllTimersAsync();

    expect((await notes.getByDate('2026-08-10'))?.bodyText).toBe('crash window text');
    session2.dispose();
  });

  it('exposes error status on conflict and keeps local text', async () => {
    const notes = createNotes();
    const session = new DailyNoteSession({ notes });
    await session.setDate('2026-08-11');

    const base = session.getSnapshot().baseUpdatedAt!;
    await notes.saveBody('2026-08-11', 'external', base);

    session.changeBody('local typing');
    await session.flushPending();
    await vi.runAllTimersAsync();

    expect(session.getSnapshot().body).toBe('local typing');
    expect(session.getSnapshot().saveStatus).toBe('error');

    await session.retrySave();
    await vi.runAllTimersAsync();

    expect(session.getSnapshot().saveStatus).toMatch(/saved|clean/);
    expect((await notes.getByDate('2026-08-11'))?.bodyText).toBe('local typing');

    session.dispose();
  });
});
