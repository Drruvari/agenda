import {
  FieldGroup,
  Host,
  ListItem as NativeListItem,
  Picker,
  Switch as NativeSettingsSwitch,
  Text as NativeText,
} from '@expo/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  PlatformColor,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { NativeSwitch } from '@/components/ui/NativeSwitch';
import { useToast } from '@/components/ui/ToastProvider';
import {
  type AccentColor,
  type AppSettings,
  DEFAULT_SETTINGS,
  type ItemType,
  useData,
} from '@/data';
import type { AgendaItem, DailyNote, Drawing, Space } from '@/data/schema/types';
import { PrivacySettings } from '@/features/privacy';
import {
  type AgendaTheme,
  continuousCorner,
  fonts,
  getAccentColor,
  useAppAppearance,
  useAppTheme,
} from '@/theme';

import { IOSGeneralSettingsForm } from './IOSGeneralSettingsForm';
import { SettingPicker } from './SettingPicker';
import { SettingsScaffold, SettingsSection, SettingsTabBar } from './SettingsChrome';
import {
  createBackup,
  createDiagnostic,
  formatTodayPage,
  pageTextToHtml,
  parseBackup,
  restoreBackup,
} from './settingsData';
import { pickBackupFile, printPage, saveBackupFile } from './settingsFiles';

type SettingsTab = 'general' | 'editor' | 'export' | 'sync' | 'privacy';

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

const TABS: { value: SettingsTab; label: string; icon: IconName }[] = [
  { value: 'general', label: 'General', icon: 'settings' },
  { value: 'editor', label: 'Editor', icon: 'typography' },
  { value: 'export', label: 'Export', icon: 'fileExport' },
  { value: 'sync', label: 'Sync', icon: 'cloud' },
  { value: 'privacy', label: 'Privacy', icon: 'lock' },
];

type Diagnostic = Awaited<ReturnType<typeof createDiagnostic>>;

