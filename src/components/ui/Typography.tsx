import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { type AgendaTheme, fonts, typography, useThemeStyles } from '@/theme';

type Variant = 'display' | 'title' | 'body' | 'label' | 'caption' | 'section' | 'page';

type Props = TextProps & {
  variant?: Variant;
  color?: string;
  muted?: boolean;
};

export function Typography({ variant = 'body', color, muted, style, ...props }: Props) {
  const { styles } = useThemeStyles(createStyles);
  return (
    <Text
      {...props}
      style={[
        styles.base,
        styles[variant],
        muted ? styles.muted : null,
        color ? { color } : null,
        style as TextStyle,
      ]}
    />
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    base: {
      color: theme.text,
    },
    display: {
      fontSize: typography.display,
      lineHeight: 40,
      fontFamily: fonts.serif,
      letterSpacing: -0.4,
    },
    title: {
      fontSize: typography.title,
      fontFamily: fonts.sansSemi,
    },
    page: {
      fontSize: 24,
      fontFamily: fonts.serifItalic,
    },
    body: {
      fontSize: typography.body,
      fontFamily: fonts.sansMedium,
    },
    label: {
      fontSize: typography.label,
      fontFamily: fonts.sansMedium,
    },
    caption: {
      fontSize: typography.caption,
      fontFamily: fonts.sansMedium,
    },
    section: {
      fontSize: typography.caption,
      fontFamily: fonts.sansSemi,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: theme.textSecondary,
    },
    muted: {
      color: theme.textSecondary,
      fontFamily: fonts.sans,
    },
  });
}
