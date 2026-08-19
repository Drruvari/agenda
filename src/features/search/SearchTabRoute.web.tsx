import { useAppSheets } from '@/features/app-sheets/AppSheetsContext';
import { useOpenThenLeave } from '@/hooks/useOpenThenLeave';

export function SearchTabRoute() {
  const { openSearch } = useAppSheets();
  useOpenThenLeave(openSearch);
  return null;
}