export function SettingsScreen({
  categoryOnly = false,
  initialTab = 'general',
}: {
  categoryOnly?: boolean;
  initialTab?: SettingsTab;
} = {}) {
  const { db, refresh, repos, setSettings, settings, settingsStore, ui } = useData();
  const insets = useSafeAreaInsets();
  const blurTarget = useRef<View | null>(null);
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [busy, setBusy] = useState(false);
  const [folderSync, setFolderSync] = useState(true);
  const [todayShortcut, setTodayShortcut] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);

  const { accent, colorScheme } = useAppAppearance();
  const nativeSeedColor = settings.general.accent === 'black' ? '#34C759' : accent;
  const { showToast } = useToast();

  const reloadDiagnostic = useCallback(async () => {
    setDiagnostic(await createDiagnostic(db));
  }, [db]);

  useEffect(() => {
    void repos.spaces.list().then(setSpaces);
    void createDiagnostic(db).then(setDiagnostic);
    void Promise.all([
      settingsStore.getItem('sync.dailyNotesFolder'),
      settingsStore.getItem('sync.openTodayShortcut'),
      settingsStore.getItem('sync.lastCompletedAt'),
    ]).then(([folder, shortcut, completedAt]) => {
      setFolderSync(folder !== 'false');
      setTodayShortcut(shortcut !== 'false');
      setLastSync(completedAt);
    });
  }, [db, repos.spaces, settingsStore]);

  const updateSettings = (next: AppSettings) => void setSettings(next);
  const updateGeneral = (patch: Partial<AppSettings['general']>) =>
    updateSettings({ ...settings, general: { ...settings.general, ...patch } });
  const updateEditor = (patch: Partial<AppSettings['editor']>) =>
    updateSettings({ ...settings, editor: { ...settings.editor, ...patch } });

  const runAction = async (action: () => Promise<void>, success: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      showToast(success, { tone: 'success' });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not complete action', {
        durationMs: 5000,
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const todayText = () => formatTodayPage(repos, ui.selectedDate);

  const importBackup = async () => {
    const raw = await pickBackupFile();
    if (!raw) return;
    const backup = parseBackup(raw);

    Alert.alert(
      'Replace local data?',
      'This imports the backup and replaces the current local Agenda data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: () =>
            void runAction(async () => {
              await restoreBackup(db, backup);
              await setSettings(backup.settings);
              refresh();
              await reloadDiagnostic();
            }, 'Backup imported'),
        },
      ],
    );
  };

  const syncNow = async () => {
    const [notes, items] = await Promise.all([
      db.getAll<DailyNote>('daily_notes'),
      db.getAll<AgendaItem>('agenda_items'),
    ]);

    let latestUpdatedAt: string | null = null;
    for (const item of items) {
      if (!latestUpdatedAt || item.updatedAt > latestUpdatedAt) latestUpdatedAt = item.updatedAt;
    }
    for (const note of notes) {
      if (!latestUpdatedAt || note.updatedAt > latestUpdatedAt) latestUpdatedAt = note.updatedAt;
    }

    // Metadata only — never duplicate note bodies / task titles into the KV store.
    const index = {
      generatedAt: new Date().toISOString(),
      noteCount: folderSync ? notes.length : 0,
      itemCount: items.length,
      latestUpdatedAt,
    };
    const completedAt = new Date().toISOString();
    await settingsStore.setItem('sync.localIndex', JSON.stringify(index));
    await settingsStore.setItem('sync.lastCompletedAt', completedAt);
    setLastSync(completedAt);
  };

  const cleanDrawings = () => {
    Alert.alert(
      'Clean drawing cache?',
      'This deletes saved drawings but keeps agenda data and text notes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean',
          style: 'destructive',
          onPress: () =>
            void runAction(async () => {
              const drawings = await db.getAll<Drawing>('drawings');
              for (const drawing of drawings) await repos.notes.deleteDrawing(drawing.id);
              refresh();
              await reloadDiagnostic();
            }, 'Drawing cache cleaned'),
        },
      ],
    );
  };

  if (Platform.OS === 'ios' && categoryOnly && tab === 'general') {
    return <IOSGeneralSettingsForm general={settings.general} onChange={updateGeneral} />;
  }

  if (Platform.OS === 'ios' && categoryOnly && tab === 'editor') {
    const editor = settings.editor;
    return (
      <Host
        colorScheme={colorScheme}
        seedColor={nativeSeedColor}
        style={{ flex: 1 }}
        useViewportSizeMeasurement
      >
        <FieldGroup>
          <FieldGroup.Section title="Today’s Page">
            <NativePickerRow
              label="Font"
              value={editor.font}
              options={[{ label: 'System', value: 'system' }]}
              onValueChange={(font) => updateEditor({ font })}
            />
            <NativePickerRow
              label="Font Size"
              value={editor.fontSize}
              options={[12, 14, 16, 18, 20, 22, 24, 26, 28].map((value) => ({
                label: `${value} pt`,
                value,
              }))}
              onValueChange={(fontSize) => updateEditor({ fontSize })}
            />
            <NativePickerRow
              label="Page Margin"
              value={editor.pageMargin}
              options={[8, 12, 16, 20, 24, 32, 40, 48].map((value) => ({
                label: `${value} pt`,
                value,
              }))}
              onValueChange={(pageMargin) => updateEditor({ pageMargin })}
            />
          </FieldGroup.Section>
          <FieldGroup.Section title="New Items">
            <NativePickerRow
              label="Default Type"
              value={editor.defaultAddType}
              options={[
                { label: 'Task', value: 'task' },
                { label: 'Event', value: 'event' },
                { label: 'Note', value: 'note' },
              ]}
              onValueChange={(defaultAddType) => updateEditor({ defaultAddType })}
            />
            <NativePickerRow
              label="Event Duration"
              value={editor.defaultEventDurationMinutes}
              options={[15, 30, 45, 60, 90].map((value) => ({ label: `${value} min`, value }))}
              onValueChange={(defaultEventDurationMinutes) =>
                updateEditor({ defaultEventDurationMinutes })
              }
            />
            <NativePickerRow
              label="Default Space"
              value={editor.defaultSpaceId ?? '__inbox__'}
              options={[
                { label: 'Inbox', value: '__inbox__' },
                ...spaces.map((space) => ({ label: space.name, value: space.id })),
              ]}
              onValueChange={(defaultSpaceId) =>
                updateEditor({
                  defaultSpaceId: defaultSpaceId === '__inbox__' ? null : defaultSpaceId,
                })
              }
            />
            <NativeSettingsSwitch
              label="Smart Parsing"
              value={editor.smartParsingEnabled}
              onValueChange={(smartParsingEnabled) => updateEditor({ smartParsingEnabled })}
            />
            <NativeSettingsSwitch
              label="Continue Numbered Lists"
              value={editor.continueNumberedLists}
              onValueChange={(continueNumberedLists) => updateEditor({ continueNumberedLists })}
            />
          </FieldGroup.Section>
          <FieldGroup.Section title="Markdown">
            <NativeSettingsSwitch
              label="Render Markdown"
              value={editor.renderMarkdown}
              onValueChange={(renderMarkdown) => updateEditor({ renderMarkdown })}
            />
          </FieldGroup.Section>
          <FieldGroup.Section>
            <NativeActionRow
              label="Restore Defaults"
              onPress={() => {
                updateEditor(DEFAULT_SETTINGS.editor);
                showToast('Editor defaults restored', { tone: 'success' });
              }}
            />
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    );
  }

  if (Platform.OS === 'ios' && categoryOnly && tab === 'export') {
    return (
      <Host
        colorScheme={colorScheme}
        seedColor={nativeSeedColor}
        style={{ flex: 1 }}
        useViewportSizeMeasurement
      >
        <FieldGroup>
          <FieldGroup.Section title="Today’s Page">
            <NativeActionRow
              label="Copy as Text"
              detail="Daily note and visible agenda items"
              onPress={() =>
                void runAction(async () => copyText(await todayText()), 'Today’s page copied')
              }
            />
            <NativeActionRow
              label="Share"
              detail="Open the system share sheet"
              onPress={() =>
                void runAction(
                  async () => void (await Share.share({ message: await todayText() })),
                  'Share sheet opened',
                )
              }
            />
            <NativeActionRow
              label="Print or Save as PDF"
              detail="Open the system print dialog"
              onPress={() =>
                void runAction(
                  async () => printPage(pageTextToHtml(await todayText())),
                  'Print dialog opened',
                )
              }
            />
          </FieldGroup.Section>
          <FieldGroup.Section title="Backup">
            <FieldGroup.SectionFooter>
              <NativeText>Backups contain your tasks, notes, drawings, and settings.</NativeText>
            </FieldGroup.SectionFooter>
            <NativeActionRow
              label="Export Backup"
              detail="Save all Agenda data as JSON"
              onPress={() =>
                void runAction(
                  async () =>
                    saveBackupFile(JSON.stringify(await createBackup(db, settings), null, 2)),
                  'Backup ready to save',
                )
              }
            />
            <NativeActionRow
              label="Copy Backup"
              detail="Copy all Agenda data as JSON"
              onPress={() =>
                void runAction(
                  async () => copyText(JSON.stringify(await createBackup(db, settings), null, 2)),
                  'Backup JSON copied',
                )
              }
            />
            <NativeActionRow
              label="Import Backup"
              detail="Replace local data from a JSON backup"
              onPress={() => void importBackup()}
            />
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    );
  }

  if (Platform.OS === 'ios' && categoryOnly && tab === 'sync') {
    return (
      <Host
        colorScheme={colorScheme}
        seedColor={nativeSeedColor}
        style={{ flex: 1 }}
        useViewportSizeMeasurement
      >
        <FieldGroup>
          <FieldGroup.Section title="Local Sync">
            <NativeListItem supportingText="Search and Daily Notes use a local index">
              <NativeText>On This Device</NativeText>
            </NativeListItem>
            <NativeListItem
              supportingText={lastSync ? new Date(lastSync).toLocaleString() : 'Not yet synced'}
            >
              <NativeText>Last Updated</NativeText>
            </NativeListItem>
          </FieldGroup.Section>
          <FieldGroup.Section title="Options">
            <NativeSettingsSwitch
              label="Index Daily Notes"
              value={folderSync}
              onValueChange={(value) => {
                setFolderSync(value);
                void settingsStore.setItem('sync.dailyNotesFolder', String(value));
              }}
            />
            <NativeSettingsSwitch
              label="Open Today Shortcut"
              value={todayShortcut}
              onValueChange={(value) => {
                setTodayShortcut(value);
                void settingsStore.setItem('sync.openTodayShortcut', String(value));
              }}
            />
          </FieldGroup.Section>
          <FieldGroup.Section title="Maintenance">
            <NativeActionRow
              label="Update Now"
              onPress={() => void runAction(syncNow, 'Local indexes refreshed')}
            />
            <NativeActionRow
              label="Reset Local Index"
              onPress={() =>
                void runAction(async () => {
                  await settingsStore.removeItem('sync.localIndex');
                  await settingsStore.removeItem('sync.lastCompletedAt');
                  setLastSync(null);
                }, 'Local sync cache reset')
              }
            />
            <NativeActionRow label="Clear Drawing Cache" onPress={cleanDrawings} />
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    );
  }

  if (Platform.OS === 'ios' && categoryOnly && tab === 'privacy') {
    return <PrivacySettings />;
  }

  const content =
    tab === 'privacy' ? (
      <PrivacySettings />
    ) : tab === 'general' ? (
      <GeneralSettings
        accent={accent}
        colorScheme={colorScheme}
        settings={settings}
        onGeneral={updateGeneral}
      />
    ) : tab === 'editor' ? (
      <EditorSettings
        accent={accent}
        settings={settings}
        spaces={spaces}
        onEditor={updateEditor}
        onReset={() => {
          updateEditor(DEFAULT_SETTINGS.editor);
          showToast('Editor defaults restored', { tone: 'success' });
        }}
      />
    ) : tab === 'export' ? (
      <ExportSettings
        busy={busy}
        onCopy={() =>
          void runAction(async () => copyText(await todayText()), 'Today’s page copied')
        }
        onShare={() =>
          void runAction(
            async () => void (await Share.share({ message: await todayText() })),
            'Share sheet opened',
          )
        }
        onPrint={() =>
          void runAction(
            async () => printPage(pageTextToHtml(await todayText())),
            'Print dialog opened',
          )
        }
        onDownload={() =>
          void runAction(
            async () => saveBackupFile(JSON.stringify(await createBackup(db, settings), null, 2)),
            'Backup ready to save',
          )
        }
        onCopyJson={() =>
          void runAction(
            async () => copyText(JSON.stringify(await createBackup(db, settings), null, 2)),
            'Backup JSON copied',
          )
        }
        onImport={() => void importBackup()}
      />
    ) : (
      <SyncSettings
        accent={accent}
        activeFilter={
          ui.activeSpaceId
            ? (spaces.find((space) => space.id === ui.activeSpaceId)?.name ?? 'unknown')
            : 'all'
        }
        diagnostic={diagnostic}
        folderSync={folderSync}
        lastSync={lastSync}
        todayShortcut={todayShortcut}
        onFolderSync={(value) => {
          setFolderSync(value);
          void settingsStore.setItem('sync.dailyNotesFolder', String(value));
        }}
        onTodayShortcut={(value) => {
          setTodayShortcut(value);
          void settingsStore.setItem('sync.openTodayShortcut', String(value));
        }}
        onSync={() => void runAction(syncNow, 'Local indexes refreshed')}
        onReset={() =>
          void runAction(async () => {
            await settingsStore.removeItem('sync.localIndex');
            await settingsStore.removeItem('sync.lastCompletedAt');
            setLastSync(null);
          }, 'Local sync cache reset')
        }
        onCleanDrawings={cleanDrawings}
      />
    );

  return (
    <SettingsScaffold
      header={categoryOnly && Platform.OS === 'android' ? null : undefined}
      title={
        categoryOnly ? (TABS.find((item) => item.value === tab)?.label ?? 'Settings') : 'Settings'
      }
      showDone={Platform.OS !== 'ios'}
      blurTargetRef={blurTarget}
      bottomInset={insets.bottom + (categoryOnly || Platform.OS === 'ios' ? 32 : 110)}
      footer={
        !categoryOnly && Platform.OS !== 'ios' ? (
          <SettingsTabBar tabs={TABS} value={tab} onChange={setTab} blurTarget={blurTarget} />
        ) : undefined
      }
    >
      {content}
    </SettingsScaffold>
  );
}

