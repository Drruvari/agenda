import { PrivacySettings } from '@/features/privacy';
import { AndroidSettingsSafeArea } from '@/features/settings/AndroidSettingsSafeArea';

export default function PrivacySettingsScreen() {
  return (
    <AndroidSettingsSafeArea>
      <PrivacySettings />
    </AndroidSettingsSafeArea>
  );
}
