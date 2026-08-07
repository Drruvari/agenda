import { router } from 'expo-router';
import { useEffect } from 'react';

import { useAppSheets } from '@/features/app-sheets/AppSheetsContext';

export default function RoutinesRoute() {
  const { openRoutines } = useAppSheets();
  useEffect(() => {
    openRoutines();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [openRoutines]);
  return null;
}
