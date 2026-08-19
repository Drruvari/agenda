import { Host, Picker } from '@expo/ui';
import { Button as NativeButton } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as nativeDisabled,
  labelStyle,
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
import { IosChooseSpaceControl } from '@/features/library/IosChooseSpaceControl';
import { useLibrary } from '@/features/library/LibraryContext';
import { tokenizeSmartInput } from '@/lib/smart-parse/parseSmartInput';
import type { SmartTokenKind } from '@/lib/smart-parse/parseSmartInput.types';
import { ensureNotificationPermissionForReminders } from '@/native/notifications/ensureNotificationPermission';
import { useAppAppearance, useAppTheme } from '@/theme/AppThemeProvider';
import { type AgendaTheme, categoryColorValues } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { continuousCorner, spacing } from '@/theme/tokens';

import {
  DURATION_OPTIONS,
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
        <Text pointerEvents="none" numberOfLines={1} style={styles.heading}>
          {heading}
        </Text>
        <View style={styles.headerBar}>
          {Platform.OS === 'ios' ? (
            <Host
              key={`${inputKey}-close`}
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
              style={({ pressed }) => [
                styles.headerSide,
                styles.headerSideStart,
                pressed && styles.pressed,
              ]}
            >
              <Text numberOfLines={1} style={styles.cancel}>
                Cancel
              </Text>
            </Pressable>
          )}

          <View style={styles.headerSideSpacer} />

          {Platform.OS === 'ios' ? (
            <Host
              colorScheme={colorScheme}
              ignoreSafeArea="all"
              matchContents
              seedColor={accent}
              style={styles.headerSide}
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
              <Text numberOfLines={1} style={[styles.saveLabel, !canSave && styles.saveDisabled]}>
                {saving ? '…' : 'Save'}
              </Text>
            </Pressable>
          )}
        </View>
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

        <View style={styles.heroCard}>
          {showSmartInput ? (
            <SmartTitleInput
              autoFocus
              inputKey={inputKey}
              onChangeText={onTitleChange}
              placeholder={titlePlaceholder}
              value={draft.title}
            />
          ) : (
            <TextInput
              key={`${inputKey}-title`}
              autoFocus
              onChangeText={onTitleChange}
              placeholder={titlePlaceholder}
              placeholderTextColor={theme.placeholder}
              returnKeyType="done"
              selectionColor={accent}
              cursorColor={accent}
              style={styles.titleInput}
              value={draft.title}
            />
          )}

          {draft.kind !== 'routine' ? (
            <>
              <View style={styles.heroDivider} />
              <TextInput
                key={`${inputKey}-details`}
                multiline
                onChangeText={(details) => onChange({ details })}
                placeholder={draft.kind === 'note' ? 'Write something…' : 'Notes'}
                placeholderTextColor={theme.placeholder}
                selectionColor={accent}
                cursorColor={accent}
                style={[styles.detailsInput, draft.kind === 'note' && styles.noteBody]}
                textAlignVertical="top"
                value={draft.details}
              />
            </>
          ) : null}
        </View>

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
                onValueChange={(routineActive) => onChange({ routineActive })}
                value={draft.routineActive}
              />
            </EditorRow>
          </FormSection>
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

  return (
    <TextInput
      key={`${inputKey}-title`}
      autoFocus={autoFocus}
      blurOnSubmit
      cursorColor={accent}
      multiline
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.placeholder}
      returnKeyType="done"
      scrollEnabled={false}
      selectionColor={accent}
      style={styles.smartInputField}
      textAlignVertical="center"
    >
      <Text>
        {segments.map((segment, index) => (
          <Text
            key={`${index}-${segment.text}`}
            style={{
              color: segment.kind ? smartTokenColor(segment.kind, theme.mode) : theme.text,
            }}
          >
            {segment.text}
          </Text>
        ))}
      </Text>
    </TextInput>
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
          <View style={styles.row}>
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
  onValueChange,
  value,
}: {
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={switchWrap}>
      <NativeSwitch onValueChange={onValueChange} value={value} />
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
    <View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={styles.rowTrailing}>{value ?? children}</View>
      </View>
      {!last ? <View style={styles.insetSeparator} /> : null}
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
  const theme = useAppTheme();
  const { openSpacePicker } = useLibrary();
  const selected = spaces.find((option) => option.value === value)?.label ?? 'Inbox';

  if (Platform.OS === 'ios') {
    return (
      <View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{label}</Text>
          <IosChooseSpaceControl onChange={onChange} spaces={spaces} value={value} />
        </View>
        {!last ? <View style={styles.insetSeparator} /> : null}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={`${label}, ${selected}`}
      accessibilityRole="button"
      onPress={() =>
        openSpacePicker(value === NONE_SPACE ? null : value, (spaceId) =>
          onChange(spaceId ?? NONE_SPACE),
        )
      }
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={styles.rowTrailing}>
          <Text style={[styles.rowPickerValue, { color: accent }]}>{selected}</Text>
          <Icon name="chevronRight" size={18} color={theme.textSecondary} />
        </View>
      </View>
      {!last ? <View style={styles.insetSeparator} /> : null}
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
      <View>
        <View style={styles.row}>
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
        {!last ? <View style={styles.insetSeparator} /> : null}
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityLabel={`${label}, ${selected}`}
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text numberOfLines={1} style={[styles.rowPickerValue, { color: accent }]}>
            {selected}
          </Text>
        </View>
        {!last ? <View style={styles.insetSeparator} /> : null}
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
  // Transparent on iOS so the sheet's liquid-glass material shows through between cards.
  const sheetBg = Platform.OS === 'ios' ? 'transparent' : theme.background;
  const cardBg = theme.card;
  const destructiveBg = theme.isDark ? 'rgba(255, 69, 58, 0.16)' : 'rgba(255, 59, 48, 0.1)';
  const titleTypography = {
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.41,
  } as const;

  return StyleSheet.create({
    root: {
      flex: 1,
      width: '100%',
      backgroundColor: sheetBg,
    },
    header: {
      height: 56,
      justifyContent: 'center',
      marginBottom: spacing.sm,
      backgroundColor: sheetBg,
    },
    headerBar: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerSide: {
      minWidth: Platform.OS === 'android' ? 72 : 44,
      height: 44,
      paddingHorizontal: Platform.OS === 'android' ? 4 : 0,
      justifyContent: 'center',
      ...(Platform.OS === 'ios' ? { width: 44, alignItems: 'center' as const } : null),
    },
    headerSideStart: {
      alignItems: 'flex-start',
    },
    headerSideSpacer: {
      flex: 1,
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
      ...StyleSheet.absoluteFill,
      textAlign: 'center',
      color: theme.text,
      fontFamily: fonts.sansSemi,
      fontSize: 17,
      lineHeight: 56,
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
      width: '100%',
      alignItems: 'stretch',
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: spacing.xl,
      gap: spacing.md,
      backgroundColor: sheetBg,
    },
    segments: {
      alignSelf: 'stretch',
      width: '100%',
    },
    heroCard: {
      overflow: 'hidden',
      backgroundColor: cardBg,
      ...continuousCorner(12),
    },
    heroDivider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: spacing.lg,
      backgroundColor: theme.separator,
    },
    titleInput: {
      minHeight: 44,
      paddingVertical: 12,
      paddingHorizontal: spacing.lg,
      color: theme.text,
      ...titleTypography,
      backgroundColor: 'transparent',
    },
    smartInputField: {
      width: '100%',
      minHeight: 44,
      paddingVertical: 12,
      paddingHorizontal: spacing.lg,
      color: theme.text,
      ...titleTypography,
      backgroundColor: 'transparent',
    },
    section: {
      gap: spacing.xs,
    },
    sectionTitle: {
      marginLeft: spacing.sm,
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 13,
      lineHeight: 16,
      letterSpacing: -0.08,
      textTransform: 'uppercase',
    },
    card: {
      overflow: 'hidden',
      backgroundColor: cardBg,
      ...continuousCorner(12),
    },
    row: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: spacing.lg,
      paddingRight: spacing.lg,
      paddingVertical: spacing.sm,
    },
    insetSeparator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: spacing.lg,
      backgroundColor: theme.separator,
    },
    rowLabel: {
      flex: 1,
      minWidth: 0,
      color: theme.text,
      fontFamily: fonts.sans,
      fontSize: 17,
      lineHeight: 22,
      paddingRight: spacing.md,
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
      fontFamily: fonts.sans,
      fontSize: 17,
      lineHeight: 22,
    },
    mutedValue: {
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 17,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
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
      minHeight: 72,
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
      color: theme.text,
      fontFamily: fonts.sans,
      fontSize: 17,
      lineHeight: 22,
      backgroundColor: 'transparent',
    },
    noteBody: {
      minHeight: 140,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
      padding: spacing.md,
      paddingBottom: spacing.lg,
    },
    modalSheet: {
      overflow: 'hidden',
      backgroundColor: theme.card,
      ...continuousCorner(14),
    },
    modalTitle: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      color: theme.text,
      fontFamily: fonts.sansSemi,
      fontSize: 17,
    },
    modalOption: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
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
      ...continuousCorner(12),
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
