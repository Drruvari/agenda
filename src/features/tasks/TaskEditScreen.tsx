import { router } from 'expo-router';
import { useEffect } from 'react';

import { useItemEditor } from '@/features/item-editor';

export function TaskEditScreen() {
  const { openCreate } = useItemEditor();

  useEffect(() => {
    openCreate('task');
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [openCreate]);

  return null;
}
