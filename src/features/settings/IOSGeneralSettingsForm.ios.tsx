import { Form, Host, Picker, Section, Text, Toggle } from '@expo/ui/swift-ui';
import { tag, tint } from '@expo/ui/swift-ui/modifiers';

import type { AccentColor, AppSettings } from '@/data/schema/types';
import { useAppAppearance } from '@/theme/AppThemeProvider';

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

export function IOSGeneralSettingsForm({
  general,
  onChange,
}: {
  general: AppSettings['general'];
  onChange: (patch: Partial<AppSettings['general']>) => void;
}) {
  const { accent } = useAppAppearance();
  const switchTint = general.accent === 'black' ? '#34C759' : accent;

  return (
    <Host style={{ flex: 1 }}>
      <Form modifiers={[tint(accent)]}>
        <Section title="Date & Calendar">
          <NativePicker
            label="Date Format"
            value={general.dateFormat}
            options={[
              ['Long', 'long'],
              ['Short', 'short'],
            ]}
            onChange={(dateFormat) => onChange({ dateFormat })}
          />
          <NativePicker
            label="Week Starts On"
            value={general.weekStartsOn}
            options={[
              ['Monday', 'monday'],
              ['Sunday', 'sunday'],
            ]}
            onChange={(weekStartsOn) => onChange({ weekStartsOn })}
          />
        </Section>

        <Section title="Appearance">
          <NativePicker
            label="Appearance"
            value={general.mode}
            options={[
              ['System', 'system'],
              ['Light', 'light'],
              ['Dark', 'dark'],
            ]}
            onChange={(mode) => onChange({ mode })}
          />
          <NativePicker
            label="Accent Color"
            value={general.accent}
            options={ACCENTS.map((value) => [titleCase(value), value])}
            onChange={(accent) => onChange({ accent })}
          />
        </Section>

        <Section title="Today">
          <NativeToggle
            label="Show Completed Section"
            tintColor={switchTint}
            value={general.showCompleted}
            onChange={(showCompleted) => onChange({ showCompleted })}
          />
          <NativeToggle
            label="Compact Day List"
            tintColor={switchTint}
            value={general.compactStream}
            onChange={(compactStream) => onChange({ compactStream })}
          />
          <NativeToggle
            label="Keep Space Filter"
            tintColor={switchTint}
            value={general.keepFilterWhileChangingDays}
            onChange={(keepFilterWhileChangingDays) => onChange({ keepFilterWhileChangingDays })}
          />
          <NativeToggle
            label="Swipe to Change Day"
            tintColor={switchTint}
            value={general.swipeToChangeDay}
            onChange={(swipeToChangeDay) => onChange({ swipeToChangeDay })}
          />
          <NativeToggle
            label="Calendar Indicators"
            tintColor={switchTint}
            value={general.calendarIndicators}
            onChange={(calendarIndicators) => onChange({ calendarIndicators })}
          />
          <NativeToggle
            label="Tap to Edit"
            tintColor={switchTint}
            value={general.clickToEdit}
            onChange={(clickToEdit) => onChange({ clickToEdit })}
          />
        </Section>

        <Section title="Pull Down on Today">
          <NativeToggle
            label="Quick Add"
            tintColor={switchTint}
            value={general.pullDownToAdd}
            onChange={(pullDownToAdd) =>
              onChange({ pullDownToAdd, ...(pullDownToAdd ? { pullDownToSearch: false } : {}) })
            }
          />
          <NativeToggle
            label="Search"
            tintColor={switchTint}
            value={general.pullDownToSearch}
            onChange={(pullDownToSearch) =>
              onChange({ pullDownToSearch, ...(pullDownToSearch ? { pullDownToAdd: false } : {}) })
            }
          />
        </Section>

        <Section title="Drawing">
          <NativeToggle
            label="Apple Pencil Only"
            tintColor={switchTint}
            value={general.penOnlyDrawing}
            onChange={(penOnlyDrawing) => onChange({ penOnlyDrawing })}
          />
        </Section>
      </Form>
    </Host>
  );
}

function NativeToggle({
  label,
  onChange,
  tintColor,
  value,
}: {
  label: string;
  onChange: (value: boolean) => void;
  tintColor: string;
  value: boolean;
}) {
  return (
    <Toggle label={label} isOn={value} onIsOnChange={onChange} modifiers={[tint(tintColor)]} />
  );
}

function NativePicker<T extends string>({
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
    <Picker label={label} selection={value} onSelectionChange={onChange}>
      {options.map(([optionLabel, optionValue]) => (
        <Text key={optionValue} modifiers={[tag(optionValue)]}>
          {optionLabel}
        </Text>
      ))}
    </Picker>
  );
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
