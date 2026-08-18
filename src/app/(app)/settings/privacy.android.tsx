import { PrivacySettings } from '@/features/privacy';
import { AndroidSettingsSafeArea } from '@/features/settings/AndroidSettingsSafeArea';
import { SettingsScaffold } from '@/features/settings/SettingsChrome';

export default function PrivacySettingsScreen() {
  return (
    <AndroidSettingsSafeArea>
      <SettingsScaffold header={null} title="Privacy">
        <PrivacySettings />
      </SettingsScaffold>
    </AndroidSettingsSafeArea>
  );
}
