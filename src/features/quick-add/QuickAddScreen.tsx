import { useItemEditor } from '@/features/item-editor/ItemEditorContext';
import { useOpenThenLeave } from '@/hooks/useOpenThenLeave';

export function QuickAddScreen() {
  const { openQuickAdd } = useItemEditor();
  useOpenThenLeave(openQuickAdd);
  return null;
}
