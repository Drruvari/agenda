import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useItemEditor } from '@/features/item-editor/ItemEditorContext';
import { leaveCurrentRoute } from '@/hooks/useOpenThenLeave';

export function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const itemId = Array.isArray(id) ? id[0] : id;
  const { openEdit } = useItemEditor();

  useEffect(() => {
    if (itemId) openEdit(itemId);
    leaveCurrentRoute();
  }, [itemId, openEdit]);

  return null;
}
