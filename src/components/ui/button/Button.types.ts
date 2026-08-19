import type { StyleProp, ViewStyle } from 'react-native';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  role?: 'default' | 'cancel' | 'destructive';
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'prominent';
};
