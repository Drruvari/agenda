import { RoutinesSheet } from '@/features/routines/RoutinesScreen';
import { SearchSheet } from '@/features/search/SearchScreen';

import { useAppSheets } from './AppSheetsContext';

export function AppSheetsHost() {
  const { sheet, close } = useAppSheets();
  if (sheet === 'search') return <SearchSheet onDismiss={close} />;
  if (sheet === 'routines') return <RoutinesSheet onDismiss={close} />;
  return null;
}
