import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import {
  getReminderAccessState,
  type ReminderAccessState,
  requestReminderAccess,
} from '@/native/notifications/reminders';
import { type AgendaTheme, continuousCorner, useThemeStyles } from '@/theme';

export function NotificationSettingsScreen() {
  const { styles } = useThemeStyles(createStyles);
  const [access, setAccess] = useState<ReminderAccessState>('undetermined');

  useEffect(() => {
    void getReminderAccessState().then(setAccess);
  }, []);

  const description =
    access === 'granted'
      ? 'Agenda can deliver local reminders on this device.'
      : access === 'denied'
        ? 'Notifications are disabled. Enable them from the device Settings app.'
        : access === 'unavailable'
          ? 'Local reminders require the native iOS or Android app.'
          : 'Allow notifications when you want Agenda to remind you about timed items.';

  return (
    <Screen title="Notifications" description={description}>
      <View style={styles.card}>
        <Text style={styles.title}>Permission</Text>
        <Text style={styles.status}>{access}</Text>
        {access === 'undetermined' ? (
          <Pressable
            onPress={() => void requestReminderAccess().then(setAccess)}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Allow reminders</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    card: { padding: 16, gap: 8, backgroundColor: theme.card, ...continuousCorner(14) },
    title: { color: theme.text, fontSize: 16, fontWeight: '700' },
    status: { color: theme.textSecondary, fontSize: 14, textTransform: 'capitalize' },
    button: {
      marginTop: 8,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      ...continuousCorner(12),
    },
    buttonText: { color: theme.onPrimary, fontSize: 15, fontWeight: '700' },
  });
}
