import type { DatabaseClient } from '@/data/database/types';
import { createId, nowIso } from '@/data/schema/ids';
import type { DailyNote, Drawing } from '@/data/schema/types';

export function createNotesRepository(db: DatabaseClient) {
  return {
    async getByDate(date: string): Promise<DailyNote | null> {
      const notes = await db.findWhere<DailyNote>('daily_notes', { date });
      return notes[0] ?? null;
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

    async saveBody(date: string, bodyText: string): Promise<DailyNote> {
      const note = await this.getOrCreateForDate(date);
      const next: DailyNote = {
        ...note,
        bodyText,
        updatedAt: nowIso(),
      };
      await db.put('daily_notes', next);
      return next;
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

      const allNotes = await db.getAll<DailyNote>('daily_notes');
      const note = allNotes.find((entry) => entry.id === noteId);
      if (note) {
        await db.put('daily_notes', {
          ...note,
          drawingId: drawing.id,
          updatedAt: now,
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

      const notes = await db.getAll<DailyNote>('daily_notes');
      const note = notes.find((entry) => entry.id === drawing.noteId);
      if (note?.drawingId === drawingId) {
        await db.put('daily_notes', {
          ...note,
          drawingId: undefined,
          updatedAt: nowIso(),
        });
      }
    },
  };
}

export type NotesRepository = ReturnType<typeof createNotesRepository>;