function NativeActionRow({
  detail,
  label,
  onPress,
}: {
  detail?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <NativeListItem onPress={onPress} supportingText={detail}>
      <NativeText>{label}</NativeText>
    </NativeListItem>
  );
}

function NativePickerRow<T extends string | number>({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string;
  onValueChange: (value: T) => void;
  options: { label: string; value: T }[];
  value: T;
}) {
  return (
    <NativeListItem
      trailing={
        <Picker selectedValue={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <Picker.Item key={String(option.value)} label={option.label} value={option.value} />
          ))}
        </Picker>
      }
    >
      <NativeText>{label}</NativeText>
    </NativeListItem>
  );
}

function GeneralSettings({
  accent,
  colorScheme,
  onGeneral,
  settings,
}: {
  accent: string;
  colorScheme: 'light' | 'dark';
  onGeneral: (patch: Partial<AppSettings['general']>) => void;
  settings: AppSettings;
}) {
  const general = settings.general;
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.sections}>
      <SettingsSection title="Date & calendar">
        <SettingPicker
          title="Date format"
          subtitle="Choose the date style used on Today."
          value={general.dateFormat}
          options={[
            { label: 'Long', value: 'long' },
            { label: 'Short', value: 'short' },
          ]}
          onValueChange={(dateFormat) => onGeneral({ dateFormat })}
        />
        <SettingPicker
          last
          title="Week starts on"
          subtitle="First day shown in calendars."
          value={general.weekStartsOn}
          options={[
            { label: 'Monday', value: 'monday' },
            { label: 'Sunday', value: 'sunday' },
          ]}
          onValueChange={(weekStartsOn) => onGeneral({ weekStartsOn })}
        />
      </SettingsSection>

      <SettingsSection title="Appearance">
        <SettingPicker
          title="Appearance"
          subtitle="Use the system setting, Light, or Dark."
          value={general.mode}
          options={[
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
          onValueChange={(mode) => onGeneral({ mode })}
        />
        <View style={styles.accentBlock}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Accent color</Text>
            <Text style={styles.rowSubtitle}>Used for controls and selected items.</Text>
          </View>
          <Text style={styles.rowValue}>{titleCase(general.accent)}</Text>
        </View>
        <View style={styles.swatchGrid}>
          {ACCENTS.map((item) => {
            const selected = item === general.accent;
            const swatchColor = getAccentColor(item, colorScheme);
            return (
              <Pressable
                accessibilityLabel={`${titleCase(item)} accent`}
                accessibilityState={{ selected }}
                key={item}
                onPress={() => onGeneral({ accent: item })}
                style={[
                  styles.swatchCell,
                  selected && { borderColor: accent, backgroundColor: `${accent}18` },
                ]}
              >
                <View style={[styles.swatch, { backgroundColor: swatchColor }]} />
              </Pressable>
            );
          })}
        </View>
        <SettingToggle
          title="Show Completed section"
          subtitle="Move finished tasks into a separate section."
          value={general.showCompleted}
          onValueChange={(showCompleted) => onGeneral({ showCompleted })}
        />
        <SettingToggle
          title="Compact day list"
          subtitle="Use tighter rows on Today."
          value={general.compactStream}
          onValueChange={(compactStream) => onGeneral({ compactStream })}
        />
        <SettingToggle
          title="Keep Space filter"
          subtitle="Keep the selected Space when changing days."
          value={general.keepFilterWhileChangingDays}
          onValueChange={(keepFilterWhileChangingDays) =>
            onGeneral({ keepFilterWhileChangingDays })
          }
        />
        <SettingToggle
          title="Pull down to quick add"
          subtitle="Pull down on Today to create an item."
          value={general.pullDownToAdd}
          onValueChange={(pullDownToAdd) =>
            onGeneral({
              pullDownToAdd,
              ...(pullDownToAdd ? { pullDownToSearch: false } : {}),
            })
          }
        />
        <SettingToggle
          title="Pull down to search"
          subtitle="Pull down on Today to search."
          value={general.pullDownToSearch}
          onValueChange={(pullDownToSearch) =>
            onGeneral({
              pullDownToSearch,
              ...(pullDownToSearch ? { pullDownToAdd: false } : {}),
            })
          }
        />
        <SettingToggle
          title="Swipe to change day"
          subtitle="Swipe left or right on Today."
          value={general.swipeToChangeDay}
          onValueChange={(swipeToChangeDay) => onGeneral({ swipeToChangeDay })}
        />
        <SettingToggle
          title="Calendar dots"
          subtitle="Mark dates that contain items or a daily note."
          value={general.calendarIndicators}
          onValueChange={(calendarIndicators) => onGeneral({ calendarIndicators })}
        />
        <SettingToggle
          last
          title="Tap to edit"
          subtitle="Tap an item to edit it instead of completing it."
          value={general.clickToEdit}
          onValueChange={(clickToEdit) => onGeneral({ clickToEdit })}
        />
      </SettingsSection>

      <SettingsSection title="Drawing">
        <SettingToggle
          last
          title="Pen-only drawing"
          subtitle={
            Platform.OS === 'ios'
              ? 'Draw with Apple Pencil while fingers scroll.'
              : 'Draw with a stylus while fingers scroll.'
          }
          value={general.penOnlyDrawing}
          onValueChange={(penOnlyDrawing) => onGeneral({ penOnlyDrawing })}
        />
      </SettingsSection>
    </View>
  );
}

