import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeStyles } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { typography } from '@/theme/tokens';
import { type } from '@/theme/type';

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
        style,
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
      ...type.largeTitle,
      fontFamily: fonts.serif,
      fontWeight: '400',
      letterSpacing: -0.4,
    },
    title: {
      ...type.title,
    },
    page: {
      fontSize: 24,
      fontFamily: fonts.serifItalic,
    },
    body: {
      ...type.body,
    },
    label: {
      fontSize: typography.label,
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
    },
    caption: {
      ...type.caption,
    },
    section: {
      ...type.sectionTitle,
      fontWeight: '600',
      textTransform: 'uppercase',
      color: theme.textSecondary,
    },
    muted: {
      color: theme.textSecondary,
    },
  });
}
