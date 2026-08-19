import { useCallback } from 'react';

import { useItemEditor } from '@/features/item-editor/ItemEditorContext';
import { useOpenThenLeave } from '@/hooks/useOpenThenLeave';

export function RoutineCreateScreen() {
  const { openCreate } = useItemEditor();
  const open = useCallback(() => openCreate('routine'), [openCreate]);
  useOpenThenLeave(open, '/routines');
  return null;
}
