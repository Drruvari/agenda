import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { EditorKind, ItemEditorMode, ItemEditorSession } from './types';

type ItemEditorContextValue = {
  session: ItemEditorSession | null;
  open: (mode: ItemEditorMode) => void;
  openCreate: (kind?: EditorKind) => void;
  openEdit: (itemId: string) => void;
  openQuickAdd: () => void;
  close: () => void;
};

const ItemEditorContext = createContext<ItemEditorContextValue | null>(null);

export function ItemEditorProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<ItemEditorSession | null>(null);

  const open = useCallback((mode: ItemEditorMode) => {
    setSession({ mode });
  }, []);

  const openCreate = useCallback(
    (kind: EditorKind = 'task') => {
      open({ type: 'create', kind });
    },
    [open],
  );

  const openEdit = useCallback(
    (itemId: string) => {
      open({ type: 'edit', itemId });
    },
    [open],
  );

  const openQuickAdd = useCallback(() => {
    open({ type: 'quick-add' });
  }, [open]);

  const close = useCallback(() => {
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, open, openCreate, openEdit, openQuickAdd, close }),
    [session, open, openCreate, openEdit, openQuickAdd, close],
  );

  return <ItemEditorContext.Provider value={value}>{children}</ItemEditorContext.Provider>;
}

export function useItemEditor(): ItemEditorContextValue {
  const value = useContext(ItemEditorContext);
  if (!value) {
    throw new Error('useItemEditor must be used within ItemEditorProvider');
  }
  return value;
}