function EditorSettings({
  accent,
  onEditor,
  onReset,
  settings,
  spaces,
}: {
  accent: string;
  onEditor: (patch: Partial<AppSettings['editor']>) => void;
  onReset: () => void;
  settings: AppSettings;
  spaces: Space[];
}) {
  const editor = settings.editor;
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const selectedSpace = editor.defaultSpaceId ?? '__inbox__';
  return (
    <View style={styles.sections}>
      <SettingsSection title="Today’s page">
        <SettingPicker
          title="Font"
          subtitle="Typeface used in the daily note."
          value={editor.font}
          options={[{ label: 'System', value: 'system' }]}
          onValueChange={(font) => onEditor({ font })}
        />
        <StepperRow
          title="Font size"
          value={`${editor.fontSize}pt`}
          onDecrease={() => onEditor({ fontSize: Math.max(12, editor.fontSize - 1) })}
          onIncrease={() => onEditor({ fontSize: Math.min(28, editor.fontSize + 1) })}
        />
        <StepperRow
          last
          title="Page margin"
          value={`${editor.pageMargin}pt`}
          onDecrease={() => onEditor({ pageMargin: Math.max(8, editor.pageMargin - 2) })}
          onIncrease={() => onEditor({ pageMargin: Math.min(48, editor.pageMargin + 2) })}
        />
      </SettingsSection>

      <SettingsSection title="Adding items">
        <SettingPicker
          title="Default item type"
          subtitle="Item type selected in Quick Add."
          value={editor.defaultAddType}
          options={
            [
              { label: 'Task', value: 'task' },
              { label: 'Event', value: 'event' },
              { label: 'Note', value: 'note' },
            ] satisfies { label: string; value: ItemType }[]
          }
          onValueChange={(defaultAddType) => onEditor({ defaultAddType })}
        />
        <SettingPicker
          title="Default event length"
          subtitle="Initial duration for new events."
          value={editor.defaultEventDurationMinutes}
          options={[15, 30, 45, 60, 90].map((value) => ({ label: `${value} min`, value }))}
          onValueChange={(defaultEventDurationMinutes) => onEditor({ defaultEventDurationMinutes })}
        />
        <SettingPicker
          title="Default Space"
          subtitle="Where new items are saved."
          value={selectedSpace}
          options={[
            { label: 'Inbox', value: '__inbox__' },
            ...spaces.map((space) => ({ label: space.name, value: space.id })),
          ]}
          onValueChange={(defaultSpaceId) =>
            onEditor({ defaultSpaceId: defaultSpaceId === '__inbox__' ? null : defaultSpaceId })
          }
        />
        <SettingToggle
          title="Smart parsing"
          subtitle="Recognize dates, times, Spaces, and priority as you type."
          value={editor.smartParsingEnabled}
          onValueChange={(smartParsingEnabled) => onEditor({ smartParsingEnabled })}
        />
        <SettingToggle
          last
          title="Continue numbered lists"
          subtitle="Start the next number when you press Return."
          value={editor.continueNumberedLists}
          onValueChange={(continueNumberedLists) => onEditor({ continueNumberedLists })}
        />
      </SettingsSection>

      <SettingsSection title="Markdown">
        <SettingToggle
          last
          title="Render markdown"
          subtitle="Headings, lists, bold, italic, checklists, and links as you type."
          value={editor.renderMarkdown}
          onValueChange={(renderMarkdown) => onEditor({ renderMarkdown })}
        />
      </SettingsSection>

      <Pressable
        onPress={onReset}
        style={({ pressed }) => [styles.standaloneAction, pressed && styles.pressed]}
      >
        <Text style={[styles.actionText, { color: accent }]}>Restore editor defaults</Text>
      </Pressable>
    </View>
  );
}

