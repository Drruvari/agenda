import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { type AgendaTheme, fonts, useThemeStyles } from '@/theme';

type RadioValue = string | number;

type RadioOption<T extends RadioValue> = {
  label: string;
  subtitle?: string;
  value: T;
};

type Props<T extends RadioValue> = {
  onValueChange: (value: T) => void;
  options: readonly RadioOption<T>[];
  value: T;
};

export function SettingRadioGroup<T extends RadioValue>({
  onValueChange,
  options,
  value,
}: Props<T>) {
  const { styles, theme } = useThemeStyles(createStyles);

  return options.map((option, index) => {
    const selected = value === option.value;
    return (
      <Pressable
        key={option.value}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        onPress={() => onValueChange(option.value)}
        style={({ pressed }) => [
          styles.option,
          index === options.length - 1 && styles.lastOption,
          selected && styles.selectedOption,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.copy}>
          <Text style={[styles.label, selected && { color: theme.primary }]}>{option.label}</Text>
          {option.subtitle ? <Text style={styles.subtitle}>{option.subtitle}</Text> : null}
        </View>
        {selected ? <Icon color={theme.primary} name="check" size={20} stroke={2.2} /> : null}
      </Pressable>
    );
  });
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    option: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    lastOption: { borderBottomWidth: 0 },
    selectedOption: { backgroundColor: theme.primarySoft },
    copy: { flex: 1, minWidth: 0, gap: 2 },
    label: {
      color: theme.text,
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 15,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 12.5,
      lineHeight: 17,
    },
    pressed: { opacity: 0.72 },
  });
}
