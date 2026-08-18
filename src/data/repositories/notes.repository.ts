import type { DatabaseClient } from '@/data/database/types';
import { createId, nowIso } from '@/data/schema/ids';
import type { DailyNote, DailyPageBlock, Drawing, NoteDraft } from '@/data/schema/types';

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
      const blocks = await db.getAll<DailyPageBlock>('daily_page_blocks');
      const drawings = await db.getAll<Drawing>('drawings');
      const drawingsWithContent = new Set(
        drawings.filter((drawing) => drawing.data.trim().length > 0).map((drawing) => drawing.id),
      );
      const noteIdsWithContent = new Set(
        blocks
          .filter(
            (block) =>
              (block.type === 'text' && block.text.trim().length > 0) ||
              (block.type === 'ink' && drawingsWithContent.has(block.drawingId)),
          )
          .map((block) => block.noteId),
      );
      return notes
        .filter(
          (note) =>
            note.bodyText.trim().length > 0 || note.drawingId || noteIdsWithContent.has(note.id),
        )
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

    async listPageBlocks(date: string): Promise<DailyPageBlock[]> {
      const note = await this.getOrCreateForDate(date);
      let blocks = await db.findWhere<DailyPageBlock>('daily_page_blocks', { noteId: note.id });
      if (blocks.length === 0) {
        const createdAt = nowIso();
        const textBlock: DailyPageBlock = {
          id: createId(),
          noteId: note.id,
          position: 0,
          type: 'text',
          text: note.bodyText,
          createdAt,
          updatedAt: createdAt,
        };
        await db.put('daily_page_blocks', textBlock);
        blocks = [textBlock];
        if (note.drawingId) {
          const inkBlock: DailyPageBlock = {
            id: createId(),
            noteId: note.id,
            position: 1,
            type: 'ink',
            drawingId: note.drawingId,
            createdAt,
            updatedAt: createdAt,
          };
          await db.put('daily_page_blocks', inkBlock);
          blocks.push(inkBlock);
        }
      }
      return blocks.sort((left, right) => left.position - right.position);
    },

    async insertPageBlock(
      date: string,
      type: DailyPageBlock['type'],
      afterBlockId?: string,
    ): Promise<DailyPageBlock> {
      const note = await this.getOrCreateForDate(date);
      const blocks = await this.listPageBlocks(date);
      const afterIndex = afterBlockId
        ? blocks.findIndex((block) => block.id === afterBlockId)
        : blocks.length - 1;
      const insertionIndex = afterIndex < 0 ? blocks.length : afterIndex + 1;
      const now = nowIso();
      for (let index = insertionIndex; index < blocks.length; index += 1) {
        await db.put('daily_page_blocks', { ...blocks[index], position: index + 1 });
      }

      if (type === 'text') {
        const block: DailyPageBlock = {
          id: createId(),
          noteId: note.id,
          position: insertionIndex,
          type: 'text',
          text: '',
          createdAt: now,
          updatedAt: now,
        };
        await db.put('daily_page_blocks', block);
        return block;
      }

      const drawing: Drawing = {
        id: createId(),
        noteId: note.id,
        format: 'ink-v1',
        data: '',
        createdAt: now,
        updatedAt: now,
      };
      const block: DailyPageBlock = {
        id: createId(),
        noteId: note.id,
        position: insertionIndex,
        type: 'ink',
        drawingId: drawing.id,
        createdAt: now,
        updatedAt: now,
      };
      await db.put('drawings', drawing);
      await db.put('daily_page_blocks', block);
      return block;
    },

    async savePageTextBlock(blockId: string, text: string): Promise<DailyPageBlock> {
      const block = await db.getById<DailyPageBlock>('daily_page_blocks', blockId);
      if (!block || block.type !== 'text') throw new Error('Text block not found');
      const next: DailyPageBlock = { ...block, text, updatedAt: nextUpdatedAt(block.updatedAt) };
      await db.put('daily_page_blocks', next);
      return next;
    },

    async savePageInkBlock(blockId: string, data: string): Promise<Drawing> {
      const block = await db.getById<DailyPageBlock>('daily_page_blocks', blockId);
      if (!block || block.type !== 'ink') throw new Error('Ink block not found');
      const existing = await db.getById<Drawing>('drawings', block.drawingId);
      const now = nowIso();
      const drawing: Drawing = {
        id: block.drawingId,
        noteId: block.noteId,
        format: 'ink-v1',
        data,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await db.put('drawings', drawing);
      await db.put('daily_page_blocks', { ...block, updatedAt: now });
      return drawing;
    },

    async clearPageBlocks(date: string): Promise<void> {
      const note = await this.getOrCreateForDate(date);
      const blocks = await db.findWhere<DailyPageBlock>('daily_page_blocks', { noteId: note.id });
      for (const block of blocks) {
        if (block.type === 'ink') await db.delete('drawings', block.drawingId);
        await db.delete('daily_page_blocks', block.id);
      }
      await db.put('daily_notes', { ...note, drawingId: undefined });
    },
  };
}

export type NotesRepository = ReturnType<typeof createNotesRepository>;
