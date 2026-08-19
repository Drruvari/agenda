export type CalendarPickerModalProps = {
  onChange: (date: Date) => void;
  onClose: () => void;
  value: Date;
  visible: boolean;
};
