import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useItemEditor } from '@/features/item-editor/ItemEditorContext';

/** Deep-link / legacy route → the shared item editor bottom sheet. */
export function RoutineDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const routineId = Array.isArray(id) ? id[0] : id;
  const { openEditRoutine } = useItemEditor();

  useEffect(() => {
    if (routineId) openEditRoutine(routineId);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [openEditRoutine, routineId]);

  return null;
}
