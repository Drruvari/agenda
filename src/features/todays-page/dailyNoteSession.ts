import type { NotesRepository } from '@/data/repositories/notes.repository';
import { NoteConflictError } from '@/data/repositories/notes.repository';
import type { DailyNote } from '@/data/schema/types';

export type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

export type DailyNoteSessionSnapshot = {
  date: string;
  body: string;
  noteId: string | null;
  baseUpdatedAt: string | null;
  ready: boolean;
  saveStatus: SaveStatus;
  recovered: boolean;
};

type Listener = () => void;

type Options = {
  notes: NotesRepository;
  onError?: (message: string) => void;
  onPersisted?: () => void;
};

const SAVE_MS = 500;
const DRAFT_MS = 100;

/**
 * Serializable daily-note session: flush-before-load on date change, draft buffer,
 * CAS saves, and explicit save status. Used by `useDailyPage` and unit tests.
 */
export class DailyNoteSession {
  private date = '';
  private body = '';
  private noteId: string | null = null;
  private baseUpdatedAt: string | null = null;
  private ready = false;
  private saveStatus: SaveStatus = 'clean';
  private recovered = false;

  private pendingBody: { value: string; date: string } | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private draftTimer: ReturnType<typeof setTimeout> | null = null;
  private writeChain: Promise<void> = Promise.resolve();
  private loadGeneration = 0;
  private listeners = new Set<Listener>();
  /** Cached for useSyncExternalStore — must be referentially stable between emits. */
  private snapshot: DailyNoteSessionSnapshot = {
    date: '',
    body: '',
    noteId: null,
    baseUpdatedAt: null,
    ready: false,
    saveStatus: 'clean',
    recovered: false,
  };

