import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormRow } from '@/components/ui/form/FormRow';
import { FormSection } from '@/components/ui/form/FormSection';
import { NativeDateField, NativeTimeField } from '@/components/ui/NativeDateTimeField';
import { NativeSwitch } from '@/components/ui/NativeSwitch';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { Priority } from '@/data/schema/types';
import { tokenizeSmartInput } from '@/lib/smart-parse/parseSmartInput';
import type { SmartTokenKind } from '@/lib/smart-parse/parseSmartInput.types';
import { ensureNotificationPermissionForReminders } from '@/native/notifications/ensureNotificationPermission';
import { useAppAppearance, useAppTheme } from '@/theme/AppThemeProvider';
import { type AgendaTheme, categoryColorValues } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { continuousCorner, spacing } from '@/theme/tokens';

import { EditorPickerRow } from './EditorPickerRow';
import { ItemEditorHeaderActions } from './ItemEditorHeaderActions';
import { SpacePickerRow } from './SpacePickerRow';
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
  const { accent } = useAppAppearance();
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
        <ItemEditorHeaderActions
          canSave={canSave}
          inputKey={inputKey}
          saving={saving}
          onDismiss={onDismiss}
          onSave={onSave}
        />
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
          <FormSection title="Organization">
            <SpacePickerRow
              label="Space"
              spaces={spaceOptions}
              value={draft.spaceId || NONE_SPACE}
              onChange={(spaceId) => onChange({ spaceId: spaceId === NONE_SPACE ? '' : spaceId })}
            />
            <FormRow label="Active" last>
              <NativeSwitch
                onValueChange={(routineActive) => onChange({ routineActive })}
                value={draft.routineActive}
              />
            </FormRow>
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
      <FormSection title="Date & Time">
        <FormRow label="Date">
          <NativeDateField embedded onChange={(date) => onChange({ date })} value={draft.date} />
        </FormRow>
        <TimeOffRow draft={draft} last styles={styles} onChange={onChange} />
      </FormSection>

      <FormSection title="Schedule">
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

      <FormSection title="Organization">
        <SpacePickerRow
          label="Space"
          spaces={spaceOptions}
          value={draft.spaceId || NONE_SPACE}
          onChange={(spaceId) => onChange({ spaceId: spaceId === NONE_SPACE ? '' : spaceId })}
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
      <FormSection title="Date & Time">
        <FormRow
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
        <FormRow label="Starts">
          <NativeDateField embedded onChange={(date) => onChange({ date })} value={draft.date} />
        </FormRow>
        {draft.timed ? (
          <FormRow label="Time">
            <NativeTimeField
              embedded
              optional={false}
              onChange={(time) => onChange({ time, timed: Boolean(time.trim()) })}
              value={draft.time}
            />
          </FormRow>
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
          <FormRow last label="Ends">
            <Text style={styles.mutedValue}>Same day</Text>
          </FormRow>
        )}
      </FormSection>

      <FormSection title="Schedule">
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

      <FormSection title="Organization">
        <SpacePickerRow
          label="Space"
          last
          spaces={spaceOptions}
          value={draft.spaceId || NONE_SPACE}
          onChange={(spaceId) => onChange({ spaceId: spaceId === NONE_SPACE ? '' : spaceId })}
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
    <FormSection title="Organization">
      <FormRow label="Date">
        <NativeDateField embedded onChange={(date) => onChange({ date })} value={draft.date} />
      </FormRow>
      <SpacePickerRow
        label="Space"
        last
        spaces={spaceOptions}
        value={draft.spaceId || NONE_SPACE}
        onChange={(spaceId) => onChange({ spaceId: spaceId === NONE_SPACE ? '' : spaceId })}
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
    <FormRow
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
    heading: {
      ...StyleSheet.absoluteFill,
      textAlign: 'center',
      color: theme.text,
      fontFamily: fonts.sansSemi,
      fontSize: 17,
      lineHeight: 56,
      letterSpacing: -0.2,
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
