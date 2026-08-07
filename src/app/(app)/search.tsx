import { router } from 'expo-router';
import { useEffect } from 'react';

import { useAppSheets } from '@/features/app-sheets/AppSheetsContext';

export default function SearchRoute() {
  const { openSearch } = useAppSheets();
  useEffect(() => {
    openSearch();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [openSearch]);
  return null;
}
