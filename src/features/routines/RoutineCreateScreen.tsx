import { router } from 'expo-router';
import { useEffect } from 'react';

import { useItemEditor } from '@/features/item-editor';

export function RoutineCreateScreen() {
  const { openCreate } = useItemEditor();

  useEffect(() => {
    openCreate('routine');
    if (router.canGoBack()) router.back();
    else router.replace('/routines');
  }, [openCreate]);

  return null;
}
