import { DateTimePicker } from '@expo/ui/community/datetime-picker';

import { useAppTheme } from '@/theme/AppThemeProvider';

type Props = {
  onChange: (date: Date) => void;
  onClose: () => void;
  value: Date;
  visible: boolean;
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