function ExportSettings({
  busy,
  onCopy,
  onCopyJson,
  onDownload,
  onImport,
  onPrint,
  onShare,
}: {
  busy: boolean;
  onCopy: () => void;
  onCopyJson: () => void;
  onDownload: () => void;
  onImport: () => void;
  onPrint: () => void;
  onShare: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.sections} pointerEvents={busy ? 'none' : 'auto'}>
      <SettingsSection title="Today’s page">
        <SettingRow
          title="Copy as text"
          subtitle="Daily note and visible agenda items."
          onPress={onCopy}
        />
        <SettingRow
          title="Share page"
          subtitle="Uses the native share sheet when available."
          onPress={onShare}
        />
        <SettingRow
          last
          title="Print / Save PDF"
          subtitle="Uses the system print dialog."
          onPress={onPrint}
        />
      </SettingsSection>
      <SettingsSection title="Backup">
        <View style={styles.backupWarning}>
          <Text style={styles.backupWarningTitle}>Keep backups private</Text>
          <Text style={styles.backupWarningBody}>
            Agenda backups contain your tasks, notes, and other personal data in readable form.
            Temporary share files are deleted after export.
          </Text>
        </View>
        <SettingRow
          title="Download all data"
          subtitle="Tasks, folders, notes, routines, drawings, and settings."
          onPress={onDownload}
        />
        <SettingRow
          title="Copy JSON"
          subtitle="Copies a complete local backup."
          onPress={onCopyJson}
        />
        <SettingRow
          last
          title="Import JSON backup"
          subtitle="Replaces local data after confirmation. Device notification and calendar IDs are cleared."
          onPress={onImport}
        />
      </SettingsSection>
    </View>
  );
}

