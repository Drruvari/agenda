import { Host, Picker, TextInput as IOSTextInput } from '@expo/ui';
import { Button as NativeButton } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as nativeDisabled,
  frame,
  labelStyle,
  padding as nativePadding,
  textFieldStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { type ReactNode, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { NativeDateField, NativeTimeField } from '@/components/ui/NativeDateTimeField';
import { NativeSwitch } from '@/components/ui/NativeSwitch';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { Priority } from '@/data/schema/types';
import { useLibrary } from '@/features/library/LibraryContext';
import { type SmartTokenKind, tokenizeSmartInput } from '@/lib/smart-parse/parseSmartInput';
import { ensureNotificationPermissionForReminders } from '@/native/notifications/ensureNotificationPermission';
import {
  type AgendaTheme,
  categoryColorValues,
  continuousCorner,
  fonts,
  useAppAppearance,
  useAppTheme,
} from '@/theme';

import { SmartSyntaxInfo } from './SmartSyntaxInfo';
import {
  DURATION_OPTIONS,
  type EditorKind,
  type ItemEditorDraft,
  KIND_OPTIONS,
  PRIORITY_OPTIONS,
  RECURRENCE_OPTIONS,
  type RecurrenceChoice,
  REMINDER_OPTIONS,
} from './types';

export type ItemEditorFormProps = {
  canSave: boolean;
  draft: ItemEditorDraft;
  heading: string;
  inputKey: string;
  saving: boolean;
  smartParsingEnabled: boolean;
  showDelete?: boolean;
  showTypePicker: boolean;
  spaces: { id: string; name: string }[];
  onChange: (patch: Partial<ItemEditorDraft>) => void;
  onDelete?: () => void;
  onDismiss: () => void;
  onSave: () => void;
  onTitleChange: (text: string) => void;
};

const TYPE_SEGMENTS = KIND_OPTIONS.filter((option) => option.value !== 'routine') as {
  label: string;
  value: 'task' | 'event' | 'note';
}[];

const NONE_SPACE = '__none__';

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function ItemEditorForm({
  canSave,
  draft,
  heading,
  inputKey,
  saving,
  smartParsingEnabled,
  showDelete,
  showTypePicker,
  spaces,
  onChange,
  onDelete,
  onDismiss,
  onSave,
  onTitleChange,
}: ItemEditorFormProps) {
  const { accent, colorScheme } = useAppAppearance();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, accent), [theme, accent]);

  const spaceOptions = useMemo(
    () => [
      { label: 'Inbox', value: NONE_SPACE },
      ...spaces.map((space) => ({ label: space.name, value: space.id })),
    ],
    [spaces],
  );

  const titlePlaceholder =
    draft.kind === 'event'
      ? 'Event name'
      : draft.kind === 'note'
        ? 'Note title'
        : draft.kind === 'routine'
          ? 'Routine name'
          : 'What needs to be done?';
  const showSmartInput =
    smartParsingEnabled && showTypePicker && (draft.kind === 'task' || draft.kind === 'event');

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.header}>
        {Platform.OS === 'ios' ? (
          <Host
            key={`${inputKey}-title`}
            colorScheme={colorScheme}
            ignoreSafeArea="all"
            matchContents
            seedColor={accent}
            style={styles.headerSide}
          >
            <NativeButton
              label="Close"
              modifiers={[
                labelStyle('iconOnly'),
                accessibilityLabel('Close editor'),
                buttonStyle('glass'),
                buttonBorderShape('circle'),
                controlSize('large'),
                tint(theme.textSecondary),
              ]}
              onPress={onDismiss}
              systemImage="xmark"
            />
          </Host>
        ) : (
          <Pressable
            accessibilityLabel="Cancel"
            hitSlop={10}
            onPress={onDismiss}
            style={({ pressed }) => [styles.headerSide, pressed && styles.pressed]}
          >
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        )}

        <Text numberOfLines={1} style={styles.heading}>
          {heading}
        </Text>
        {Platform.OS === 'ios' ? (
          <Host
            colorScheme={colorScheme}
            ignoreSafeArea="all"
            matchContents
            seedColor={accent}
            style={[styles.headerSide, styles.headerSideEnd]}
          >
            <NativeButton
              label="Save"
              modifiers={[
                labelStyle('iconOnly'),
                accessibilityLabel('Save item'),
                buttonStyle('glassProminent'),
                buttonBorderShape('circle'),
                controlSize('large'),
                nativeDisabled(!canSave),
              ]}
              onPress={onSave}
              systemImage={saving ? 'ellipsis' : 'checkmark'}
            />
          </Host>
        ) : (
          <Pressable
            accessibilityLabel="Save"
            disabled={!canSave}
            hitSlop={10}
            onPress={onSave}
            style={({ pressed }) => [
              styles.headerSide,
              styles.headerSideEnd,
              pressed && canSave && styles.pressed,
            ]}
          >
            <Text style={[styles.saveLabel, !canSave && styles.saveDisabled]}>
              {saving ? '…' : 'Save'}
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {showTypePicker && draft.kind !== 'routine' ? (
          <SegmentedControl
            options={TYPE_SEGMENTS}
            value={draft.kind}
            onChange={(kind) =>
              onChange({
                kind,
                timed: kind === 'event' ? true : draft.timed,
                time:
                  kind === 'event' && !draft.time.trim()
                    ? nowTime()
                    : kind === 'note'
                      ? ''
                      : draft.time,
                priority: kind === 'note' || kind === 'event' ? 'none' : draft.priority,
                remindAtTime: kind === 'note' ? false : draft.remindAtTime,
                recurrence: kind === 'note' ? 'never' : draft.recurrence,
              })
            }
            style={styles.segments}
          />
        ) : null}

        {showTypePicker && draft.kind === 'routine' ? (
          <FormSection title="Type" styles={styles}>
            <EditorPickerRow
              label="Type"
              last
              options={KIND_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              value={draft.kind}
              onChange={(kind) => onChange({ kind: kind as EditorKind })}
            />
          </FormSection>
        ) : null}

        {showSmartInput ? (
          <SmartTitleInput
            autoFocus
            inputKey={inputKey}
            onChangeText={onTitleChange}
            placeholder={titlePlaceholder}
            value={draft.title}
          />
        ) : Platform.OS === 'ios' ? (
          <Host
            colorScheme={colorScheme}
            ignoreSafeArea="all"
            seedColor={accent}
            style={styles.nativeTitleHost}
          >
            <IOSTextInput
              autoFocus
              defaultValue={draft.title}
              onChangeText={onTitleChange}
              placeholder={titlePlaceholder}
              placeholderTextColor={theme.placeholder}
              returnKeyType="done"
              selectionColor={accent}
              style={{ width: '100%', height: 58, paddingHorizontal: 16 }}
              textStyle={{ color: theme.text, fontSize: 20, fontWeight: '500' }}
              modifiers={[textFieldStyle('plain'), frame({ height: 58, alignment: 'leading' })]}
            />
          </Host>
        ) : (
          <TextInput
            key={`${inputKey}-title`}
            autoFocus
            onChangeText={onTitleChange}
            placeholder={titlePlaceholder}
            placeholderTextColor={theme.placeholder}
            returnKeyType="done"
            style={styles.titleInput}
            value={draft.title}
          />
        )}

        {draft.kind === 'task' ? (
          <TaskFields
            draft={draft}
            spaceOptions={spaceOptions}
            styles={styles}
            onChange={onChange}
          />
        ) : null}

        {draft.kind === 'event' ? (
          <EventFields
            draft={draft}
            spaceOptions={spaceOptions}
            styles={styles}
            accent={accent}
            colorScheme={colorScheme}
            onChange={onChange}
          />
        ) : null}

        {draft.kind === 'note' ? (
          <NoteFields
            draft={draft}
            spaceOptions={spaceOptions}
            styles={styles}
            onChange={onChange}
          />
        ) : null}

        {draft.kind === 'routine' ? (
          <FormSection title="Organization" styles={styles}>
            <SpacePickerRow
              label="Space"
              spaces={spaceOptions}
              value={draft.spaceId || NONE_SPACE}
              onChange={(spaceId) => onChange({ spaceId: spaceId === NONE_SPACE ? '' : spaceId })}
              styles={styles}
            />
            <EditorRow label="Active" last>
              <NativeSwitch
                accent={accent}
                colorScheme={colorScheme}
                onValueChange={(routineActive) => onChange({ routineActive })}
                value={draft.routineActive}
              />
            </EditorRow>
          </FormSection>
        ) : null}

        {draft.kind !== 'routine' ? (
          Platform.OS === 'ios' ? (
            <Host
              key={`${inputKey}-details`}
              colorScheme={colorScheme}
              ignoreSafeArea="all"
              seedColor={accent}
              style={[
                styles.nativeDetailsHost,
                draft.kind === 'note' && styles.nativeNoteDetailsHost,
              ]}
            >
              <IOSTextInput
                defaultValue={draft.details}
                multiline
                numberOfLines={draft.kind === 'note' ? 8 : 5}
                onChangeText={(details) => onChange({ details })}
                placeholder={draft.kind === 'note' ? 'Write something…' : 'Details (optional)'}
                placeholderTextColor={theme.placeholder}
                selectionColor={accent}
                style={{
                  width: '100%',
                  height: draft.kind === 'note' ? 180 : 112,
                  padding: 16,
                }}
                textAlign="left"
                textStyle={{ color: theme.text, fontSize: 16, lineHeight: 22 }}
                modifiers={[
                  textFieldStyle('plain'),
                  nativePadding({ top: 12, bottom: 12 }),
                  frame({
                    height: draft.kind === 'note' ? 180 : 112,
                    alignment: 'topLeading',
                  }),
                ]}
              />
            </Host>
          ) : (
            <TextInput
              key={`${inputKey}-details`}
              multiline
              onChangeText={(details) => onChange({ details })}
              placeholder={draft.kind === 'note' ? 'Write something…' : 'Details (optional)'}
              placeholderTextColor={theme.placeholder}
              style={[styles.detailsInput, draft.kind === 'note' && styles.noteBody]}
              textAlignVertical="top"
              value={draft.details}
            />
          )
        ) : null}

        {showDelete ? (
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <Text style={styles.deleteLabel}>
              {draft.kind === 'routine' ? 'Delete routine' : 'Delete item'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function smartTokenColor(kind: SmartTokenKind, mode: AgendaTheme['mode']): string {
  if (kind === 'type') return categoryColorValues.indigo[mode];
  if (kind === 'date') return categoryColorValues.green[mode];
  if (kind === 'time') return categoryColorValues.orange[mode];
  if (kind === 'space') return categoryColorValues.cyan[mode];
  return categoryColorValues.red[mode];
}

function SmartTitleInput({
  autoFocus,
  inputKey,
  onChangeText,
  placeholder,
  value,
}: {
  autoFocus?: boolean;
  inputKey: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  value: string;
}) {
  const { accent } = useAppAppearance();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme, accent), [theme, accent]);
  const segments = useMemo(() => tokenizeSmartInput(value), [value]);
  const [inputHeight, setInputHeight] = useState(40);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.smartInputRow}>
      <View collapsable={false} style={[styles.smartInputWrap, { height: inputHeight }]}>
        {value ? (
          <Text
            onTextLayout={({ nativeEvent }) =>
              setInputHeight(Math.max(40, nativeEvent.lines.length * 30 + 8))
            }
            pointerEvents="none"
            style={styles.smartInputHighlight}
          >
            {segments.map((segment, index) => (
              <Text
                key={`${index}-${segment.text}`}
                style={
                  segment.kind ? { color: smartTokenColor(segment.kind, theme.mode) } : undefined
                }
              >
                {segment.text}
              </Text>
            ))}
            {Platform.OS === 'android' && focused ? (
              <Text style={{ color: accent, letterSpacing: -4 }}>▏</Text>
            ) : null}
          </Text>
        ) : null}
        <TextInput
          key={`${inputKey}-title`}
          autoFocus={autoFocus}
          blurOnSubmit
          cursorColor={accent}
          multiline
          onChangeText={(text) => {
            if (!text) setInputHeight(40);
            onChangeText(text);
          }}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          onBlur={() => setFocused(false)}
          onFocus={() => setFocused(true)}
          returnKeyType="done"
          scrollEnabled={false}
          selectionColor={accent}
          style={[
            styles.titleInput,
            { height: inputHeight },
            value ? styles.smartInputEditor : null,
          ]}
          textAlignVertical="top"
          value={value}
        />
      </View>
      <SmartSyntaxInfo />
    </View>
  );
}

type FieldStyles = ReturnType<typeof createStyles>;

function TaskFields({
  draft,
  onChange,
  spaceOptions,
  styles,
}: {
  draft: ItemEditorDraft;
  onChange: (patch: Partial<ItemEditorDraft>) => void;
  spaceOptions: { label: string; value: string }[];
  styles: FieldStyles;
}) {
  return (
    <>
      <FormSection title="Date & Time" styles={styles}>
        <EditorRow label="Date">
          <NativeDateField embedded onChange={(date) => onChange({ date })} value={draft.date} />
        </EditorRow>
        <TimeOffRow draft={draft} last styles={styles} onChange={onChange} />
      </FormSection>

      <FormSection title="Schedule" styles={styles}>
        <EditorPickerRow
          label="Repeat"
          options={RECURRENCE_OPTIONS}
          value={draft.recurrence}
          onChange={(recurrence) => onChange({ recurrence: recurrence as RecurrenceChoice })}
        />
        <EditorPickerRow
          label="Reminder"
          last
          options={REMINDER_OPTIONS}
          value={draft.remindAtTime && draft.timed ? 'at_time' : 'none'}
          onChange={(value) => {
            if (value === 'none') {
              onChange({ remindAtTime: false });
              return;
            }
            if (!draft.timed) {
              onChange({
                timed: true,
                time: draft.time.trim() || nowTime(),
                remindAtTime: true,
              });
              void ensureNotificationPermissionForReminders().then((allowed) => {
                if (!allowed) onChange({ remindAtTime: false });
              });
              return;
            }
            void ensureNotificationPermissionForReminders().then((allowed) => {
              onChange({ remindAtTime: allowed });
            });
          }}
        />
      </FormSection>

      <FormSection title="Organization" styles={styles}>
        <SpacePickerRow
          label="Space"
          spaces={spaceOptions}
          value={draft.spaceId || NONE_SPACE}
          onChange={(spaceId) => onChange({ spaceId: spaceId === NONE_SPACE ? '' : spaceId })}
          styles={styles}
        />
        <EditorPickerRow
          label="Priority"
          last
          options={PRIORITY_OPTIONS}
          value={draft.priority}
          onChange={(priority) => onChange({ priority: priority as Priority })}
        />
      </FormSection>
    </>
  );
}

function EventFields({
  accent,
  colorScheme,
  draft,
  onChange,
  spaceOptions,
  styles,
}: {
  accent: string;
  colorScheme: 'light' | 'dark';
  draft: ItemEditorDraft;
  onChange: (patch: Partial<ItemEditorDraft>) => void;
  spaceOptions: { label: string; value: string }[];
  styles: FieldStyles;
}) {
  const durationLabel =
    DURATION_OPTIONS.find((option) => option.value === String(draft.durationMinutes))?.label ??
    `${draft.durationMinutes} min`;

  return (
    <>
      <FormSection title="Date & Time" styles={styles}>
        <EditorRow
          label="All-day"
          value={
            <SwitchControl
              accent={accent}
              colorScheme={colorScheme}
              onValueChange={(allDay) => {
                if (allDay) {
                  onChange({ timed: false, time: '', remindAtTime: false });
                  return;
                }
                onChange({ timed: true, time: draft.time.trim() || nowTime() });
              }}
              value={!draft.timed}
            />
          }
        />
        <EditorRow label="Starts">
          <NativeDateField embedded onChange={(date) => onChange({ date })} value={draft.date} />
        </EditorRow>
        {draft.timed ? (
          <EditorRow label="Time">
            <NativeTimeField
              embedded
              optional={false}
              onChange={(time) => onChange({ time, timed: Boolean(time.trim()) })}
              value={draft.time}
            />
          </EditorRow>
        ) : null}
        {draft.timed ? (
          <EditorPickerRow
            label="Duration"
            last
            options={DURATION_OPTIONS}
            value={String(draft.durationMinutes)}
            displayValue={durationLabel}
            onChange={(value) => onChange({ durationMinutes: Number(value) || 30 })}
          />
        ) : (
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>Ends</Text>
            <Text style={styles.mutedValue}>Same day</Text>
          </View>
        )}
      </FormSection>

      <FormSection title="Schedule" styles={styles}>
        <EditorPickerRow
          label="Repeat"
          options={RECURRENCE_OPTIONS}
          value={draft.recurrence}
          onChange={(recurrence) => onChange({ recurrence: recurrence as RecurrenceChoice })}
        />
        <EditorPickerRow
          label="Alert"
          last
          options={REMINDER_OPTIONS.map((option) =>
            option.value === 'at_time' ? { ...option, label: 'At start' } : option,
          )}
          value={draft.remindAtTime ? 'at_time' : 'none'}
          onChange={(value) => {
            if (value === 'none') {
              onChange({ remindAtTime: false });
              return;
            }
            void ensureNotificationPermissionForReminders().then((allowed) => {
              onChange({ remindAtTime: allowed });
            });
          }}
        />
      </FormSection>

      <FormSection title="Organization" styles={styles}>
        <SpacePickerRow
          label="Space"
          last
          spaces={spaceOptions}
          value={draft.spaceId || NONE_SPACE}
          onChange={(spaceId) => onChange({ spaceId: spaceId === NONE_SPACE ? '' : spaceId })}
          styles={styles}
        />
      </FormSection>
    </>
  );
}

function NoteFields({
  draft,
  onChange,
  spaceOptions,
  styles,
}: {
  draft: ItemEditorDraft;
  onChange: (patch: Partial<ItemEditorDraft>) => void;
  spaceOptions: { label: string; value: string }[];
  styles: FieldStyles;
}) {
  return (
    <FormSection title="Organization" styles={styles}>
      <EditorRow label="Date">
        <NativeDateField embedded onChange={(date) => onChange({ date })} value={draft.date} />
      </EditorRow>
      <SpacePickerRow
        label="Space"
        last
        spaces={spaceOptions}
        value={draft.spaceId || NONE_SPACE}
        onChange={(spaceId) => onChange({ spaceId: spaceId === NONE_SPACE ? '' : spaceId })}
        styles={styles}
      />
    </FormSection>
  );
}

function TimeOffRow({
  draft,
  last,
  onChange,
  styles,
}: {
  draft: ItemEditorDraft;
  last?: boolean;
  onChange: (patch: Partial<ItemEditorDraft>) => void;
  styles: FieldStyles;
}) {
  if (!draft.timed) {
    return (
      <EditorPickerRow
        label="Time"
        last={last}
        options={[
          { label: 'Off', value: 'off' },
          { label: 'Set time', value: 'on' },
        ]}
        value="off"
        displayValue="Off"
        onChange={(value) => {
          if (value === 'on') {
            onChange({ timed: true, time: nowTime() });
          }
        }}
      />
    );
  }

  return (
    <EditorRow
      label="Time"
      last={last}
      value={
        <View style={styles.timeRow}>
          <NativeTimeField
            embedded
            optional={false}
            onChange={(time) =>
              onChange({
                time,
                timed: Boolean(time.trim()),
                remindAtTime: time.trim() ? draft.remindAtTime : false,
              })
            }
            value={draft.time}
          />
          <Pressable
            accessibilityLabel="Turn time off"
            hitSlop={8}
            onPress={() => onChange({ timed: false, time: '', remindAtTime: false })}
          >
            <Text style={styles.offLink}>Off</Text>
          </Pressable>
        </View>
      }
    />
  );
}

function FormSection({
  children,
  styles,
  title,
}: {
  children: ReactNode;
  styles: FieldStyles;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function SwitchControl({
  accent,
  colorScheme,
  onValueChange,
  value,
}: {
  accent: string;
  colorScheme: 'light' | 'dark';
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={switchWrap}>
      <NativeSwitch
        accent={accent}
        colorScheme={colorScheme}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
}

const switchWrap = {
  height: 32,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

function EditorRow({
  children,
  label,
  last,
  value,
}: {
  children?: ReactNode;
  label: string;
  last?: boolean;
  value?: ReactNode;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme, theme.primary), [theme]);
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowTrailing}>{value ?? children}</View>
    </View>
  );
}

function SpacePickerRow({
  label,
  last,
  onChange,
  spaces,
  styles,
  value,
}: {
  label: string;
  last?: boolean;
  onChange: (value: string) => void;
  spaces: { label: string; value: string }[];
  styles: FieldStyles;
  value: string;
}) {
  const { accent } = useAppAppearance();
  const { openSpacePicker } = useLibrary();
  const selected = spaces.find((option) => option.value === value)?.label ?? 'Inbox';

  return (
    <Pressable
      onPress={() =>
        openSpacePicker(value === NONE_SPACE ? null : value, (spaceId) =>
          onChange(spaceId ?? NONE_SPACE),
        )
      }
      style={({ pressed }) => [styles.row, last && styles.rowLast, pressed && styles.pressed]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowTrailing}>
        <Text style={[styles.rowPickerValue, { color: accent }]}>{selected}</Text>
        <Icon name="chevronRight" size={18} color={accent} />
      </View>
    </Pressable>
  );
}

function EditorPickerRow({
  displayValue,
  label,
  last,
  onChange,
  options,
  value,
}: {
  displayValue?: string;
  label: string;
  last?: boolean;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  const { accent, colorScheme } = useAppAppearance();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme, accent), [theme, accent]);
  const [open, setOpen] = useState(false);
  const selected = displayValue ?? options.find((option) => option.value === value)?.label ?? value;

  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.row, last && styles.rowLast]}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Host
          colorScheme={colorScheme}
          ignoreSafeArea="all"
          matchContents
          seedColor={accent}
          style={styles.pickerHost}
        >
          <Picker appearance="menu" onValueChange={onChange} selectedValue={value}>
            {options.map((option) => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </Host>
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityLabel={`${label}, ${selected}`}
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.row, last && styles.rowLast, pressed && styles.pressed]}
      >
        <Text style={styles.rowLabel}>{label}</Text>
        <Text numberOfLines={1} style={[styles.rowPickerValue, { color: accent }]}>
          {selected}
        </Text>
      </Pressable>

      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>{label}</Text>
            {options.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value || 'none'}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.modalOption,
                    active && styles.modalOptionActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.modalOptionLabel, active && { color: accent }]}>
                    {option.label}
                  </Text>
                  {active ? <Icon color={accent} name="check" size={20} stroke={2.2} /> : null}
                </Pressable>
              );
            })}
            <Pressable onPress={() => setOpen(false)} style={styles.modalCancel}>
              <Text style={[styles.modalCancelLabel, { color: accent }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(theme: AgendaTheme, accent: string) {
  const cardBg = theme.isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(118, 118, 128, 0.09)';
  const destructiveBg = theme.isDark ? 'rgba(255, 69, 58, 0.16)' : 'rgba(255, 59, 48, 0.1)';
  return StyleSheet.create({
    root: {
      flex: 1,
      width: '100%',
      backgroundColor: 'transparent',
    },
    header: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingTop: 4,
      backgroundColor: 'transparent',
    },
    headerSide: {
      minWidth: 72,
      height: 44,
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    headerSideEnd: {
      alignItems: 'flex-end',
    },
    cancel: {
      color: theme.textSecondary,
      fontFamily: fonts.sansMedium,
      fontSize: 17,
      lineHeight: 22,
    },
    heading: {
      flex: 1,
      textAlign: 'center',
      color: theme.text,
      fontFamily: fonts.sansSemi,
      fontSize: 17,
      lineHeight: 22,
      letterSpacing: -0.2,
    },
    saveLabel: {
      color: accent,
      fontFamily: fonts.sansSemi,
      fontSize: 17,
      lineHeight: 22,
    },
    saveDisabled: {
      opacity: 0.35,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 24,
      gap: 16,
      backgroundColor: 'transparent',
    },
    segments: {
      alignSelf: 'stretch',
    },
    titleInput: {
      minHeight: 40,
      paddingVertical: 4,
      paddingHorizontal: 2,
      color: theme.text,
      fontFamily: fonts.sansSemi,
      fontSize: 24,
      lineHeight: 30,
      letterSpacing: -0.3,
      backgroundColor: 'transparent',
    },
    smartInputRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    smartInputWrap: {
      flex: 1,
      position: 'relative',
      overflow: 'hidden',
    },
    smartInputHighlight: {
      position: 'absolute',
      zIndex: Platform.OS === 'ios' ? 1 : 0,
      top: 0,
      right: 0,
      bottom: Platform.OS === 'android' ? 0 : undefined,
      left: 0,
      paddingVertical: 4,
      paddingHorizontal: 2,
      color: theme.text,
      fontFamily: fonts.sansSemi,
      fontSize: 24,
      lineHeight: 30,
      letterSpacing: -0.3,
    },
    smartInputEditor: {
      color: 'rgba(0, 0, 0, 0)',
      opacity: Platform.OS === 'android' ? 0 : 1,
    },
    nativeTitleHost: {
      width: '100%',
      height: 58,
    },
    section: {
      gap: 8,
    },
    sectionTitle: {
      marginLeft: 4,
      color: theme.textSecondary,
      fontFamily: fonts.sansSemi,
      fontSize: 13,
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    card: {
      overflow: 'hidden',
      backgroundColor: cardBg,
      ...continuousCorner(14),
    },
    row: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 14,
      paddingRight: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowLabel: {
      flex: 1,
      minWidth: 0,
      color: theme.text,
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      lineHeight: 22,
      paddingRight: 12,
    },
    rowTrailing: {
      flexShrink: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    rowPickerValue: {
      flexShrink: 1,
      textAlign: 'right',
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      lineHeight: 22,
    },
    mutedValue: {
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 16,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    offLink: {
      color: accent,
      fontFamily: fonts.sansSemi,
      fontSize: 15,
    },
    pickerHost: {
      flexShrink: 0,
      alignSelf: 'center',
      marginLeft: 'auto',
    },
    detailsInput: {
      minHeight: 108,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: theme.text,
      fontFamily: fonts.sans,
      fontSize: 16,
      lineHeight: 22,
      backgroundColor: cardBg,
      ...continuousCorner(14),
    },
    noteBody: {
      minHeight: 160,
    },
    nativeDetailsHost: {
      width: '100%',
      height: 112,
      overflow: 'hidden',
      backgroundColor: cardBg,
      ...continuousCorner(14),
    },
    nativeNoteDetailsHost: {
      height: 180,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
      padding: 12,
      paddingBottom: 24,
    },
    modalSheet: {
      overflow: 'hidden',
      backgroundColor: cardBg,
      ...continuousCorner(16),
    },
    modalTitle: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 10,
      color: theme.text,
      fontFamily: fonts.sansSemi,
      fontSize: 17,
    },
    modalOption: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.separator,
    },
    modalOptionActive: {
      backgroundColor: theme.primarySoft,
    },
    modalOptionLabel: {
      flex: 1,
      color: theme.text,
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      lineHeight: 22,
    },
    modalCancel: {
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.separator,
    },
    modalCancelLabel: {
      fontFamily: fonts.sansSemi,
      fontSize: 16,
    },
    deleteButton: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: destructiveBg,
      ...continuousCorner(14),
    },
    deleteLabel: {
      color: theme.danger,
      fontFamily: fonts.sansSemi,
      fontSize: 16,
    },
    pressed: {
      opacity: 0.72,
    },
  });
}
