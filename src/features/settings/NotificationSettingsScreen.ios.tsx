import { FieldGroup, Host, ListItem, Picker, Text } from '@expo/ui';
import { useEffect, useState } from 'react';

import { useAppLock } from '@/features/privacy';
import { NOTIFICATION_PREVIEW_OPTIONS } from '@/features/privacy/types';
import { getReminderAccessState, requestReminderAccess } from '@/native/notifications/reminders';
import type { ReminderAccessState } from '@/native/notifications/reminders.types';
import { useAppAppearance } from '@/theme/AppThemeProvider';

export function NotificationSettingsScreen() {
  const { accent, colorScheme } = useAppAppearance();
  const controlTint = accent === '#FFFFFF' || accent === '#191919' ? '#34C759' : accent;
  const { prefs, setNotificationPreview } = useAppLock();
  const [access, setAccess] = useState<ReminderAccessState>('undetermined');

  useEffect(() => {
    void getReminderAccessState().then(setAccess);
  }, []);

  const status =
    access === 'granted'
      ? 'Allowed'
      : access === 'denied'
        ? 'Blocked in system Settings'
        : access === 'unavailable'
          ? 'Unavailable'
          : 'Not Requested';

  return (
    <Host
      colorScheme={colorScheme}
      seedColor={controlTint}
      style={{ flex: 1 }}
      useViewportSizeMeasurement
    >
      <FieldGroup>
        <FieldGroup.Section title="Permission">
          <ListItem supportingText="Alerts for timed tasks" trailing={<Text>{status}</Text>}>
            <Text>Notifications</Text>
          </ListItem>
          {access === 'undetermined' ? (
            <ListItem onPress={() => void requestReminderAccess().then(setAccess)}>
              <Text>Allow Notifications</Text>
            </ListItem>
          ) : null}
        </FieldGroup.Section>

        <FieldGroup.Section title="Lock Screen">
          <ListItem
            supportingText="Choose how much reminder content is visible"
            trailing={
              <Picker
                selectedValue={prefs.notificationPreview}
                onValueChange={(value) => void setNotificationPreview(value)}
              >
                {NOTIFICATION_PREVIEW_OPTIONS.map((option) => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            }
          >
            <Text>Show Previews</Text>
          </ListItem>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
