import { FieldGroup, Host, ListItem, Picker, Switch, Text } from '@expo/ui';

import { useToast } from '@/components/ui/ToastProvider';
import { useAppAppearance } from '@/theme/AppThemeProvider';

import { requestAppLockChange } from './appLockActions';
import { useAppLock } from './AppLockProvider';
import { LOCK_DELAY_OPTIONS, NOTIFICATION_PREVIEW_OPTIONS } from './types';

export function PrivacySettings() {
  const { accent, colorScheme } = useAppAppearance();
  const controlTint = accent === '#FFFFFF' || accent === '#191919' ? '#34C759' : accent;
  const { showToast } = useToast();
  const { biometricsReady, prefs, setDelay, setEnabled, setNotificationPreview } = useAppLock();

  const setLockEnabled = (enabled: boolean) => {
    void requestAppLockChange({
      enabled,
      biometricsReady,
      setEnabled,
      onFailure: () => showToast('Could not enable App Lock', { tone: 'error' }),
    });
  };

  return (
    <Host
      colorScheme={colorScheme}
      seedColor={controlTint}
      style={{ flex: 1 }}
      useViewportSizeMeasurement
    >
      <FieldGroup>
        <FieldGroup.Section title="Security">
          <Switch label="App Lock" value={prefs.enabled} onValueChange={setLockEnabled} />
          <ListItem
            supportingText="Choose when Agenda locks after leaving the app"
            trailing={
              <Picker selectedValue={prefs.delay} onValueChange={(value) => void setDelay(value)}>
                {LOCK_DELAY_OPTIONS.map((option) => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            }
          >
            <Text>Require Authentication</Text>
          </ListItem>
        </FieldGroup.Section>

        <FieldGroup.Section title="Notification Previews">
          <ListItem
            supportingText="Choose what appears on the Lock Screen"
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

        <FieldGroup.Section title="Data">
          <ListItem supportingText="Tasks and notes stay on this device">
            <Text>Agenda Data</Text>
          </ListItem>
          <ListItem supportingText="Exported only when you request a backup">
            <Text>Backups</Text>
          </ListItem>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
