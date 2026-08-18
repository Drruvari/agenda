import { describe, expect, it } from 'vitest';

import { createMemoryDatabase } from '@/data/database/memory';
import type { DailyNote, Drawing } from '@/data/schema/types';

import { createNotesRepository } from './notes.repository';

describe('daily page blocks', () => {
  it('converts an existing note body and drawing into ordered blocks', async () => {
    const db = createMemoryDatabase();
    const notes = createNotesRepository(db);
    const note: DailyNote = {
      id: 'note-1',
      date: '2026-08-17',
      bodyText: 'Existing writing',
      drawingId: 'drawing-1',
      updatedAt: '2026-08-17T08:00:00.000Z',
    };
    const drawing: Drawing = {
      id: 'drawing-1',
      noteId: note.id,
      format: 'ink-v1',
      data: '{"version":1,"strokes":[]}',
      createdAt: note.updatedAt,
      updatedAt: note.updatedAt,
    };
    await db.put('daily_notes', note);
    await db.put('drawings', drawing);

    const blocks = await notes.listPageBlocks(note.date);

    expect(blocks).toMatchObject([
      { noteId: note.id, position: 0, type: 'text', text: 'Existing writing' },
      { noteId: note.id, position: 1, type: 'ink', drawingId: drawing.id },
    ]);
  });

  it('inserts text and ink blocks in document order', async () => {
    const notes = createNotesRepository(createMemoryDatabase());
    const [first] = await notes.listPageBlocks('2026-08-17');
    const ink = await notes.insertPageBlock('2026-08-17', 'ink', first.id);
    const text = await notes.insertPageBlock('2026-08-17', 'text', ink.id);

    await notes.savePageTextBlock(text.id, 'After the sketch');

    expect(await notes.listPageBlocks('2026-08-17')).toMatchObject([
      { id: first.id, position: 0, type: 'text' },
      { id: ink.id, position: 1, type: 'ink' },
      { id: text.id, position: 2, type: 'text', text: 'After the sketch' },
    ]);
  });
});
