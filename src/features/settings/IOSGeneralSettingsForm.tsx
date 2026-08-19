import type { AppSettings } from '@/data/schema/types';

export function IOSGeneralSettingsForm(_props: {
  general: AppSettings['general'];
  onChange: (patch: Partial<AppSettings['general']>) => void;
}) {
  return null;
}
