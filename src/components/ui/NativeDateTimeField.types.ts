export type NativeDateFieldProps = {
  embedded?: boolean;
  onChange: (value: string) => void;
  value: string;
};

export type NativeTimeFieldProps = {
  embedded?: boolean;
  onChange: (value: string) => void;
  optional?: boolean;
  value: string;
};
