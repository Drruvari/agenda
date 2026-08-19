export type EditorPickerRowProps = {
  displayValue?: string;
  label: string;
  last?: boolean;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
};
