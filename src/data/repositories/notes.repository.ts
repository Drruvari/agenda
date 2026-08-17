import type { DatabaseClient } from '@/data/database/types';
import { createId, nowIso } from '@/data/schema/ids';
import type { DailyNote, Drawing, NoteDraft } from '@/data/schema/types';

export class NoteConflictError extends Error {
  readonly current: DailyNote;

  constructor(current: DailyNote) {
    super('Note was changed elsewhere');
    this.name = 'NoteConflictError';
    this.current = current;
  }
}

export function shouldRecoverDraft(note: DailyNote, draft: NoteDraft | null): boolean {
  if (!draft) return false;
  if (draft.bodyText === note.bodyText) return false;
  return draft.baseUpdatedAt === note.updatedAt && draft.updatedAt > note.updatedAt;
}

/** Ensure each write gets a strictly newer ISO timestamp (avoids same-ms CAS collisions). */
function nextUpdatedAt(previous?: string): string {
  const now = nowIso();
  if (!previous || now > previous) return now;
  return new Date(Date.parse(previous) + 1).toISOString();
}

export function createNotesRepository(db: DatabaseClient) {
  return {
    async getByDate(date: string): Promise<DailyNote | null> {
      const notes = await db.findWhere<DailyNote>('daily_notes', { date });
      return notes[0] ?? null;
    },

    async list(): Promise<DailyNote[]> {
      const notes = await db.getAll<DailyNote>('daily_notes');
      return notes
        .filter((note) => note.bodyText.trim().length > 0 || note.drawingId)
        .sort((a, b) => b.date.localeCompare(a.date));
    },

    async getOrCreateForDate(date: string): Promise<DailyNote> {
      const existing = await this.getByDate(date);
      if (existing) {
        return existing;
      }

      const note: DailyNote = {
        id: createId(),
        date,
        bodyText: '',
        updatedAt: nowIso(),
      };

      try {
        await db.put('daily_notes', note);
        return note;
      } catch {
        // Another writer may have inserted the UNIQUE date first.
        const raced = await this.getByDate(date);
        if (raced) return raced;
        throw new Error(`Could not create daily note for ${date}`);
      }
    },

    /**
     * Persist note body. When `expectedUpdatedAt` is provided, rejects with
     * {@link NoteConflictError} if the stored row has a different timestamp.
     */
    async saveBody(date: string, bodyText: string, expectedUpdatedAt?: string): Promise<DailyNote> {
      const note = await this.getOrCreateForDate(date);

      if (expectedUpdatedAt !== undefined && note.updatedAt !== expectedUpdatedAt) {
        throw new NoteConflictError(note);
      }

      const next: DailyNote = {
        ...note,
        bodyText,
        updatedAt: nextUpdatedAt(note.updatedAt),
      };
      if (expectedUpdatedAt !== undefined) {
        const saved = await db.putDailyNoteIfUpdatedAtMatches(next, expectedUpdatedAt);
        if (!saved) {
          const current = await this.getByDate(date);
          if (current) throw new NoteConflictError(current);
          throw new Error(`Daily note for ${date} disappeared while saving`);
        }
      } else {
        await db.put('daily_notes', next);
      }
      return next;
    },

    async getDraft(date: string): Promise<NoteDraft | null> {
      return db.getById<NoteDraft>('note_drafts', date);
    },

    async upsertDraft(date: string, bodyText: string, baseUpdatedAt: string): Promise<NoteDraft> {
      const existing = await this.getDraft(date);
      const draft: NoteDraft = {
        date,
        bodyText,
        baseUpdatedAt,
        updatedAt: nextUpdatedAt(existing?.updatedAt),
      };
      await db.put('note_drafts', draft);
      return draft;
    },

    async clearDraft(date: string): Promise<void> {
      await db.delete('note_drafts', date);
    },

    /**
     * Load the canonical note plus any recoverable draft for this date.
     * Returns recovered=true when the draft body should be shown instead.
     */
    async loadForDate(date: string): Promise<{
      note: DailyNote;
      body: string;
      recovered: boolean;
    }> {
      const note = await this.getOrCreateForDate(date);
      const draft = await this.getDraft(date);

      if (shouldRecoverDraft(note, draft) && draft) {
        return { note, body: draft.bodyText, recovered: true };
      }

      if (draft && draft.bodyText === note.bodyText) {
        await this.clearDraft(date);
      }

      return { note, body: note.bodyText, recovered: false };
    },

    async getDrawing(drawingId: string): Promise<Drawing | null> {
      return db.getById<Drawing>('drawings', drawingId);
    },

    async saveDrawing(noteId: string, data: string, drawingId?: string): Promise<Drawing> {
      const now = nowIso();
      const drawing: Drawing = {
        id: drawingId ?? createId(),
        noteId,
        format: 'ink-v1',
        data,
        createdAt: now,
        updatedAt: now,
      };

      if (drawingId) {
        const existing = await db.getById<Drawing>('drawings', drawingId);
        if (existing) {
          drawing.createdAt = existing.createdAt;
        }
      }

      await db.put('drawings', drawing);

      const note = await db.getById<DailyNote>('daily_notes', noteId);
      if (note) {
        await db.put('daily_notes', {
          ...note,
          drawingId: drawing.id,
          updatedAt: nextUpdatedAt(note.updatedAt),
        });
      }

      return drawing;
    },

    async deleteDrawing(drawingId: string): Promise<void> {
      const drawing = await db.getById<Drawing>('drawings', drawingId);
      if (!drawing) {
        return;
      }

      await db.delete('drawings', drawingId);

      const note = await db.getById<DailyNote>('daily_notes', drawing.noteId);
      if (note?.drawingId === drawingId) {
        await db.put('daily_notes', {
          ...note,
          drawingId: undefined,
          updatedAt: nextUpdatedAt(note.updatedAt),
        });
      }
    },
  };
}

export type NotesRepository = ReturnType<typeof createNotesRepository>;
