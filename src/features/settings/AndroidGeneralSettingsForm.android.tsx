import { StyleSheet, Text, View } from 'react-native';

import { NativeSwitch } from '@/components/ui/NativeSwitch';
import type { AccentColor, AppSettings } from '@/data';
import { SettingPicker } from '@/features/settings/SettingPicker';
import { SettingsSection } from '@/features/settings/SettingsChrome';
import { type AgendaTheme, fonts, useAppTheme } from '@/theme';

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
  const theme = useAppTheme();
  const styles = createStyles(theme);

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
        <Toggle
          last={false}
          label="Show completed section"
          onValueChange={(showCompleted) => onChange({ showCompleted })}
          value={general.showCompleted}
        />
        <Toggle
          last={false}
          label="Compact day list"
          onValueChange={(compactStream) => onChange({ compactStream })}
          value={general.compactStream}
        />
        <Toggle
          last={false}
          label="Keep Space filter"
          onValueChange={(keepFilterWhileChangingDays) => onChange({ keepFilterWhileChangingDays })}
          value={general.keepFilterWhileChangingDays}
        />
        <Toggle
          last={false}
          label="Swipe to change day"
          onValueChange={(swipeToChangeDay) => onChange({ swipeToChangeDay })}
          value={general.swipeToChangeDay}
        />
        <Toggle
          last={false}
          label="Calendar indicators"
          onValueChange={(calendarIndicators) => onChange({ calendarIndicators })}
          value={general.calendarIndicators}
        />
        <Toggle
          last
          label="Tap to edit"
          onValueChange={(clickToEdit) => onChange({ clickToEdit })}
          value={general.clickToEdit}
        />
      </SettingsSection>

      <SettingsSection title="Pull down on Today">
        <Toggle
          last={false}
          label="Quick Add"
          onValueChange={(pullDownToAdd) =>
            onChange({ pullDownToAdd, ...(pullDownToAdd ? { pullDownToSearch: false } : {}) })
          }
          value={general.pullDownToAdd}
        />
        <Toggle
          last
          label="Search"
          onValueChange={(pullDownToSearch) =>
            onChange({ pullDownToSearch, ...(pullDownToSearch ? { pullDownToAdd: false } : {}) })
          }
          value={general.pullDownToSearch}
        />
      </SettingsSection>
    </View>
  );
}

function Toggle({
  last,
  label,
  onValueChange,
  value,
}: {
  last: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  return (
    <View style={[styles.toggleRow, last && styles.lastRow]}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <NativeSwitch onValueChange={onValueChange} value={value} />
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    sections: { gap: 16 },
    toggleRow: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    lastRow: { borderBottomWidth: 0 },
    toggleLabel: {
      flex: 1,
      color: theme.text,
      fontFamily: fonts.sansMedium,
      fontSize: 16,
    },
  });
}
