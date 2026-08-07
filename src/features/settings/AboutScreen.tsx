import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';

import { AgendaLogo } from '@/components/ui/AgendaLogo';
import { SettingsScaffold, SettingsSection } from '@/features/settings/SettingsChrome';
import { type AgendaTheme, fonts, useThemeStyles } from '@/theme';

const VERSION = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

export function AboutScreen() {
  const { styles, theme } = useThemeStyles(createStyles);

  return (
    <SettingsScaffold
      title="About"
      description="Why Agenda is built the way it is — and what that means for you."
    >
      <View style={styles.hero}>
        <AgendaLogo color={theme.primary} size={36} />
        <Text style={styles.brand}>Agenda</Text>
        <Text style={styles.slogan}>Your agenda belongs on your phone.</Text>
        <Text style={styles.version}>Version {VERSION}</Text>
      </View>

      <SettingsSection title="Local by design">
        <View style={styles.sectionBody}>
          <Text style={styles.cardBody}>
            Your tasks, notes, routines, and drawings stay on this device. There’s no account to
            create and no server watching your day — so Agenda stays simple to maintain, fast
            offline, and yours.
          </Text>
        </View>
      </SettingsSection>

      <SettingsSection title="What that enables">
        <View style={styles.sectionBody}>
          <Text style={styles.bullet}>
            • Private by default — nothing leaves your phone unless you export it
          </Text>
          <Text style={styles.bullet}>• Works without the network</Text>
          <Text style={styles.bullet}>
            • Optional calendar and Reminders sync, only when you choose
          </Text>
          <Text style={styles.bullet}>
            • Built to stay fair: one-time purchase or open source — not a subscription tax
          </Text>
        </View>
      </SettingsSection>

      <SettingsSection title="Backups">
        <View style={styles.sectionBody}>
          <Text style={styles.cardBody}>
            Use Settings → Export for a local backup, and Settings → Privacy for App Lock,
            notification previews, and permission details.
          </Text>
        </View>
      </SettingsSection>
    </SettingsScaffold>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    hero: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      marginBottom: 4,
    },
    brand: {
      fontFamily: fonts.serif,
      fontSize: 28,
      lineHeight: 34,
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
    version: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 4,
    },
    sectionBody: {
      gap: 8,
      padding: 16,
    },
    cardBody: {
      fontFamily: fonts.sans,
      fontSize: 15,
      lineHeight: 22,
      color: theme.textSecondary,
    },
    bullet: {
      fontFamily: fonts.sans,
      fontSize: 15,
      lineHeight: 22,
      color: theme.textSecondary,
    },
  });
}
