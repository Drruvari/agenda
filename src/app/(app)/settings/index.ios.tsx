import { FieldGroup, Host, Icon, ListItem, Text } from '@expo/ui';
import { Stack, useRouter } from 'expo-router';

import { useAppAppearance } from '@/theme/AppThemeProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const { accent, colorScheme } = useAppAppearance();

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Back to Today"
          icon="chevron.backward"
          onPress={() => router.back()}
        />
      </Stack.Toolbar>
      <Host
        colorScheme={colorScheme}
        seedColor={accent}
        style={{ flex: 1 }}
        useViewportSizeMeasurement
      >
        <FieldGroup>
          <FieldGroup.Section title="Preferences">
            <SettingsRow
              icon="gearshape"
              label="General"
              onPress={() => router.push('/settings/appearance')}
            />
            <SettingsRow
              icon="textformat"
              label="Editor"
              onPress={() => router.push('/settings/editor' as never)}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Data">
            <SettingsRow
              icon="arrow.triangle.2.circlepath.icloud"
              label="Sync"
              onPress={() => router.push('/settings/sync' as never)}
            />
            <SettingsRow
              icon="square.and.arrow.up"
              label="Export"
              onPress={() => router.push('/settings/export' as never)}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Agenda">
            <SettingsRow
              icon="hand.raised"
              label="Privacy"
              onPress={() => router.push('/settings/privacy' as never)}
            />
            <SettingsRow
              icon="bell"
              label="Notifications"
              onPress={() => router.push('/settings/notifications')}
            />
            <SettingsRow
              icon="info.circle"
              label="About"
              onPress={() => router.push('/settings/about')}
            />
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
}: {
  icon:
    | 'gearshape'
    | 'textformat'
    | 'arrow.triangle.2.circlepath.icloud'
    | 'square.and.arrow.up'
    | 'hand.raised'
    | 'bell'
    | 'info.circle';
  label: string;
  onPress: () => void;
}) {
  return (
    <ListItem
      leading={<Icon name={icon} size={19} />}
      onPress={onPress}
      trailing={<Icon name="chevron.right" size={14} />}
    >
      <Text>{label}</Text>
    </ListItem>
  );
}
