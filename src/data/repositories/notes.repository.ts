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
  return Boolean(
    draft &&
    draft.bodyText !== note.bodyText &&
    draft.baseUpdatedAt === note.updatedAt &&
    draft.updatedAt > note.updatedAt,
  );
}

function nextUpdatedAt(previous?: string): string {
  const now = nowIso();

  if (!previous || now > previous) {
    return now;
  }

  const previousTime = Date.parse(previous);

  if (Number.isNaN(previousTime)) {
    return now;
  }

  return new Date(previousTime + 1).toISOString();
}

function comparePageBlocks(left: DailyPageBlock, right: DailyPageBlock): number {
  return left.position - right.position;
}

export function createNotesRepository(db: DatabaseClient) {
  async function getByDate(date: string): Promise<DailyNote | null> {
    const notes = await db.findWhere<DailyNote>('daily_notes', { date });

    return notes[0] ?? null;
  }

  async function list(): Promise<DailyNote[]> {
    const [notes, blocks, drawings] = await Promise.all([
      db.getAll<DailyNote>('daily_notes'),
      db.getAll<DailyPageBlock>('daily_page_blocks'),
      db.getAll<Drawing>('drawings'),
    ]);

    const drawingsWithContent = new Set(
      drawings.filter((drawing) => drawing.data.trim().length > 0).map((drawing) => drawing.id),
    );

    const notesWithBlockContent = new Set(
      blocks
        .filter((block) => {
          if (block.type === 'text') {
            return block.text.trim().length > 0;
          }

          return drawingsWithContent.has(block.drawingId);
        })
        .map((block) => block.noteId),
    );

    return notes
      .filter(
        (note) =>
          note.bodyText.trim().length > 0 ||
          Boolean(note.drawingId) ||
          notesWithBlockContent.has(note.id),
      )
      .sort((left, right) => right.date.localeCompare(left.date));
  }

  async function getOrCreateForDate(date: string): Promise<DailyNote> {
    const existing = await getByDate(date);

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
      const concurrent = await getByDate(date);

      if (concurrent) {
        return concurrent;
      }

      throw new Error(`Could not create daily note for ${date}`);
    }
  }

  async function saveBody(
    date: string,
    bodyText: string,
    expectedUpdatedAt?: string,
  ): Promise<DailyNote> {
    const note = await getOrCreateForDate(date);

    if (expectedUpdatedAt !== undefined && note.updatedAt !== expectedUpdatedAt) {
      throw new NoteConflictError(note);
    }

    const next: DailyNote = {
      ...note,
      bodyText,
      updatedAt: nextUpdatedAt(note.updatedAt),
    };

    if (expectedUpdatedAt === undefined) {
      await db.put('daily_notes', next);

      return next;
    }

    const saved = await db.putDailyNoteIfUpdatedAtMatches(next, expectedUpdatedAt);

    if (saved) {
      return next;
    }

    const current = await getByDate(date);

    if (current) {
      throw new NoteConflictError(current);
    }

    throw new Error(`Daily note for ${date} disappeared while saving`);
  }

  async function getDraft(date: string): Promise<NoteDraft | null> {
    return db.getById<NoteDraft>('note_drafts', date);
  }

  async function upsertDraft(
    date: string,
    bodyText: string,
    baseUpdatedAt: string,
  ): Promise<NoteDraft> {
    const existing = await getDraft(date);

    const draft: NoteDraft = {
      date,
      bodyText,
      baseUpdatedAt,
      updatedAt: nextUpdatedAt(existing?.updatedAt),
    };

    await db.put('note_drafts', draft);

    return draft;
  }

  async function clearDraft(date: string): Promise<void> {
    await db.delete('note_drafts', date);
  }

  async function loadForDate(date: string): Promise<{
    note: DailyNote;
    body: string;
    recovered: boolean;
  }> {
    const [note, draft] = await Promise.all([getOrCreateForDate(date), getDraft(date)]);

    if (shouldRecoverDraft(note, draft) && draft) {
      return {
        note,
        body: draft.bodyText,
        recovered: true,
      };
    }

    if (draft && draft.bodyText === note.bodyText) {
      await clearDraft(date);
    }

    return {
      note,
      body: note.bodyText,
      recovered: false,
    };
  }

  async function getDrawing(drawingId: string): Promise<Drawing | null> {
    return db.getById<Drawing>('drawings', drawingId);
  }

  async function saveDrawing(noteId: string, data: string, drawingId?: string): Promise<Drawing> {
    const existing = drawingId ? await getDrawing(drawingId) : null;

    const now = nowIso();

    const drawing: Drawing = {
      id: drawingId ?? createId(),
      noteId,
      format: 'ink-v1',
      data,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

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
  }

  async function deleteDrawing(drawingId: string): Promise<void> {
    const drawing = await getDrawing(drawingId);

    if (!drawing) {
      return;
    }

    await db.delete('drawings', drawingId);

    const note = await db.getById<DailyNote>('daily_notes', drawing.noteId);

    if (note?.drawingId !== drawingId) {
      return;
    }

    await db.put('daily_notes', {
      ...note,
      drawingId: undefined,
      updatedAt: nextUpdatedAt(note.updatedAt),
    });
  }

  async function listPageBlocks(date: string): Promise<DailyPageBlock[]> {
    const note = await getOrCreateForDate(date);

    let blocks = await db.findWhere<DailyPageBlock>('daily_page_blocks', {
      noteId: note.id,
    });

    if (blocks.length > 0) {
      return blocks.sort(comparePageBlocks);
    }

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

    return blocks;
  }

  async function insertPageBlock(
    date: string,
    type: DailyPageBlock['type'],
    afterBlockId?: string,
  ): Promise<DailyPageBlock> {
    const note = await getOrCreateForDate(date);

    const blocks = await listPageBlocks(date);

    const afterIndex = afterBlockId
      ? blocks.findIndex((block) => block.id === afterBlockId)
      : blocks.length - 1;

    const insertionIndex = afterIndex < 0 ? blocks.length : afterIndex + 1;

    const now = nowIso();

    for (let index = insertionIndex; index < blocks.length; index += 1) {
      const block = blocks[index];

      if (!block) {
        continue;
      }

      await db.put('daily_page_blocks', {
        ...block,
        position: block.position + 1,
      });
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
  }

  async function savePageTextBlock(blockId: string, text: string): Promise<DailyPageBlock> {
    const block = await db.getById<DailyPageBlock>('daily_page_blocks', blockId);

    if (!block || block.type !== 'text') {
      throw new Error('Text block not found');
    }

    const next: DailyPageBlock = {
      ...block,
      text,
      updatedAt: nextUpdatedAt(block.updatedAt),
    };

    await db.put('daily_page_blocks', next);

    return next;
  }

  async function savePageInkBlock(blockId: string, data: string): Promise<Drawing> {
    const block = await db.getById<DailyPageBlock>('daily_page_blocks', blockId);

    if (!block || block.type !== 'ink') {
      throw new Error('Ink block not found');
    }

    const existing = await getDrawing(block.drawingId);

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

    await db.put('daily_page_blocks', {
      ...block,
      updatedAt: nextUpdatedAt(block.updatedAt),
    });

    return drawing;
  }

  async function clearPageBlocks(date: string): Promise<void> {
    const note = await getOrCreateForDate(date);

    const blocks = await db.findWhere<DailyPageBlock>('daily_page_blocks', {
      noteId: note.id,
    });

    for (const block of blocks) {
      if (block.type === 'ink') {
        await db.delete('drawings', block.drawingId);
      }

      await db.delete('daily_page_blocks', block.id);
    }

    await db.put('daily_notes', {
      ...note,
      drawingId: undefined,
    });
  }

  return {
    getByDate,
    list,
    getOrCreateForDate,
    saveBody,
    getDraft,
    upsertDraft,
    clearDraft,
    loadForDate,
    getDrawing,
    saveDrawing,
    deleteDrawing,
    listPageBlocks,
    insertPageBlock,
    savePageTextBlock,
    savePageInkBlock,
    clearPageBlocks,
  };
}

export type NotesRepository = ReturnType<typeof createNotesRepository>;
