import { AppState } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Repositories } from '@/data/repositories';
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

const SAVE_MS = 500;

type PendingBody = { value: string; date: string };
type PendingInk = { value: InkDocument; date: string; noteId: string | null };

export function useDailyPage({ date, repos, onError, onPersisted }: Options) {
  const [body, setBody] = useState('');
  const [ink, setInk] = useState<InkDocument>({ ...EMPTY_INK, strokes: [] });
  const [noteId, setNoteId] = useState<string | null>(null);
  const [drawingId, setDrawingId] = useState<string | undefined>();
  const [loadedDate, setLoadedDate] = useState<string | null>(null);

  const bodyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBody = useRef<PendingBody | null>(null);
  const pendingInk = useRef<PendingInk | null>(null);
  const dateRef = useRef(date);
  const drawingIdRef = useRef<string | undefined>(undefined);
  const onErrorRef = useRef(onError);
  const onPersistedRef = useRef(onPersisted);
  const saveBodyNowRef = useRef<(nextBody: string, forDate: string) => Promise<void>>(async () => {});
  const saveInkNowRef = useRef<
    (nextInk: InkDocument, forDate: string, forNoteId: string | null) => Promise<void>
  >(async () => {});

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onPersistedRef.current = onPersisted;
  }, [onPersisted]);

  useEffect(() => {
    drawingIdRef.current = drawingId;
  }, [drawingId]);

  const fail = useCallback((error: unknown, fallback: string) => {
    triggerHaptic('error');
    onErrorRef.current?.(error instanceof Error ? error.message : fallback);
  }, []);

  const saveBodyNow = useCallback(
    async (nextBody: string, forDate: string) => {
      try {
        await repos.notes.saveBody(forDate, nextBody);
        if (dateRef.current === forDate) onPersistedRef.current?.();
      } catch (error) {
        fail(error, 'Could not save note');
      }
    },
    [fail, repos.notes],
  );

  const saveInkNow = useCallback(
    async (nextInk: InkDocument, forDate: string, forNoteId: string | null) => {
      try {
        let id = forNoteId;
        if (!id) {
          const note = await repos.notes.getOrCreateForDate(forDate);
          id = note.id;
          if (dateRef.current === forDate) setNoteId(note.id);
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

  saveBodyNowRef.current = saveBodyNow;
  saveInkNowRef.current = saveInkNow;

  const flushPending = useCallback(() => {
    if (bodyTimer.current) {
      clearTimeout(bodyTimer.current);
      bodyTimer.current = null;
    }
    if (inkTimer.current) {
      clearTimeout(inkTimer.current);
      inkTimer.current = null;
    }

    const bodyPending = pendingBody.current;
    const inkPending = pendingInk.current;
    pendingBody.current = null;
    pendingInk.current = null;

    if (bodyPending) void saveBodyNowRef.current(bodyPending.value, bodyPending.date);
    if (inkPending) {
      void saveInkNowRef.current(inkPending.value, inkPending.date, inkPending.noteId);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    flushPending();
    dateRef.current = date;

    void (async () => {
      try {
        const note = await repos.notes.getOrCreateForDate(date);
        if (cancelled || dateRef.current !== date) return;

        let nextInk: InkDocument = { ...EMPTY_INK, strokes: [] };
        if (note.drawingId) {
          const drawing = await repos.notes.getDrawing(note.drawingId);
          if (cancelled || dateRef.current !== date) return;
          nextInk = parseInk(drawing?.data);
        }

        setNoteId(note.id);
        setBody(note.bodyText);
        setDrawingId(note.drawingId);
        setInk(nextInk);
        setLoadedDate(date);
      } catch (error) {
        if (!cancelled) fail(error, 'Could not open today’s page');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date, fail, flushPending, repos.notes]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') flushPending();
    });
    return () => {
      subscription.remove();
      flushPending();
    };
  }, [flushPending]);

  const changeBody = useCallback(
    (value: string, options?: { continueNumberedLists?: boolean }) => {
      let nextValue = value;
      if (options?.continueNumberedLists && value.endsWith('\n')) {
        const previousLine = value.slice(0, -1).split('\n').at(-1) ?? '';
        const match = previousLine.match(/^(\s*)(\d+)\.\s+.+/);
        if (match) nextValue += `${match[1]}${Number(match[2]) + 1}. `;
      }

      setBody(nextValue);
      const forDate = dateRef.current;
      pendingBody.current = { value: nextValue, date: forDate };
      if (bodyTimer.current) clearTimeout(bodyTimer.current);
      bodyTimer.current = setTimeout(() => {
        pendingBody.current = null;
        void saveBodyNow(nextValue, forDate);
      }, SAVE_MS);
    },
    [saveBodyNow],
  );

  const changeInk = useCallback(
    (next: InkDocument) => {
      setInk(next);
      const forDate = dateRef.current;
      const forNoteId = noteId;
      pendingInk.current = { value: next, date: forDate, noteId: forNoteId };
      if (inkTimer.current) clearTimeout(inkTimer.current);
      inkTimer.current = setTimeout(() => {
        pendingInk.current = null;
        void saveInkNow(next, forDate, forNoteId);
      }, SAVE_MS);
    },
    [noteId, saveInkNow],
  );

  return {
    ready: loadedDate === date,
    body,
    ink,
    noteId,
    drawingId,
    changeBody,
    changeInk,
  };
}