function SyncSettings({
  accent,
  activeFilter,
  diagnostic,
  folderSync,
  lastSync,
  onCleanDrawings,
  onFolderSync,
  onReset,
  onSync,
  onTodayShortcut,
  todayShortcut,
}: {
  accent: string;
  activeFilter: string;
  diagnostic: Diagnostic | null;
  folderSync: boolean;
  lastSync: string | null;
  onCleanDrawings: () => void;
  onFolderSync: (value: boolean) => void;
  onReset: () => void;
  onSync: () => void;
  onTodayShortcut: (value: boolean) => void;
  todayShortcut: boolean;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.sections}>
      <SettingsSection title="Status">
        <View style={[styles.statusCard, styles.lastRow]}>
          <Text style={styles.rowTitle}>Local sync is enabled</Text>
          <Text style={styles.rowSubtitle}>
            Daily notes are indexed for search and the Daily Notes view.
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { backgroundColor: accent }]} />
          </View>
          <Text style={styles.statusMeta}>
            Last sync: {lastSync ? new Date(lastSync).toLocaleString() : 'Not yet synced'}
          </Text>
        </View>
      </SettingsSection>

      <SettingsSection title="Sync">
        <SettingToggle
          title="Daily Notes folder sync"
          subtitle="Mirrors dated text into the searchable local index."
          value={folderSync}
          onValueChange={onFolderSync}
        />
        <SettingToggle
          last
          title="Open Today shortcut"
          subtitle="Enables today deep-link recovery."
          value={todayShortcut}
          onValueChange={onTodayShortcut}
        />
      </SettingsSection>

      <SettingsSection>
        <SettingRow
          title="Sync now"
          subtitle="Refreshes local indexes and timestamps."
          titleColor={accent}
          onPress={onSync}
        />
        <SettingRow
          title="Reset local sync cache"
          subtitle="Does not delete your agenda data."
          onPress={onReset}
        />
        <SettingRow
          last
          title="Clean drawing cache"
          subtitle="Deletes saved drawings only."
          onPress={onCleanDrawings}
        />
      </SettingsSection>

      <SettingsSection title="Diagnostic">
        <View style={[styles.diagnostic, styles.lastRow]}>
          <Text style={styles.diagnosticText}>
            {diagnostic
              ? `items: ${diagnostic.items}\nspaces: ${diagnostic.spaces}\nroutines: ${diagnostic.routines}\nnotes: ${diagnostic.notes}\ndrawings: ${diagnostic.drawings}\nfilter: ${activeFilter}\nstorage: local database\napprox bytes: ${diagnostic.bytes}`
              : 'Loading diagnostics…'}
          </Text>
        </View>
      </SettingsSection>
    </View>
  );
}

