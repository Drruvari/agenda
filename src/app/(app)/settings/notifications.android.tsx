import { AndroidSettingsSafeArea } from '@/features/settings/AndroidSettingsSafeArea';
import { NotificationSettingsScreen } from '@/features/settings/NotificationSettingsScreen';

export default function NotificationsSettingsRoute() {
  return (
    <AndroidSettingsSafeArea>
      <NotificationSettingsScreen />
    </AndroidSettingsSafeArea>
  );
}
