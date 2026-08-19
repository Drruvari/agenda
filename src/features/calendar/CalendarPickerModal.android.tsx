import { DateTimePicker } from '@expo/ui/community/datetime-picker';

import { useAppTheme } from '@/theme/AppThemeProvider';

import type { CalendarPickerModalProps } from './CalendarPickerModal.types';

export function CalendarPickerModal({
  onChange,
  onClose,
  value,
  visible,
}: CalendarPickerModalProps) {
  const theme = useAppTheme();

  if (!visible) {
    return null;
  }

  return (
    <DateTimePicker
      accentColor={theme.primary}
      mode="date"
      onDismiss={onClose}
      onValueChange={(_, date) => {
        onChange(date);
        onClose();
      }}
      presentation="dialog"
      value={value}
    />
  );
}
