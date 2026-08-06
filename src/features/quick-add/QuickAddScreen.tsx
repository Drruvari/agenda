import { router } from 'expo-router';
import { useEffect } from 'react';

import { useItemEditor } from '@/features/item-editor';

/** Deep-link / legacy route → Universal quick-add sheet. */
export function QuickAddScreen() {
  const { openQuickAdd } = useItemEditor();

  useEffect(() => {
    openQuickAdd();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [openQuickAdd]);

  return null;
}
