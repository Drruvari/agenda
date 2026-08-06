import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { useAppLock } from '@/features/privacy';
import {
  NOTIFICATION_PREVIEW_OPTIONS,
  type NotificationPreviewMode,
} from '@/features/privacy/types';
import { SettingsScaffold, SettingsSection } from '@/features/settings/SettingsChrome';
import {
  getReminderAccessState,
  type ReminderAccessState,
  requestReminderAccess,
} from '@/native/notifications/reminders';
import {
  type AgendaTheme,
  continuousCorner,
  fonts,
  useAppAppearance,
  useThemeStyles,
} from '@/theme';

export function NotificationSettingsScreen() {
  const { accent } = useAppAppearance();
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
    <SettingsScaffold title="Notifications" description={description}>
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
        {NOTIFICATION_PREVIEW_OPTIONS.map((option, index) => {
          const selected = prefs.notificationPreview === option.value;
          const last = index === NOTIFICATION_PREVIEW_OPTIONS.length - 1;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => void setNotificationPreview(option.value as NotificationPreviewMode)}
              style={({ pressed }) => [
                styles.previewOption,
                last && styles.lastRow,
                selected && styles.previewSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.previewCopy}>
                <Text style={[styles.previewLabel, selected && { color: accent }]}>
                  {option.label}
                </Text>
                <Text style={styles.previewSubtitle}>{option.subtitle}</Text>
              </View>
              {selected ? <Icon color={accent} name="check" size={20} stroke={2.2} /> : null}
            </Pressable>
          );
        })}
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
    buttonText: { color: theme.onPrimary, fontFamily: fonts.sansSemi, fontSize: 15 },
    previewOption: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    lastRow: { borderBottomWidth: 0 },
    previewSelected: {
      backgroundColor: theme.primarySoft,
    },
    previewCopy: { flex: 1, gap: 2 },
    previewLabel: { color: theme.text, fontFamily: fonts.sansMedium, fontSize: 15 },
    previewSubtitle: {
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 12.5,
      lineHeight: 17,
    },
    pressed: { opacity: 0.72 },
  });
}
