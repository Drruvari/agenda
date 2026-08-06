import { DateTimePicker } from '@expo/ui/community/datetime-picker';

import { useAppTheme } from '@/theme';

type Props = {
  onChange: (date: Date) => void;
  onClose: () => void;
  onToday: () => void;
  value: Date;
  visible: boolean;
  weekStartsOn?: 'sunday' | 'monday';
};

/** Material 3 date dialog — mounts only while visible. */
export function CalendarPickerModal({ onChange, onClose, value, visible }: Props) {
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
