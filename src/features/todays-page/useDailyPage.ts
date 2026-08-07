import { AppState } from 'react-native';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { Repositories } from '@/data/repositories';
import {
  DailyNoteSession,
  type SaveStatus,
} from '@/features/todays-page/dailyNoteSession';
import {
  EMPTY_INK,
  type InkDocument,
  parseInk,
  serializeInk,
} from '@/features/todays-page/inkFormat';
import { triggerHaptic } from '@/lib/haptics';

type Options = {
  date: string;
  repos: Repositories;
  onError?: (message: string) => void;
  onPersisted?: () => void;
};

type PendingInk = { value: InkDocument; date: string; noteId: string | null };

const INK_SAVE_MS = 500;

export function useDailyPage({ date, repos, onError, onPersisted }: Options) {
  const onErrorRef = useRef(onError);
  const onPersistedRef = useRef(onPersisted);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    onPersistedRef.current = onPersisted;
  }, [onPersisted]);

  const session = useRef(
    new DailyNoteSession({
      notes: repos.notes,
      onError: (message) => {
        triggerHaptic('error');
        onErrorRef.current?.(message);
      },
      onPersisted: () => onPersistedRef.current?.(),
    }),
  ).current;

  const note = useSyncExternalStore(
    (listener) => session.subscribe(listener),
    () => session.getSnapshot(),
    () => session.getSnapshot(),
  );

  const [ink, setInk] = useState<InkDocument>({ ...EMPTY_INK, strokes: [] });
  const [drawingId, setDrawingId] = useState<string | undefined>();
  const drawingIdRef = useRef<string | undefined>(undefined);
  const inkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingInk = useRef<PendingInk | null>(null);
  const dateRef = useRef(date);

  useEffect(() => {
    drawingIdRef.current = drawingId;
  }, [drawingId]);

  const fail = useCallback((error: unknown, fallback: string) => {
    triggerHaptic('error');
    onErrorRef.current?.(error instanceof Error ? error.message : fallback);
  }, []);

  const saveInkNow = useCallback(
    async (nextInk: InkDocument, forDate: string, forNoteId: string | null) => {
      try {
        let id = forNoteId;
        if (!id) {
          const created = await repos.notes.getOrCreateForDate(forDate);
          id = created.id;
        }
        const saved = await repos.notes.saveDrawing(
          id,
          serializeInk(nextInk),
          drawingIdRef.current,
        );
        if (dateRef.current === forDate) {
          setDrawingId(saved.id);
          drawingIdRef.current = saved.id;
          onPersistedRef.current?.();
        }
      } catch (error) {
        fail(error, 'Could not save drawing');
      }
    },
    [fail, repos.notes],
  );

  const flushInk = useCallback(async () => {
    if (inkTimer.current) {
      clearTimeout(inkTimer.current);
      inkTimer.current = null;
    }
    const inkPending = pendingInk.current;
    pendingInk.current = null;
    if (inkPending) {
      await saveInkNow(inkPending.value, inkPending.date, inkPending.noteId);
    }
  }, [saveInkNow]);

  useEffect(() => {
    let cancelled = false;
    dateRef.current = date;

    // Clear ink immediately so the previous day's drawing cannot be edited into the new date.
    setInk({ ...EMPTY_INK, strokes: [] });
    setDrawingId(undefined);
    drawingIdRef.current = undefined;

    void (async () => {
      await flushInk();
      if (cancelled) return;

      await session.setDate(date);
      if (cancelled || dateRef.current !== date) return;

      try {
        const loaded = await repos.notes.getByDate(date);
        if (cancelled || dateRef.current !== date) return;

        let nextInk: InkDocument = { ...EMPTY_INK, strokes: [] };
        let nextDrawingId: string | undefined;
        if (loaded?.drawingId) {
          const drawing = await repos.notes.getDrawing(loaded.drawingId);
          if (cancelled || dateRef.current !== date) return;
          nextInk = parseInk(drawing?.data);
          nextDrawingId = loaded.drawingId;
        }

        setDrawingId(nextDrawingId);
        drawingIdRef.current = nextDrawingId;
        setInk(nextInk);
      } catch (error) {
        if (!cancelled) fail(error, 'Could not open today’s page');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date, fail, flushInk, repos.notes, session]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void session.flushPending();
        void flushInk();
      }
    });
    return () => {
      subscription.remove();
      void session.flushPending();
      void flushInk();
    };
  }, [flushInk, session]);

  useEffect(() => {
    return () => {
      void session.flushPending();
    };
  }, [session]);

  const changeBody = useCallback(
    (value: string, options?: { continueNumberedLists?: boolean }) => {
      session.changeBody(value, options);
    },
    [session],
  );

  const changeInk = useCallback(
    (next: InkDocument) => {
      setInk(next);
      const forDate = dateRef.current;
      const forNoteId = session.getSnapshot().noteId;
      pendingInk.current = { value: next, date: forDate, noteId: forNoteId };
      if (inkTimer.current) clearTimeout(inkTimer.current);
      inkTimer.current = setTimeout(() => {
        pendingInk.current = null;
        void saveInkNow(next, forDate, forNoteId);
      }, INK_SAVE_MS);
    },
    [saveInkNow, session],
  );

  const retrySave = useCallback(async () => {
    await session.retrySave();
  }, [session]);

  const ready = note.ready && note.date === date;

  return {
    ready,
    body: ready || note.date === date ? note.body : '',
    ink,
    noteId: note.noteId,
    drawingId,
    saveStatus: note.saveStatus as SaveStatus,
    recovered: note.recovered,
    changeBody,
    changeInk,
    retrySave,
  };
}
