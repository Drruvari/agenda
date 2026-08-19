export type SpacePickerRowProps = {
  label: string;
  last?: boolean;
  onChange: (value: string) => void;
  spaces: { label: string; value: string }[];
  value: string;
};
