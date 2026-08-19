import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useItemEditor } from '@/features/item-editor/ItemEditorContext';
import { leaveCurrentRoute } from '@/hooks/useOpenThenLeave';

export function RoutineDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const routineId = Array.isArray(id) ? id[0] : id;
  const { openEditRoutine } = useItemEditor();

  useEffect(() => {
    if (routineId) openEditRoutine(routineId);
    leaveCurrentRoute();
  }, [openEditRoutine, routineId]);

  return null;
}
