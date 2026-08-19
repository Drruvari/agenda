import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import type { Repositories } from '@/data/repositories/repositories';
import type { DailyPageBlock } from '@/data/schema/types';
import { DailyNoteSession } from '@/features/todays-page/dailyNoteSession';
import {
  EMPTY_INK,
  type InkDocument,
  parseInk,
  serializeInk,
} from '@/features/todays-page/inkFormat';
import { triggerHaptic } from '@/lib/haptics';

export type DailyPageBlockState =
  | Extract<DailyPageBlock, { type: 'text' }>
  | (Extract<DailyPageBlock, { type: 'ink' }> & { ink: InkDocument });

type Options = {
  date: string;
  repos: Repositories;
  onError?: (message: string) => void;
  onPersisted?: () => void;
};

const SAVE_MS = 500;

export function useDailyPage({ date, repos, onError, onPersisted }: Options) {
  const onErrorRef = useRef(onError);
  const onPersistedRef = useRef(onPersisted);
  const dateRef = useRef(date);
  const blocksRef = useRef<DailyPageBlockState[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingRef = useRef(new Map<string, DailyPageBlockState>());
  const [blocks, setBlocks] = useState<DailyPageBlockState[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    onPersistedRef.current = onPersisted;
  }, [onPersisted]);

  const fail = useCallback((error: unknown, fallback: string) => {
    triggerHaptic('error');
    onErrorRef.current?.(error instanceof Error ? error.message : fallback);
  }, []);

  const [session] = useState(
    () =>
      new DailyNoteSession({
        notes: repos.notes,
        onError: (message) => {
          triggerHaptic('error');
          onError?.(message);
        },
        onPersisted,
      }),
  );
  const note = useSyncExternalStore(
    (listener) => session.subscribe(listener),
    () => session.getSnapshot(),
    () => session.getSnapshot(),
  );

  const persistBlock = useCallback(
    async (block: DailyPageBlockState) => {
      try {
        if (block.type === 'text') {
          await repos.notes.savePageTextBlock(block.id, block.text);
        } else {
          await repos.notes.savePageInkBlock(block.id, serializeInk(block.ink));
        }
        onPersistedRef.current?.();
      } catch (error) {
        fail(error, `Could not save ${block.type === 'text' ? 'writing' : 'drawing'}`);
      }
    },
    [fail, repos.notes],
  );

  const flushPending = useCallback(async () => {
    for (const timer of timersRef.current.values()) clearTimeout(timer);
    timersRef.current.clear();
    const pending = [...pendingRef.current.values()];
    pendingRef.current.clear();
    await Promise.all([session.flushPending(), ...pending.map(persistBlock)]);
  }, [persistBlock, session]);

  useEffect(() => {
    let cancelled = false;
    dateRef.current = date;

    void (async () => {
      await flushPending();
      await session.setDate(date);
      if (cancelled || dateRef.current !== date) return;
      try {
        const stored = await repos.notes.listPageBlocks(date);
        let loaded = await Promise.all(
          stored.map(async (block): Promise<DailyPageBlockState> => {
            if (block.type === 'text') return block;
            const drawing = await repos.notes.getDrawing(block.drawingId);
            return { ...block, ink: parseInk(drawing?.data) };
          }),
        );
        const snapshot = session.getSnapshot();
        if (snapshot.recovered) {
          const firstTextIndex = loaded.findIndex((block) => block.type === 'text');
          const firstText = loaded[firstTextIndex];
          if (firstText?.type === 'text') {
            loaded = loaded.map((block, index) =>
              block.type === 'text'
                ? { ...block, text: index === firstTextIndex ? snapshot.body : '' }
                : block,
            );
            await Promise.all(
              loaded
                .filter(
                  (block): block is Extract<DailyPageBlockState, { type: 'text' }> =>
                    block.type === 'text',
                )
                .map((block) => repos.notes.savePageTextBlock(block.id, block.text)),
            );
          }
        }
        if (cancelled || dateRef.current !== date) return;
        blocksRef.current = loaded;
        setBlocks(loaded);
        setReady(true);
      } catch (error) {
        if (!cancelled) {
          setReady(true);
          fail(error, 'Could not open today’s page');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date, fail, flushPending, repos.notes, session]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') void flushPending();
    });
    return () => {
      subscription.remove();
      void flushPending();
    };
  }, [flushPending]);

  const queueBlock = useCallback(
    (block: DailyPageBlockState) => {
      pendingRef.current.set(block.id, block);
      const currentTimer = timersRef.current.get(block.id);
      if (currentTimer) clearTimeout(currentTimer);
      timersRef.current.set(
        block.id,
        setTimeout(() => {
          timersRef.current.delete(block.id);
          pendingRef.current.delete(block.id);
          void persistBlock(block);
        }, SAVE_MS),
      );
    },
    [persistBlock],
  );

  const changeText = useCallback(
    (blockId: string, text: string, options?: { continueNumberedLists?: boolean }) => {
      let nextText = text;
      if (options?.continueNumberedLists && text.endsWith('\n')) {
        const previousLine = text.slice(0, -1).split('\n').at(-1) ?? '';
        const match = previousLine.match(/^(\s*)(\d+)\.\s+.+/);
        if (match) nextText += `${match[1]}${Number(match[2]) + 1}. `;
      }
      const next = blocksRef.current.map((block) =>
        block.id === blockId && block.type === 'text' ? { ...block, text: nextText } : block,
      );
      blocksRef.current = next;
      setBlocks(next);
      const changed = next.find((block) => block.id === blockId);
      if (changed) queueBlock(changed);
      session.changeBody(
        next
          .filter(
            (block): block is Extract<DailyPageBlockState, { type: 'text' }> =>
              block.type === 'text',
          )
          .map((block) => block.text)
          .filter(Boolean)
          .join('\n\n'),
      );
    },
    [queueBlock, session],
  );

  const changeInk = useCallback(
    (blockId: string, ink: InkDocument) => {
      const next = blocksRef.current.map((block) =>
        block.id === blockId && block.type === 'ink' ? { ...block, ink } : block,
      );
      blocksRef.current = next;
      setBlocks(next);
      const changed = next.find((block) => block.id === blockId);
      if (changed) queueBlock(changed);
    },
    [queueBlock],
  );

  const insertBlock = useCallback(
    async (type: DailyPageBlock['type'], afterBlockId?: string) => {
      try {
        const block = await repos.notes.insertPageBlock(dateRef.current, type, afterBlockId);
        const nextBlock: DailyPageBlockState =
          block.type === 'text' ? block : { ...block, ink: { ...EMPTY_INK, strokes: [] } };
        const afterIndex = afterBlockId
          ? blocksRef.current.findIndex((item) => item.id === afterBlockId)
          : blocksRef.current.length - 1;
        const next = [...blocksRef.current];
        next.splice(afterIndex < 0 ? next.length : afterIndex + 1, 0, nextBlock);
        blocksRef.current = next.map((item, position) => ({ ...item, position }));
        setBlocks(blocksRef.current);
        onPersistedRef.current?.();
        return nextBlock;
      } catch (error) {
        fail(error, 'Could not add page block');
        return null;
      }
    },
    [fail, repos.notes],
  );

  const clear = useCallback(async () => {
    await flushPending();
    await repos.notes.clearPageBlocks(dateRef.current);
    const [block] = await repos.notes.listPageBlocks(dateRef.current);
    if (block.type !== 'text') throw new Error('Could not reset page');
    const cleared = { ...block, text: '' };
    await repos.notes.savePageTextBlock(cleared.id, '');
    blocksRef.current = [cleared];
    setBlocks([cleared]);
    session.changeBody('');
    onPersistedRef.current?.();
  }, [flushPending, repos.notes, session]);

  const retrySave = useCallback(async () => {
    await flushPending();
    await session.retrySave();
  }, [flushPending, session]);

  return {
    blocks,
    ready: ready && note.ready && note.date === date,
    recovered: note.recovered,
    saveStatus: note.saveStatus,
    changeText,
    changeInk,
    insertBlock,
    clear,
    retrySave,
  };
}
