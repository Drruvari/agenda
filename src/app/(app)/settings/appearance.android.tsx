import { AndroidSettingsSafeArea } from '@/features/settings/AndroidSettingsSafeArea';
import { SettingsScreen } from '@/features/settings/SettingsScreen';

export default function AppearanceSettingsScreen() {
  return (
    <AndroidSettingsSafeArea>
      <SettingsScreen categoryOnly initialTab="general" />
    </AndroidSettingsSafeArea>
  );
}
