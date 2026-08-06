import { Linking, StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { type AgendaTheme, continuousCorner, useThemeStyles } from '@/theme';

export type AccessState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

type Props = {
  title: string;
  state: AccessState;
  undetermined: string;
  denied: string;
  unavailable: string;
  button: string;
  onPress: () => void;
};

export function PermissionCard({
  title,
  state,
  undetermined,
  denied,
  unavailable,
  button,
  onPress,
}: Props) {
  const { styles } = useThemeStyles(createStyles);
  if (state === 'granted') return null;

  const description =
    state === 'denied' ? denied : state === 'unavailable' ? unavailable : undetermined;

  const showConnect = state === 'undetermined';
  const showSettings = state === 'denied';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{description}</Text>
      {showConnect ? (
        <AnimatedPressable onPress={onPress} style={styles.button}>
          <Text style={styles.buttonLabel}>{button}</Text>
        </AnimatedPressable>
      ) : null}
      {showSettings ? (
        <AnimatedPressable onPress={() => void Linking.openSettings()} style={styles.button}>
          <Text style={styles.buttonLabel}>Open system settings</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    card: {
      padding: 16,
      gap: 8,
      backgroundColor: theme.section,
      ...continuousCorner(16),
    },
    title: { color: theme.text, fontSize: 17, fontWeight: '700' },
    body: { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
    button: {
      marginTop: 8,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      ...continuousCorner(14),
    },
    buttonLabel: { color: theme.onPrimary, fontSize: 15, fontWeight: '700' },
  });
}
