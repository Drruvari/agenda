import type { DatabaseClient } from '@/data/database/types';
import type { Repositories } from '@/data/repositories';
import { formatLongDate } from '@/data/schema/ids';
import type {
  AgendaItem,
  AppSettings,
  DailyNote,
  Drawing,
  Routine,
  RoutineCompletion,
  Space,
} from '@/data/schema/types';
import { DEFAULT_SETTINGS } from '@/data/schema/types';

export type AgendaBackup = {
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  data: {
    spaces: Space[];
    agendaItems: AgendaItem[];
    routines: Routine[];
    routineCompletions: RoutineCompletion[];
    dailyNotes: DailyNote[];
    drawings: Drawing[];
  };
};

export async function createBackup(
  db: DatabaseClient,
  settings: AppSettings,
): Promise<AgendaBackup> {
  const [spaces, agendaItems, routines, routineCompletions, dailyNotes, drawings] =
    await Promise.all([
      db.getAll<Space>('spaces'),
      db.getAll<AgendaItem>('agenda_items'),
      db.getAll<Routine>('routines'),
      db.getAll<RoutineCompletion>('routine_completions'),
      db.getAll<DailyNote>('daily_notes'),
      db.getAll<Drawing>('drawings'),
    ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    data: { spaces, agendaItems, routines, routineCompletions, dailyNotes, drawings },
  };
}

export function parseBackup(raw: string): AgendaBackup {
  const parsed = JSON.parse(raw) as Partial<AgendaBackup>;
  const data = parsed.data;
  if (
    parsed.version !== 1 ||
    !parsed.settings ||
    !data ||
    !Array.isArray(data.spaces) ||
    !Array.isArray(data.agendaItems) ||
    !Array.isArray(data.routines) ||
    !Array.isArray(data.routineCompletions) ||
    !Array.isArray(data.dailyNotes) ||
    !Array.isArray(data.drawings)
  ) {
    throw new Error('This is not a valid Agenda backup.');
  }
  return {
    ...(parsed as AgendaBackup),
    settings: {
      general: { ...DEFAULT_SETTINGS.general, ...parsed.settings.general },
      editor: { ...DEFAULT_SETTINGS.editor, ...parsed.settings.editor },
    },
  };
}

export async function restoreBackup(db: DatabaseClient, backup: AgendaBackup): Promise<void> {
  await db.withTransaction(async () => {
    const drawings = await db.getAll<Drawing>('drawings');
    for (const drawing of drawings) await db.delete('drawings', drawing.id);

    const notes = await db.getAll<DailyNote>('daily_notes');
    for (const note of notes) await db.delete('daily_notes', note.id);

    const completions = await db.getAll<RoutineCompletion>('routine_completions');
    for (const completion of completions) {
      await db.delete('routine_completions', `${completion.routineId}::${completion.date}`);
    }

    const routines = await db.getAll<Routine>('routines');
    for (const routine of routines) await db.delete('routines', routine.id);

    const items = await db.getAll<AgendaItem>('agenda_items');
    for (const item of items) await db.delete('agenda_items', item.id);

    const spaces = await db.getAll<Space>('spaces');
    for (const space of spaces) await db.delete('spaces', space.id);

    for (const space of backup.data.spaces) await db.put('spaces', space);
    for (const item of backup.data.agendaItems) await db.put('agenda_items', item);
    for (const routine of backup.data.routines) await db.put('routines', routine);
    for (const completion of backup.data.routineCompletions) {
      await db.put('routine_completions', completion);
    }
    for (const note of backup.data.dailyNotes) await db.put('daily_notes', note);
    for (const drawing of backup.data.drawings) await db.put('drawings', drawing);
  });
}

export async function formatTodayPage(repos: Repositories, date: string): Promise<string> {
  const [items, note] = await Promise.all([
    repos.agenda.forDate(date),
    repos.notes.getByDate(date),
  ]);
  const lines = [formatLongDate(date), ''];

  for (const item of items) {
    const marker = item.type === 'task' ? (item.completed ? '[x]' : '[ ]') : '•';
    const time = item.time ? `${item.time} ` : '';
    lines.push(`${marker} ${time}${item.title}`);
    if (item.details) lines.push(`  ${item.details}`);
  }

  if (note?.bodyText.trim()) {
    if (items.length) lines.push('');
    lines.push('Today’s page', '', note.bodyText.trim());
  }

  if (!items.length && !note?.bodyText.trim()) lines.push('No items or notes for this day.');
  return lines.join('\n');
}

export function pageTextToHtml(text: string): string {
  const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 36px; color: #111; }
    pre { white-space: pre-wrap; font: inherit; line-height: 1.55; }
  </style></head><body><pre>${escaped}</pre></body></html>`;
}

export async function createDiagnostic(db: DatabaseClient) {
  const [items, spaces, routines, notes, drawings] = await Promise.all([
    db.getAll<AgendaItem>('agenda_items'),
    db.getAll<Space>('spaces'),
    db.getAll<Routine>('routines'),
    db.getAll<DailyNote>('daily_notes'),
    db.getAll<Drawing>('drawings'),
  ]);
  const bytes = JSON.stringify({ items, spaces, routines, notes, drawings }).length;
  return {
    items: items.length,
    spaces: spaces.length,
    routines: routines.length,
    notes: notes.length,
    drawings: drawings.length,
    bytes,
  };
}
