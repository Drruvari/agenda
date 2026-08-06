import { router } from 'expo-router';
import { useEffect } from 'react';

import { useItemEditor } from '@/features/item-editor';

/** Deep-link / legacy route → Universal sheet. */
export function TaskCreateScreen() {
  const { openCreate } = useItemEditor();

  useEffect(() => {
    openCreate('task');
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [openCreate]);

  return null;
}
