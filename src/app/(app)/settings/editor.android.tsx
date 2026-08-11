import { AndroidSettingsSafeArea } from '@/features/settings/AndroidSettingsSafeArea';
import { SettingsScreen } from '@/features/settings/SettingsScreen';

export default function EditorSettingsScreen() {
  return (
    <AndroidSettingsSafeArea>
      <SettingsScreen categoryOnly initialTab="editor" />
    </AndroidSettingsSafeArea>
  );
}