  constructor(private readonly options: Options) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): DailyNoteSessionSnapshot {
    return this.snapshot;
  }

  private refreshSnapshot(): void {
    this.snapshot = {
      date: this.date,
      body: this.body,
      noteId: this.noteId,
      baseUpdatedAt: this.baseUpdatedAt,
      ready: this.ready,
      saveStatus: this.saveStatus,
      recovered: this.recovered,
    };
  }

  /** Switch to a date: flush previous work, clear UI, then load. */
  async setDate(nextDate: string): Promise<void> {
    if (nextDate === this.date && this.ready) return;

    const generation = ++this.loadGeneration;
    await this.flushPending();

    if (generation !== this.loadGeneration) return;

    this.date = nextDate;
    this.ready = false;
    this.body = '';
    this.noteId = null;
    this.baseUpdatedAt = null;
    this.recovered = false;
    this.saveStatus = 'clean';
    this.emit();

    try {
      const loaded = await this.options.notes.loadForDate(nextDate);
      if (generation !== this.loadGeneration || this.date !== nextDate) return;

      this.noteId = loaded.note.id;
      this.baseUpdatedAt = loaded.note.updatedAt;
      this.body = loaded.body;
      this.recovered = loaded.recovered;
      this.ready = true;
      this.saveStatus = loaded.recovered ? 'dirty' : 'clean';
      this.emit();

      if (loaded.recovered) {
        // Persist recovered draft through the normal save path.
        this.queueCanonicalSave(loaded.body, nextDate);
      }
    } catch (error) {
      if (generation !== this.loadGeneration) return;
      this.options.onError?.(error instanceof Error ? error.message : 'Could not open today’s page');
      this.ready = true;
      this.emit();
    }
  }

  changeBody(value: string, options?: { continueNumberedLists?: boolean }): void {
    if (!this.ready) return;

    let nextValue = value;
    if (options?.continueNumberedLists && value.endsWith('\n')) {
      const previousLine = value.slice(0, -1).split('\n').at(-1) ?? '';
      const match = previousLine.match(/^(\s*)(\d+)\.\s+.+/);
      if (match) nextValue += `${match[1]}${Number(match[2]) + 1}. `;
    }

    const forDate = this.date;
    this.body = nextValue;
    this.saveStatus = 'dirty';
    this.recovered = false;
    this.pendingBody = { value: nextValue, date: forDate };
    this.emit();

    if (this.draftTimer) clearTimeout(this.draftTimer);
    this.draftTimer = setTimeout(() => {
      this.draftTimer = null;
      void this.writeDraft(nextValue, forDate);
    }, DRAFT_MS);

    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      if (this.pendingBody?.date === forDate && this.pendingBody.value === nextValue) {
        this.pendingBody = null;
      }
      this.queueCanonicalSave(nextValue, forDate);
    }, SAVE_MS);
  }

  async retrySave(): Promise<void> {
    if (!this.ready) return;
    this.pendingBody = null;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.queueCanonicalSave(this.body, this.date);
  }

  async flushPending(): Promise<void> {
    if (this.draftTimer) {
      clearTimeout(this.draftTimer);
      this.draftTimer = null;
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    const pending = this.pendingBody;
    this.pendingBody = null;

    if (pending) {
      await this.writeDraft(pending.value, pending.date);
      await this.queueCanonicalSave(pending.value, pending.date);
    } else {
      // Drain any in-flight writes from the previous date.
      await this.writeChain;
    }
  }

  dispose(): void {
    this.loadGeneration += 1;
    if (this.draftTimer) clearTimeout(this.draftTimer);
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.draftTimer = null;
    this.saveTimer = null;
    this.listeners.clear();
  }

  private emit(): void {
    this.refreshSnapshot();
    for (const listener of this.listeners) listener();
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    this.writeChain = this.writeChain.then(task, task);
    return this.writeChain;
  }

  private queueCanonicalSave(bodyText: string, forDate: string): Promise<void> {
    return this.enqueue(async () => {
      const isCurrent = forDate === this.date;
      if (isCurrent) {
        this.saveStatus = 'saving';
        this.emit();
      }

      try {
        let expectedUpdatedAt: string | undefined;
        if (isCurrent) {
          expectedUpdatedAt = this.baseUpdatedAt ?? undefined;
        } else {
          const existing = await this.options.notes.getByDate(forDate);
          expectedUpdatedAt = existing?.updatedAt;
        }

        const saved = await this.options.notes.saveBody(forDate, bodyText, expectedUpdatedAt);

        if (isCurrent) {
          this.baseUpdatedAt = saved.updatedAt;
          this.noteId = saved.id;
          if (this.body === bodyText) {
            this.recovered = false;
            this.saveStatus = 'saved';
            this.emit();
            setTimeout(() => {
              if (this.date === forDate && this.saveStatus === 'saved' && this.body === bodyText) {
                this.saveStatus = 'clean';
                this.emit();
              }
            }, 1600);
          } else {
            this.emit();
          }
          this.options.onPersisted?.();
        }

        const draft = await this.options.notes.getDraft(forDate);
        if (!draft || draft.bodyText === bodyText) {
          await this.options.notes.clearDraft(forDate);
        }
      } catch (error) {
        if (error instanceof NoteConflictError) {
          if (isCurrent) {
            this.baseUpdatedAt = error.current.updatedAt;
            this.saveStatus = 'error';
            this.emit();
          }
          this.options.onError?.('Note changed elsewhere — tap to retry');
          return;
        }

        if (isCurrent) {
          this.saveStatus = 'error';
          this.emit();
        }
        this.options.onError?.(error instanceof Error ? error.message : 'Could not save note');
      }
    });
  }

  private async writeDraft(bodyText: string, forDate: string): Promise<void> {
    try {
      let baseUpdatedAt = this.baseUpdatedAt;
      if (forDate !== this.date || !baseUpdatedAt) {
        const note = await this.options.notes.getOrCreateForDate(forDate);
        baseUpdatedAt = note.updatedAt;
      }
      await this.options.notes.upsertDraft(forDate, bodyText, baseUpdatedAt);
    } catch {
      // Draft write failures must not block typing; canonical save still runs.
    }
  }
}

/** Test helper: apply numbered-list continuation the same way as the session. */
export function applyNumberedListContinuation(value: string): string {
  if (!value.endsWith('\n')) return value;
  const previousLine = value.slice(0, -1).split('\n').at(-1) ?? '';
  const match = previousLine.match(/^(\s*)(\d+)\.\s+.+/);
  if (!match) return value;
  return `${value}${match[1]}${Number(match[2]) + 1}. `;
}

export type { DailyNote };
