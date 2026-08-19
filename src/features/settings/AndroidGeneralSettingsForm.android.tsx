import { StyleSheet, View } from 'react-native';

import { NativeSwitch } from '@/components/ui/NativeSwitch';
import { SettingsRow } from '@/components/ui/settings/SettingsRow';
import { SettingsSection } from '@/components/ui/settings/SettingsSection';
import type { AccentColor, AppSettings } from '@/data/schema/types';
import { SettingPicker } from '@/features/settings/SettingPicker';
import { useThemeStyles } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { layout } from '@/theme/tokens';

const ACCENTS: { label: string; value: AccentColor }[] = [
  { label: 'Black', value: 'black' },
  { label: 'Blue', value: 'blue' },
  { label: 'Red', value: 'red' },
  { label: 'Purple', value: 'purple' },
  { label: 'Green', value: 'green' },
  { label: 'Brown', value: 'brown' },
  { label: 'Orange', value: 'orange' },
  { label: 'Magenta', value: 'magenta' },
  { label: 'Yellow', value: 'yellow' },
];

export function AndroidGeneralSettingsForm({
  general,
  onChange,
}: {
  general: AppSettings['general'];
  onChange: (patch: Partial<AppSettings['general']>) => void;
}) {
  const { styles } = useThemeStyles(createStyles);

  return (
    <View style={styles.sections}>
      <SettingsSection title="Date & calendar">
        <SettingPicker
          title="Date format"
          value={general.dateFormat}
          options={[
            { label: 'Long', value: 'long' },
            { label: 'Short', value: 'short' },
          ]}
          onValueChange={(dateFormat) => onChange({ dateFormat })}
        />
        <SettingPicker
          last
          title="Week starts on"
          value={general.weekStartsOn}
          options={[
            { label: 'Monday', value: 'monday' },
            { label: 'Sunday', value: 'sunday' },
          ]}
          onValueChange={(weekStartsOn) => onChange({ weekStartsOn })}
        />
      </SettingsSection>

      <SettingsSection title="Appearance">
        <SettingPicker
          title="Theme"
          value={general.mode}
          options={[
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
          onValueChange={(mode) => onChange({ mode })}
        />
        <SettingPicker
          last
          title="Accent color"
          value={general.accent}
          options={ACCENTS}
          onValueChange={(accent) => onChange({ accent })}
        />
      </SettingsSection>

      <SettingsSection title="Today">
        <SettingsRow
          label="Show completed section"
          trailing={
            <NativeSwitch
              onValueChange={(showCompleted) => onChange({ showCompleted })}
              value={general.showCompleted}
            />
          }
        />
        <SettingsRow
          label="Compact day list"
          trailing={
            <NativeSwitch
              onValueChange={(compactStream) => onChange({ compactStream })}
              value={general.compactStream}
            />
          }
        />
        <SettingsRow
          label="Keep Space filter"
          trailing={
            <NativeSwitch
              onValueChange={(keepFilterWhileChangingDays) =>
                onChange({ keepFilterWhileChangingDays })
              }
              value={general.keepFilterWhileChangingDays}
            />
          }
        />
        <SettingsRow
          label="Swipe to change day"
          trailing={
            <NativeSwitch
              onValueChange={(swipeToChangeDay) => onChange({ swipeToChangeDay })}
              value={general.swipeToChangeDay}
            />
          }
        />
        <SettingsRow
          label="Calendar indicators"
          trailing={
            <NativeSwitch
              onValueChange={(calendarIndicators) => onChange({ calendarIndicators })}
              value={general.calendarIndicators}
            />
          }
        />
        <SettingsRow
          last
          label="Tap to edit"
          trailing={
            <NativeSwitch
              onValueChange={(clickToEdit) => onChange({ clickToEdit })}
              value={general.clickToEdit}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Pull down on Today">
        <SettingsRow
          label="Quick Add"
          trailing={
            <NativeSwitch
              onValueChange={(pullDownToAdd) =>
                onChange({ pullDownToAdd, ...(pullDownToAdd ? { pullDownToSearch: false } : {}) })
              }
              value={general.pullDownToAdd}
            />
          }
        />
        <SettingsRow
          last
          label="Search"
          trailing={
            <NativeSwitch
              onValueChange={(pullDownToSearch) =>
                onChange({
                  pullDownToSearch,
                  ...(pullDownToSearch ? { pullDownToAdd: false } : {}),
                })
              }
              value={general.pullDownToSearch}
            />
          }
        />
      </SettingsSection>
    </View>
  );
}

function createStyles(_theme: AgendaTheme) {
  return StyleSheet.create({
    sections: { gap: layout.sectionGap },
  });
}
