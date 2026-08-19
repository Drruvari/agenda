import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { SettingRadioGroup } from '@/components/ui/settings/SettingRadioGroup';
import { useAppLock } from '@/features/privacy';
import { NOTIFICATION_PREVIEW_OPTIONS } from '@/features/privacy/types';
import { SettingsScaffold, SettingsSection } from '@/features/settings/SettingsChrome';
import { getReminderAccessState, requestReminderAccess } from '@/native/notifications/reminders';
import type { ReminderAccessState } from '@/native/notifications/reminders.types';
import { useThemeStyles } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { continuousCorner } from '@/theme/tokens';

export function NotificationSettingsScreen() {
  const { styles } = useThemeStyles(createStyles);
  const { prefs, setNotificationPreview } = useAppLock();
  const [access, setAccess] = useState<ReminderAccessState>('undetermined');

  useEffect(() => {
    void getReminderAccessState().then(setAccess);
  }, []);

  const description =
    access === 'granted'
      ? 'Agenda can send local alerts when your timed tasks are due.'
      : access === 'denied'
        ? 'Notifications are off. Turn them on in system Settings → Agenda to get reminded about timed tasks.'
        : access === 'unavailable'
          ? 'Local reminders need the native iOS or Android app.'
          : 'Turn on “Remind me” when creating a timed task, and Agenda will ask for permission then — only when you need it.';

  return (
    <SettingsScaffold
      header={Platform.OS === 'android' ? null : undefined}
      title="Notifications"
      description={description}
    >
      <SettingsSection title="Permission">
        <View style={styles.block}>
          <Text style={styles.status}>
            {access === 'granted'
              ? 'Allowed'
              : access === 'denied'
                ? 'Blocked'
                : access === 'unavailable'
                  ? 'Unavailable'
                  : 'Not asked yet'}
          </Text>
          {access === 'undetermined' ? (
            <Pressable
              onPress={() => void requestReminderAccess().then(setAccess)}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Allow notifications</Text>
            </Pressable>
          ) : null}
        </View>
      </SettingsSection>

      <SettingsSection title="Preview content">
        <View style={styles.previewIntro}>
          <Text style={styles.status}>
            Controls what appears on the lock screen for Agenda reminders.
          </Text>
        </View>
        <SettingRadioGroup
          onValueChange={(value) => void setNotificationPreview(value)}
          options={NOTIFICATION_PREVIEW_OPTIONS}
          value={prefs.notificationPreview}
        />
      </SettingsSection>
    </SettingsScaffold>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    block: { padding: 16, gap: 10 },
    previewIntro: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 6,
    },
    status: {
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 20,
    },
    button: {
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      ...continuousCorner(12),
    },
    buttonText: {
      color: theme.onPrimary,
      fontFamily: fonts.sansSemi,
      fontWeight: '600',
      fontSize: 15,
    },
  });
}
