import { FieldGroup, Host, ListItem, Picker, Switch, Text } from '@expo/ui';

import type { AccentColor, AppSettings } from '@/data';
import { useAppAppearance } from '@/theme';

const ACCENTS: AccentColor[] = [
  'black',
  'blue',
  'red',
  'purple',
  'green',
  'brown',
  'orange',
  'magenta',
  'yellow',
];

export function AndroidGeneralSettingsForm({
  general,
  onChange,
}: {
  general: AppSettings['general'];
  onChange: (patch: Partial<AppSettings['general']>) => void;
}) {
  const { accent, colorScheme } = useAppAppearance();
  return (
    <Host
      colorScheme={colorScheme}
      seedColor={accent}
      style={{ flex: 1 }}
      useViewportSizeMeasurement
    >
      <FieldGroup>
        <FieldGroup.Section title="Date & calendar">
          <PickerRow
            label="Date format"
            value={general.dateFormat}
            options={[
              ['Long', 'long'],
              ['Short', 'short'],
            ]}
            onChange={(dateFormat) => onChange({ dateFormat })}
          />
          <PickerRow
            label="Week starts on"
            value={general.weekStartsOn}
            options={[
              ['Monday', 'monday'],
              ['Sunday', 'sunday'],
            ]}
            onChange={(weekStartsOn) => onChange({ weekStartsOn })}
          />
        </FieldGroup.Section>
        <FieldGroup.Section title="Appearance">
          <PickerRow
            label="Theme"
            value={general.mode}
            options={[
              ['System', 'system'],
              ['Light', 'light'],
              ['Dark', 'dark'],
            ]}
            onChange={(mode) => onChange({ mode })}
          />
          <PickerRow
            label="Accent color"
            value={general.accent}
            options={ACCENTS.map((value) => [titleCase(value), value])}
            onChange={(accent) => onChange({ accent })}
          />
        </FieldGroup.Section>
        <FieldGroup.Section title="Today">
          <Switch
            label="Show completed section"
            value={general.showCompleted}
            onValueChange={(showCompleted) => onChange({ showCompleted })}
          />
          <Switch
            label="Compact day list"
            value={general.compactStream}
            onValueChange={(compactStream) => onChange({ compactStream })}
          />
          <Switch
            label="Keep Space filter"
            value={general.keepFilterWhileChangingDays}
            onValueChange={(keepFilterWhileChangingDays) =>
              onChange({ keepFilterWhileChangingDays })
            }
          />
          <Switch
            label="Swipe to change day"
            value={general.swipeToChangeDay}
            onValueChange={(swipeToChangeDay) => onChange({ swipeToChangeDay })}
          />
          <Switch
            label="Calendar indicators"
            value={general.calendarIndicators}
            onValueChange={(calendarIndicators) => onChange({ calendarIndicators })}
          />
          <Switch
            label="Tap to edit"
            value={general.clickToEdit}
            onValueChange={(clickToEdit) => onChange({ clickToEdit })}
          />
        </FieldGroup.Section>
        <FieldGroup.Section title="Pull down on Today">
          <Switch
            label="Quick Add"
            value={general.pullDownToAdd}
            onValueChange={(pullDownToAdd) =>
              onChange({ pullDownToAdd, ...(pullDownToAdd ? { pullDownToSearch: false } : {}) })
            }
          />
          <Switch
            label="Search"
            value={general.pullDownToSearch}
            onValueChange={(pullDownToSearch) =>
              onChange({ pullDownToSearch, ...(pullDownToSearch ? { pullDownToAdd: false } : {}) })
            }
          />
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}

function PickerRow<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: [string, T][];
  value: T;
}) {
  return (
    <ListItem
      trailing={
        <Picker selectedValue={value} onValueChange={onChange}>
          {options.map(([optionLabel, optionValue]) => (
            <Picker.Item key={optionValue} label={optionLabel} value={optionValue} />
          ))}
        </Picker>
      }
    >
      <Text>{label}</Text>
    </ListItem>
  );
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
