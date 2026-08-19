import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { NativeSwitch } from '@/components/ui/NativeSwitch';
import { SettingRadioGroup } from '@/components/ui/settings/SettingRadioGroup';
import { useToast } from '@/components/ui/ToastProvider';
import { SettingPicker } from '@/features/settings/SettingPicker';
import { SettingsSection } from '@/features/settings/SettingsChrome';
import { getReminderAccessState } from '@/native/notifications/reminders';
import type { ReminderAccessState } from '@/native/notifications/reminders.types';
import { useAppTheme } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

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
      if (next && !biometricsReady) {
        Alert.alert(
          'Device authentication required',
          'Set up Face ID, Touch ID, fingerprint, or a device passcode in system Settings, then try again.',
        );
        return;
      }
      const ok = await setEnabled(next);
      if (!ok && next) {
        showToast('Could not enable App Lock', { tone: 'error' });
      }
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
        <SettingToggle
          title="App Lock"
          subtitle="Require Face ID, Touch ID, fingerprint, or your device passcode when opening Agenda."
          value={prefs.enabled}
          onValueChange={onToggleLock}
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
          <SettingRow
            last
            title="Hide content in app switcher"
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
        <SettingRow
          title="Agenda data"
          subtitle="Stored locally on this device. Agenda does not upload your tasks or notes."
        />
        <SettingRow
          title="Backups"
          subtitle="Manually exported by you as readable JSON. Keep backup files private."
          last
        />
      </SettingsSection>

      <SettingsSection title="Permissions">
        <SettingRow
          title="Calendar"
          subtitle="Used to display your events in Agenda. Agenda does not upload calendar data."
        />
        <SettingRow
          title="Contacts"
          subtitle="Used only to show birthdays — names and birthday fields, not full contact records."
        />
        <SettingRow
          title="Apple Reminders"
          subtitle={
            Platform.OS === 'ios'
              ? 'Used to show reminders due today when you connect Reminders.'
              : 'Available on iOS when you connect Reminders.'
          }
        />
        <SettingRow
          title="Notifications"
          subtitle={`Local alerts for timed tasks. Currently: ${permissionLabel(notificationAccess)}.`}
          value={permissionLabel(notificationAccess)}
          onPress={notificationAccess === 'denied' ? () => void Linking.openSettings() : undefined}
          last
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

function SettingRow({
  last,
  onPress,
  subtitle,
  title,
  value,
}: {
  last?: boolean;
  onPress?: () => void;
  subtitle?: string;
  title: string;
  value?: string;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const body = (
    <>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress ? <Icon name="chevronRight" size={17} color={theme.textSecondary} /> : null}
    </>
  );
  if (!onPress) return <View style={[styles.settingRow, last && styles.lastRow]}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        last && styles.lastRow,
        pressed && styles.pressed,
      ]}
    >
      {body}
    </Pressable>
  );
}

function SettingToggle({
  last,
  onValueChange,
  subtitle,
  title,
  value,
}: {
  last?: boolean;
  onValueChange: (value: boolean) => void;
  subtitle?: string;
  title: string;
  value: boolean;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.settingRow, styles.toggleRow, last && styles.lastRow]}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.trailingControl}>
        <NativeSwitch onValueChange={onValueChange} value={value} />
      </View>
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    sections: { gap: 16 },
    settingRow: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingLeft: 16,
      paddingRight: Platform.OS === 'ios' ? 6 : 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    toggleRow: { paddingRight: 16 },
    lastRow: { borderBottomWidth: 0 },
    rowCopy: { flex: 1, minWidth: 0, gap: 3 },
    rowTitle: { color: theme.text, fontFamily: fonts.sansMedium, fontSize: 16 },
    rowSubtitle: {
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 12.5,
      lineHeight: 17,
    },
    rowValue: {
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 14,
    },
    trailingControl: { marginLeft: 'auto' },
    previewBlock: { paddingTop: 12 },
    previewHeading: {
      paddingHorizontal: 16,
      color: theme.text,
      fontFamily: fonts.sansMedium,
      fontSize: 16,
    },
    previewHint: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      marginTop: 4,
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 12.5,
      lineHeight: 17,
    },
    footnote: {
      marginHorizontal: 8,
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 12.5,
      lineHeight: 17,
    },
    pressed: { opacity: 0.72 },
  });
}