function SettingRow({
  last,
  onPress,
  subtitle,
  title,
  titleColor,
  value,
  valueColor,
}: {
  last?: boolean;
  onPress?: () => void;
  subtitle?: string;
  title: string;
  titleColor?: string;
  value?: string;
  valueColor?: string;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const body = (
    <>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, titleColor ? { color: titleColor } : null]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {value ? (
        <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      ) : null}
      {onPress ? <Icon name="chevronRight" size={17} color={theme.textSecondary} /> : null}
    </>
  );
  if (!onPress) return <View style={[styles.settingRow, last && styles.lastRow]}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        last && styles.lastRow,
        pressed && styles.pressed,
      ]}
    >
      {body}
    </Pressable>
  );
}

function SettingToggle({
  last,
  onValueChange,
  subtitle,
  title,
  value,
}: {
  last?: boolean;
  onValueChange: (value: boolean) => void;
  subtitle?: string;
  title: string;
  value: boolean;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.settingRow, styles.toggleRow, last && styles.lastRow]}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.trailingControl}>
        <NativeSwitch onValueChange={onValueChange} value={value} />
      </View>
    </View>
  );
}

function StepperRow({
  last,
  onDecrease,
  onIncrease,
  title,
  value,
}: {
  last?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  title: string;
  value: string;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.settingRow, last && styles.lastRow]}>
      <Text style={[styles.rowTitle, styles.stepperTitle]}>{title}</Text>
      <View style={styles.stepperTrailing}>
        <Text style={styles.stepperValue}>{value}</Text>
        <View style={styles.stepper}>
          <Pressable
            accessibilityLabel={`Decrease ${title}`}
            onPress={onDecrease}
            style={styles.stepperButton}
          >
            <Icon name="minus" size={18} color={theme.text} />
          </Pressable>
          <View style={styles.stepperDivider} />
          <Pressable
            accessibilityLabel={`Increase ${title}`}
            onPress={onIncrease}
            style={styles.stepperButton}
          >
            <Icon name="add" size={18} color={theme.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function copyText(value: string): Promise<void> {
  try {
    const clipboard = await import('expo-clipboard');
    await clipboard.setStringAsync(value);
  } catch {
    await Share.share({ message: value });
  }
}

function createStyles(theme: AgendaTheme) {
  const iosSection =
    Platform.OS === 'ios' ? PlatformColor('secondarySystemGroupedBackground') : null;
  const iosText = Platform.OS === 'ios' ? PlatformColor('label') : null;
  const iosSecondaryText = Platform.OS === 'ios' ? PlatformColor('secondaryLabel') : null;
  return StyleSheet.create({
    sections: { gap: 16 },
    backupWarning: {
      gap: 6,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    backupWarningTitle: {
      color: theme.text,
      fontFamily: fonts.sansSemi,
      fontWeight: '600',
      fontSize: 15,
    },
    backupWarningBody: {
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 12.5,
      lineHeight: 17,
    },
    settingRow: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingLeft: 16,
      paddingRight: Platform.OS === 'ios' ? 6 : 8,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    toggleRow: { paddingRight: 16 },
    lastRow: { borderBottomWidth: 0 },
    rowCopy: { flex: 1, minWidth: 0, gap: 3 },
    rowTitle: {
      color: iosText ?? theme.text,
      fontFamily: Platform.OS === 'ios' ? undefined : fonts.sansMedium,
      fontSize: 16,
    },
    rowSubtitle: {
      color: iosSecondaryText ?? theme.textSecondary,
      fontFamily: Platform.OS === 'ios' ? undefined : fonts.sans,
      fontSize: 13,
      lineHeight: 18,
    },
    rowValue: { color: theme.text, fontFamily: fonts.sans, fontSize: 15 },
    trailingControl: {
      flexShrink: 0,
      marginLeft: 'auto',
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    accentBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginHorizontal: 16,
      paddingTop: 14,
    },
    swatchGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    swatchCell: {
      width: '23.7%',
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: theme.card,
      ...continuousCorner(12),
    },
    swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#FFFFFF' },
    stepperTitle: { flex: 1 },
    stepperTrailing: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepperValue: {
      width: 42,
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 14,
      textAlign: 'right',
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
      backgroundColor: theme.input,
      ...continuousCorner(14),
    },
    stepperButton: { width: 42, height: 34, alignItems: 'center', justifyContent: 'center' },
    stepperDivider: {
      width: StyleSheet.hairlineWidth,
      height: 24,
      backgroundColor: theme.separator,
    },
    standaloneAction: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 16,
      backgroundColor: iosSection ?? theme.section,
      ...continuousCorner(16),
    },
    actionText: { fontFamily: fonts.sansMedium, fontWeight: '500', fontSize: 15 },
    pressed: { opacity: 0.62 },
    statusCard: { gap: 7, marginHorizontal: 16, paddingVertical: 16 },
    progressTrack: {
      height: 7,
      overflow: 'hidden',
      backgroundColor: theme.separator,
      borderRadius: 4,
    },
    progressFill: { width: '100%', height: '100%', borderRadius: 4 },
    statusMeta: {
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 12,
    },
    diagnostic: { marginHorizontal: 16, paddingVertical: 16 },
    diagnosticText: {
      color: theme.textSecondary,
      fontFamily: 'monospace',
      fontSize: 14,
      lineHeight: 20,
    },
  });
}
