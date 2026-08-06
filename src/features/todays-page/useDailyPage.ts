import { useCallback, useEffect, useRef, useState } from 'react';

import type { Repositories } from '@/data/repositories';
import { EMPTY_INK, type InkDocument, parseInk, serializeInk } from '@/features/todays-page/inkFormat';
import { triggerHaptic } from '@/lib/haptics';

type Options = {
  date: string;
  repos: Repositories;
  onError?: (message: string) => void;
  onPersisted?: () => void;
};

const SAVE_MS = 500;

export function useDailyPage({ date, repos, onError, onPersisted }: Options) {
  const [body, setBody] = useState('');
  const [ink, setInk] = useState<InkDocument>({ ...EMPTY_INK, strokes: [] });
  const [noteId, setNoteId] = useState<string | null>(null);
  const [drawingId, setDrawingId] = useState<string | undefined>();
  const [ready, setReady] = useState(false);

  const bodyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateRef = useRef(date);
  const drawingIdRef = useRef<string | undefined>(undefined);
  const onErrorRef = useRef(onError);
  const onPersistedRef = useRef(onPersisted);
  onErrorRef.current = onError;
  onPersistedRef.current = onPersisted;
  drawingIdRef.current = drawingId;

  const fail = useCallback((error: unknown, fallback: string) => {
    triggerHaptic('error');
    onErrorRef.current?.(error instanceof Error ? error.message : fallback);
  }, []);

  useEffect(() => {
    let cancelled = false;
    dateRef.current = date;

    if (bodyTimer.current) clearTimeout(bodyTimer.current);
    if (inkTimer.current) clearTimeout(inkTimer.current);

    setReady(false);
    setBody('');
    setInk({ ...EMPTY_INK, strokes: [] });
    setNoteId(null);
    setDrawingId(undefined);

    void (async () => {
      try {
        const note = await repos.notes.getOrCreateForDate(date);
        if (cancelled || dateRef.current !== date) return;

        setNoteId(note.id);
        setBody(note.bodyText);
        setDrawingId(note.drawingId);

        if (note.drawingId) {
          const drawing = await repos.notes.getDrawing(note.drawingId);
          if (cancelled || dateRef.current !== date) return;
          setInk(parseInk(drawing?.data));
        } else {
          setInk({ ...EMPTY_INK, strokes: [] });
        }
      } catch (error) {
        if (!cancelled) fail(error, 'Could not open today’s page');
      } finally {
        if (!cancelled && dateRef.current === date) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date, fail, repos.notes]);

  useEffect(
    () => () => {
      if (bodyTimer.current) clearTimeout(bodyTimer.current);
      if (inkTimer.current) clearTimeout(inkTimer.current);
    },
    [],
  );

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
      if (bodyTimer.current) clearTimeout(bodyTimer.current);
      bodyTimer.current = setTimeout(() => {
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
      if (inkTimer.current) clearTimeout(inkTimer.current);
      inkTimer.current = setTimeout(() => {
        void saveInkNow(next, forDate, forNoteId);
      }, SAVE_MS);
    },
    [noteId, saveInkNow],
  );

  return {
    ready,
    body,
    ink,
    noteId,
    drawingId,
    changeBody,
    changeInk,
  };
}
