import { AndroidSettingsSafeArea } from '@/features/settings/AndroidSettingsSafeArea';
import { SettingsScreen } from '@/features/settings/SettingsScreen';

export default function SyncSettingsScreen() {
  return (
    <AndroidSettingsSafeArea>
      <SettingsScreen categoryOnly initialTab="sync" />
    </AndroidSettingsSafeArea>
  );
}
