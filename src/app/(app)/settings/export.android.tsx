import { AndroidSettingsSafeArea } from '@/features/settings/AndroidSettingsSafeArea';
import { SettingsScreen } from '@/features/settings/SettingsScreen';

export default function ExportSettingsScreen() {
  return (
    <AndroidSettingsSafeArea>
      <SettingsScreen categoryOnly initialTab="export" />
    </AndroidSettingsSafeArea>
  );
}
