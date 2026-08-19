import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { NativeSwitch } from '@/components/ui/NativeSwitch';
import { SettingRadioGroup } from '@/components/ui/settings/SettingRadioGroup';
import { SettingsRow } from '@/components/ui/settings/SettingsRow';
import { SettingsSection } from '@/components/ui/settings/SettingsSection';
import { useToast } from '@/components/ui/ToastProvider';
import { SettingPicker } from '@/features/settings/SettingPicker';
import { getReminderAccessState } from '@/native/notifications/reminders';
import type { ReminderAccessState } from '@/native/notifications/reminders.types';
import { useAppTheme } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { layout } from '@/theme/tokens';
import { type } from '@/theme/type';

import { requestAppLockChange } from './appLockActions';
import { useAppLock } from './AppLockProvider';
import {
  LOCK_DELAY_OPTIONS,
  type LockDelay,
  lockDelayLabel,
  NOTIFICATION_PREVIEW_OPTIONS,
} from './types';

export function PrivacySettings() {
  const { showToast } = useToast();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { prefs, biometricsReady, setEnabled, setDelay, setNotificationPreview } = useAppLock();
  const [notificationAccess, setNotificationAccess] = useState<ReminderAccessState>('undetermined');

  useEffect(() => {
    void getReminderAccessState().then(setNotificationAccess);
  }, []);

  const onToggleLock = (next: boolean) => {
    void (async () => {
      if (next && Platform.OS === 'web') {
        showToast('App Lock needs the iOS or Android app.', { tone: 'error' });
        return;
      }
      await requestAppLockChange({
        enabled: next,
        biometricsReady,
        setEnabled,
        onFailure: () => showToast('Could not enable App Lock', { tone: 'error' }),
      });
    })();
  };

  const permissionLabel = (state: ReminderAccessState) => {
    if (state === 'granted') return 'Allowed';
    if (state === 'denied') return 'Blocked';
    if (state === 'unavailable') return 'Unavailable';
    return 'Not asked yet';
  };

  return (
    <View style={styles.sections}>
      <SettingsSection title="Security">
        <SettingsRow
          label="App Lock"
          subtitle="Require Face ID, Touch ID, fingerprint, or your device passcode when opening Agenda."
          trailing={<NativeSwitch onValueChange={onToggleLock} value={prefs.enabled} />}
        />
        <SettingPicker
          title="Lock after"
          subtitle="How long Agenda can stay in the background before locking again."
          value={prefs.delay}
          options={LOCK_DELAY_OPTIONS}
          onValueChange={(delay: LockDelay) => void setDelay(delay)}
          last={!prefs.enabled}
        />
        {prefs.enabled ? (
          <SettingsRow
            last
            label="Hide content in app switcher"
            subtitle="On whenever App Lock is enabled — blanks or blurs Agenda in recent apps."
            value="On"
          />
        ) : null}
      </SettingsSection>

      <SettingsSection title="Notifications">
        <View style={styles.previewBlock}>
          <Text style={styles.previewHeading}>Preview content</Text>
          <Text style={styles.previewHint}>
            Controls what appears on the lock screen for Agenda reminders.
          </Text>
        </View>
        <SettingRadioGroup
          onValueChange={(value) => void setNotificationPreview(value)}
          options={NOTIFICATION_PREVIEW_OPTIONS}
          value={prefs.notificationPreview}
        />
      </SettingsSection>

      <SettingsSection title="Data">
        <SettingsRow
          label="Agenda data"
          subtitle="Stored locally on this device. Agenda does not upload your tasks or notes."
        />
        <SettingsRow
          label="Backups"
          last
          subtitle="Manually exported by you as readable JSON. Keep backup files private."
        />
      </SettingsSection>

      <SettingsSection title="Permissions">
        <SettingsRow
          label="Calendar"
          subtitle="Used to display your events in Agenda. Agenda does not upload calendar data."
        />
        <SettingsRow
          label="Contacts"
          subtitle="Used only to show birthdays — names and birthday fields, not full contact records."
        />
        <SettingsRow
          label="Apple Reminders"
          subtitle="Available on iOS when you connect Reminders."
        />
        <SettingsRow
          label="Notifications"
          last
          subtitle={`Local alerts for timed tasks. Currently: ${permissionLabel(notificationAccess)}.`}
          value={permissionLabel(notificationAccess)}
          onPress={notificationAccess === 'denied' ? () => void Linking.openSettings() : undefined}
        />
      </SettingsSection>

      {prefs.enabled ? (
        <Text style={styles.footnote}>
          App Lock is set to {lockDelayLabel(prefs.delay).toLowerCase()} and stays on this device
          only — it is not included in backups.
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    sections: { gap: layout.sectionGap },
    previewBlock: { paddingTop: 12 },
    previewHeading: {
      paddingHorizontal: 16,
      color: theme.text,
      ...type.rowLabel,
    },
    previewHint: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      marginTop: 4,
      color: theme.textSecondary,
      ...type.subtitle,
    },
    footnote: {
      marginHorizontal: 8,
      color: theme.textSecondary,
      ...type.subtitle,
    },
  });
}
