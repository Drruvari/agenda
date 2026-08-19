import { StyleSheet, Text, type TextProps } from 'react-native';

import { useAppTheme } from '@/theme/AppThemeProvider';
import { type } from '@/theme/type';

type Props = TextProps & {
  title: string;
};

export function ScreenHeader({ title, style, ...props }: Props) {
  const theme = useAppTheme();
  return (
    <Text
      accessibilityRole="header"
      {...props}
      style={[styles.title, { color: theme.text }, style]}
    >
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.largeTitle,
    paddingHorizontal: 4,
  },
});
