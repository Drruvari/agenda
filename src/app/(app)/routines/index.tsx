import { useAppSheets } from '@/features/app-sheets/AppSheetsContext';
import { useOpenThenLeave } from '@/hooks/useOpenThenLeave';

export default function RoutinesRoute() {
  const { openRoutines } = useAppSheets();
  useOpenThenLeave(openRoutines);
  return null;
}
