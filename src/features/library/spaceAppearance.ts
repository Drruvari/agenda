import type { IconName } from '@/components/ui/Icon';
import { type CategoryColorName, spaceColors } from '@/theme/colors';

export const SPACE_ICON_OPTIONS: IconName[] = [
  'agenda',
  'checklist',
  'calendar',
  'writing',
  'pencil',
  'lock',
  'bell',
  'cloud',
];

export const SPACE_COLOR_OPTIONS: { name: CategoryColorName; hex: string }[] = (
  Object.keys(spaceColors) as CategoryColorName[]
).map((name) => ({ name, hex: spaceColors[name] }));

export function defaultSpaceColor(primary: string): string {
  return primary || spaceColors.indigo;
}
