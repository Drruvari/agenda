import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrbitLogo } from '@/components/ui/OrbitLogo';
import { type AgendaTheme, continuousCorner, fonts, useAppAppearance, useAppTheme } from '@/theme';

type Props = {
  authenticating: boolean;
  onUnlock: () => void;
};

export function AppLockScreen({ authenticating, onUnlock }: Props) {
  const { accent } = useAppAppearance();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      accessibilityViewIsModal
      pointerEvents="auto"
      style={[
        styles.root,
        {
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 28,
        },
      ]}
    >
      <View style={styles.hero}>
        <OrbitLogo color={accent} size={44} stroke={1.8} />
        <Text style={styles.brand}>Agenda</Text>
        <Text style={styles.slogan}>Your agenda belongs on your phone.</Text>
        <Text style={styles.hint}>Unlock to continue.</Text>
      </View>

      <Pressable
        accessibilityLabel="Unlock Agenda"
        accessibilityRole="button"
        disabled={authenticating}
        onPress={onUnlock}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: accent },
          (pressed || authenticating) && styles.pressed,
        ]}
      >
        <Text style={styles.buttonLabel}>{authenticating ? 'Authenticating…' : 'Unlock'}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFill,
      zIndex: 1000,
      justifyContent: 'space-between',
      paddingHorizontal: 28,
      backgroundColor: theme.background,
    },
    hero: {
      alignItems: 'center',
      gap: 10,
      paddingTop: 48,
    },
    brand: {
      fontFamily: fonts.serif,
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.4,
      color: theme.text,
    },
    slogan: {
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      lineHeight: 22,
      textAlign: 'center',
      color: theme.text,
      paddingHorizontal: 12,
    },
    hint: {
      marginTop: 8,
      fontFamily: fonts.sans,
      fontSize: 14,
      color: theme.textSecondary,
    },
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 54,
      ...continuousCorner(14),
    },
    buttonLabel: {
      fontFamily: fonts.sansSemi,
      fontSize: 17,
      color: '#FFFFFF',
    },
    pressed: { opacity: 0.78 },
  });
}
