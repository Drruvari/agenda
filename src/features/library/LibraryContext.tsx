import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type LibrarySession =
  | { type: 'library'; quickCreate?: boolean }
  | { type: 'edit'; spaceId: string }
  | {
      type: 'picker';
      selectedId: string | null;
      onSelect: (spaceId: string | null) => void;
    };

type LibraryContextValue = {
  session: LibrarySession | null;
  openLibrary: () => void;
  openCreateSpace: () => void;
  openEditSpace: (spaceId: string) => void;
  openSpacePicker: (selectedId: string | null, onSelect: (spaceId: string | null) => void) => void;
  close: () => void;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<LibrarySession | null>(null);

  const openLibrary = useCallback(() => setSession({ type: 'library' }), []);
  const openCreateSpace = useCallback(() => setSession({ type: 'library', quickCreate: true }), []);
  const openEditSpace = useCallback((spaceId: string) => setSession({ type: 'edit', spaceId }), []);
  const openSpacePicker = useCallback(
    (selectedId: string | null, onSelect: (spaceId: string | null) => void) =>
      setSession({ type: 'picker', selectedId, onSelect }),
    [],
  );
  const close = useCallback(() => setSession(null), []);

  const value = useMemo(
    () => ({ session, openLibrary, openCreateSpace, openEditSpace, openSpacePicker, close }),
    [session, openLibrary, openCreateSpace, openEditSpace, openSpacePicker, close],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const value = useContext(LibraryContext);
  if (!value) {
    throw new Error('useLibrary must be used within LibraryProvider');
  }
  return value;
}
