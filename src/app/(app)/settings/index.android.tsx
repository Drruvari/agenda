import { FieldGroup, Host, ListItem, Text } from '@expo/ui';
import { useRouter } from 'expo-router';

import { SettingsScaffold } from '@/features/settings/SettingsChrome';
import { useAppAppearance } from '@/theme';

export default function AndroidSettingsScreen() {
  const router = useRouter();
  const { accent, colorScheme } = useAppAppearance();

  return (
    <SettingsScaffold title="Settings" scroll={false}>
      <Host
        colorScheme={colorScheme}
        seedColor={accent}
        style={{ flex: 1 }}
        useViewportSizeMeasurement
      >
        <FieldGroup>
          <FieldGroup.Section title="Preferences">
            <SettingsRow
              label="General"
              detail="Appearance, calendar, and Today behavior"
              onPress={() => router.push('/settings/appearance')}
            />
            <SettingsRow
              label="Editor"
              detail="Daily page and new-item defaults"
              onPress={() => router.push('/settings/editor' as never)}
            />
          </FieldGroup.Section>
          <FieldGroup.Section title="Data">
            <SettingsRow
              label="Sync"
              detail="Local indexes and shortcuts"
              onPress={() => router.push('/settings/sync' as never)}
            />
            <SettingsRow
              label="Export"
              detail="Share pages and manage backups"
              onPress={() => router.push('/settings/export' as never)}
            />
          </FieldGroup.Section>
          <FieldGroup.Section title="Agenda">
            <SettingsRow
              label="Privacy"
              detail="App Lock, previews, and permissions"
              onPress={() => router.push('/settings/privacy' as never)}
            />
            <SettingsRow
              label="Notifications"
              detail="Permission and preview settings"
              onPress={() => router.push('/settings/notifications')}
            />
            <SettingsRow
              label="About"
              detail="Version, storage, and acknowledgements"
              onPress={() => router.push('/settings/about')}
            />
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </SettingsScaffold>
  );
}

function SettingsRow({
  detail,
  label,
  onPress,
}: {
  detail: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <ListItem onPress={onPress} supportingText={detail}>
      <Text>{label}</Text>
    </ListItem>
  );
}
