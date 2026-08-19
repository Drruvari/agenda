import { useCallback } from 'react';

import { useItemEditor } from '@/features/item-editor/ItemEditorContext';
import { useOpenThenLeave } from '@/hooks/useOpenThenLeave';

export function TaskCreateScreen() {
  const { openCreate } = useItemEditor();
  const open = useCallback(() => openCreate('task'), [openCreate]);
  useOpenThenLeave(open);
  return null;
}
