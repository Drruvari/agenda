import { Linking, StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useThemeStyles } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { continuousCorner } from '@/theme/tokens';

export type AccessState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

type Props = {
  title: string;
  state: AccessState;
  undetermined: string;
  denied: string;
  unavailable: string;
  button: string;
  onPress: () => void;
  onDismiss?: () => void;
};

export function PermissionCard({
  title,
  state,
  undetermined,
  denied,
  unavailable,
  button,
  onDismiss,
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
        <View style={styles.actions}>
          <AnimatedPressable onPress={onPress} style={styles.button}>
            <Text style={styles.buttonLabel}>{button}</Text>
          </AnimatedPressable>
          {onDismiss ? (
            <AnimatedPressable onPress={onDismiss} style={styles.dismissButton}>
              <Text style={styles.dismissLabel}>Not now</Text>
            </AnimatedPressable>
          ) : null}
        </View>
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
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      ...continuousCorner(14),
    },
    actions: { marginTop: 8, gap: 4 },
    buttonLabel: { color: theme.onPrimary, fontSize: 15, fontWeight: '700' },
    dismissButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
    dismissLabel: { color: theme.textSecondary, fontSize: 15, fontWeight: '600' },
  });
}
