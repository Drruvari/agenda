import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type AppSheet = 'search' | 'routines';

type AppSheetsValue = {
  sheet: AppSheet | null;
  openSearch: () => void;
  openRoutines: () => void;
  close: () => void;
};

const AppSheetsContext = createContext<AppSheetsValue | null>(null);

export function AppSheetsProvider({ children }: PropsWithChildren) {
  const [sheet, setSheet] = useState<AppSheet | null>(null);
  const openSearch = useCallback(() => setSheet('search'), []);
  const openRoutines = useCallback(() => setSheet('routines'), []);
  const close = useCallback(() => setSheet(null), []);
  const value = useMemo(
    () => ({ sheet, openSearch, openRoutines, close }),
    [sheet, openSearch, openRoutines, close],
  );
  return <AppSheetsContext.Provider value={value}>{children}</AppSheetsContext.Provider>;
}

export function useAppSheets() {
  const value = useContext(AppSheetsContext);
  if (!value) throw new Error('useAppSheets must be used within AppSheetsProvider');
  return value;
}
