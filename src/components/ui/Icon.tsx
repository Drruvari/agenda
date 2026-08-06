/* eslint-disable import/no-unresolved -- Tabler's valid wildcard exports are not resolved by Expo's ESLint resolver. */
import IconAlertCircle from '@tabler/icons-react-native/IconAlertCircle';
import IconArrowBackUp from '@tabler/icons-react-native/IconArrowBackUp';
import IconArrowsMaximize from '@tabler/icons-react-native/IconArrowsMaximize';
import IconArrowsMinimize from '@tabler/icons-react-native/IconArrowsMinimize';
import IconBell from '@tabler/icons-react-native/IconBell';
import IconCake from '@tabler/icons-react-native/IconCake';
import IconCalendar from '@tabler/icons-react-native/IconCalendar';
import IconCheck from '@tabler/icons-react-native/IconCheck';
import IconChecklist from '@tabler/icons-react-native/IconChecklist';
import IconChevronDown from '@tabler/icons-react-native/IconChevronDown';
import IconChevronLeft from '@tabler/icons-react-native/IconChevronLeft';
import IconChevronRight from '@tabler/icons-react-native/IconChevronRight';
import IconChevronUp from '@tabler/icons-react-native/IconChevronUp';
import IconClock from '@tabler/icons-react-native/IconClock';
import IconCloud from '@tabler/icons-react-native/IconCloud';
import IconCopy from '@tabler/icons-react-native/IconCopy';
import IconDots from '@tabler/icons-react-native/IconDots';
import IconDownload from '@tabler/icons-react-native/IconDownload';
import IconEraser from '@tabler/icons-react-native/IconEraser';
import IconFileExport from '@tabler/icons-react-native/IconFileExport';
import IconFileTypePdf from '@tabler/icons-react-native/IconFileTypePdf';
import IconHighlight from '@tabler/icons-react-native/IconHighlight';
import IconInfoCircle from '@tabler/icons-react-native/IconInfoCircle';
import IconMinus from '@tabler/icons-react-native/IconMinus';
import IconPencil from '@tabler/icons-react-native/IconPencil';
import IconPlus from '@tabler/icons-react-native/IconPlus';
import IconRefresh from '@tabler/icons-react-native/IconRefresh';
import IconSearch from '@tabler/icons-react-native/IconSearch';
import IconSettings from '@tabler/icons-react-native/IconSettings';
import IconShare from '@tabler/icons-react-native/IconShare';
import IconTrash from '@tabler/icons-react-native/IconTrash';
import IconTypography from '@tabler/icons-react-native/IconTypography';
import IconUpload from '@tabler/icons-react-native/IconUpload';
import IconWriting from '@tabler/icons-react-native/IconWriting';

import { OrbitLogo } from '@/components/ui/OrbitLogo';

const icons = {
  add: IconPlus,
  alert: IconAlertCircle,
  back: IconChevronLeft,
  bell: IconBell,
  birthday: IconCake,
  calendar: IconCalendar,
  check: IconCheck,
  checklist: IconChecklist,
  chevronDown: IconChevronDown,
  chevronRight: IconChevronRight,
  chevronUp: IconChevronUp,
  clock: IconClock,
  cloud: IconCloud,
  copy: IconCopy,
  download: IconDownload,
  eraser: IconEraser,
  filePdf: IconFileTypePdf,
  fileExport: IconFileExport,
  /** @deprecated Prefer `orbit` — alias for the Agenda mark. */
  galaxy: OrbitLogo,
  highlight: IconHighlight,
  info: IconInfoCircle,
  expand: IconArrowsMaximize,
  minimize: IconArrowsMinimize,
  minus: IconMinus,
  more: IconDots,
  orbit: OrbitLogo,
  pencil: IconPencil,
  refresh: IconRefresh,
  undo: IconArrowBackUp,
  search: IconSearch,
  settings: IconSettings,
  share: IconShare,
  trash: IconTrash,
  typography: IconTypography,
  upload: IconUpload,
  writing: IconWriting,
} as const;

export type IconName = keyof typeof icons;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
};

export function Icon({ name, size = 24, color = '#000000', stroke = 2 }: Props) {
  if (name === 'orbit' || name === 'galaxy') {
    return <OrbitLogo size={size} color={color} stroke={stroke === 2 ? 1.7 : stroke} />;
  }

  const Component = icons[name];
  return <Component size={size} color={color} strokeWidth={stroke} />;
}
