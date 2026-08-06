import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useItemEditor } from '@/features/item-editor';

/** Deep-link / legacy route → Universal sheet for an existing item. */
export function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const itemId = Array.isArray(id) ? id[0] : id;
  const { openEdit } = useItemEditor();

  useEffect(() => {
    if (itemId) openEdit(itemId);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [itemId, openEdit]);

  return null;
}
