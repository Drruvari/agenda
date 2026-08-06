import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
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

export function SettingsScreen() {
  const { db, refresh, repos, setSettings, settings, settingsStore, ui } = useData();
  const insets = useSafeAreaInsets();
  const blurTarget = useRef<View | null>(null);
  const [tab, setTab] = useState<SettingsTab>('general');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [busy, setBusy] = useState(false);
  const [folderSync, setFolderSync] = useState(true);
  const [todayShortcut, setTodayShortcut] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);

  const { accent, colorScheme } = useAppAppearance();
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

  const content =
    tab === 'privacy' ? (
      <PrivacySettings />
    ) : tab === 'general' ? (
      <GeneralSettings
        accent={accent}
        colorScheme={colorScheme}
        settings={settings}
        spaces={spaces}
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
      title="Settings"
      showDone
      blurTargetRef={blurTarget}
      bottomInset={insets.bottom + 110}
      footer={<SettingsTabBar tabs={TABS} value={tab} onChange={setTab} blurTarget={blurTarget} />}
    >
      {content}
    </SettingsScaffold>
  );
}

function GeneralSettings({
  accent,
  colorScheme,
  onGeneral,
  settings,
  spaces,
}: {
  accent: string;
  colorScheme: 'light' | 'dark';
  onGeneral: (patch: Partial<AppSettings['general']>) => void;
  settings: AppSettings;
  spaces: Space[];
}) {
  const general = settings.general;
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.sections}>
      <SettingsSection title="Date & calendar">
        <SettingPicker
          title="Date format"
          subtitle="How the big date heading looks on Today (e.g. Thursday, 6 August vs Thu 6 Aug)."
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
          subtitle="First day shown in the calendar picker."
          value={general.weekStartsOn}
          options={[
            { label: 'Monday', value: 'monday' },
            { label: 'Sunday', value: 'sunday' },
          ]}
          onValueChange={(weekStartsOn) => onGeneral({ weekStartsOn })}
        />
      </SettingsSection>

      <SettingsSection title="Look & feel">
        <SettingPicker
          title="Appearance"
          subtitle="Follow the system, or lock Agenda to light or dark."
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
            <Text style={styles.rowSubtitle}>
              Used for buttons, checkmarks, and highlights throughout the app.
            </Text>
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
          accent={accent}
          title="Show Spaces"
          subtitle="Show Space chips above your day so you can filter Work, Personal, and other contexts."
          value={general.showSpaces}
          onValueChange={(showSpaces) => onGeneral({ showSpaces })}
        />
        <SettingToggle
          accent={accent}
          title="Separate completed section"
          subtitle="On: finished tasks move into a Completed section. Off: they stay checked in All day and Scheduled."
          value={general.showCompleted}
          onValueChange={(showCompleted) => onGeneral({ showCompleted })}
        />
        <SettingToggle
          accent={accent}
          title="Compact day list"
          subtitle="Use tighter rows when you have a busy day with lots of items."
          value={general.compactStream}
          onValueChange={(compactStream) => onGeneral({ compactStream })}
        />
        <SettingToggle
          accent={accent}
          title="Keep Space filter when changing days"
          subtitle="On: the Space you selected stays as you swipe days. Off: each day resets to All."
          value={general.keepFilterWhileChangingDays}
          onValueChange={(keepFilterWhileChangingDays) =>
            onGeneral({ keepFilterWhileChangingDays })
          }
        />
        <SettingToggle
          accent={accent}
          title="Calendar dots"
          subtitle="Show a small indicator on the calendar icon when the day has tasks or a daily note."
          value={general.calendarIndicators}
          onValueChange={(calendarIndicators) => onGeneral({ calendarIndicators })}
        />
        <SettingToggle
          accent={accent}
          last
          title="Tap to edit"
          subtitle="On: tap a task to edit it; use the circle to complete. Off: tap completes; press and hold to edit."
          value={general.clickToEdit}
          onValueChange={(clickToEdit) => onGeneral({ clickToEdit })}
        />
      </SettingsSection>

      <SettingsSection title="Organize">
        <SettingRow
          title="Spaces"
          subtitle={`${spaces.length} contexts for filtering your day (Work, Personal, …).`}
          onPress={() => router.push('/settings/spaces')}
        />
        <SettingRow
          title="Routines"
          subtitle="Habits you repeat daily — track them separately from one-off tasks."
          onPress={() => router.push('/routines')}
        />
        <SettingRow
          title="Notifications"
          subtitle="Local alerts for timed tasks — asked only when you turn on Remind me."
          onPress={() => router.push('/settings/notifications')}
        />
        <SettingRow
          last
          title="About Agenda"
          subtitle="Your agenda belongs on your phone — local, private, no account."
          onPress={() => router.push('/settings/about')}
        />
      </SettingsSection>

      <SettingsSection title="Drawing">
        <SettingToggle
          accent={accent}
          last
          title="Pen-only drawing"
          subtitle="On supported devices, only Apple Pencil / stylus draws on Today’s page — fingers scroll."
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
          subtitle="Typeface for the daily note on Today’s page."
          value={editor.font}
          options={[
            { label: 'System', value: 'system' },
            { label: 'Switzer', value: 'switzer' },
            { label: 'Zodiak', value: 'zodiak' },
          ]}
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
          subtitle="What Quick add opens with (task, event, or note)."
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
          subtitle="Duration pre-filled when you create a calendar event."
          value={editor.defaultEventDurationMinutes}
          options={[15, 30, 45, 60, 90].map((value) => ({ label: `${value} min`, value }))}
          onValueChange={(defaultEventDurationMinutes) => onEditor({ defaultEventDurationMinutes })}
        />
        <SettingPicker
          title="Default Space"
          subtitle="New tasks and events are filed here unless you pick another Space."
          value={selectedSpace}
          options={[
            { label: 'Inbox (no Space)', value: '__inbox__' },
            ...spaces.map((space) => ({ label: space.name, value: space.id })),
          ]}
          onValueChange={(defaultSpaceId) =>
            onEditor({ defaultSpaceId: defaultSpaceId === '__inbox__' ? null : defaultSpaceId })
          }
        />
        <SettingToggle
          accent={accent}
          title="Smart parsing"
          subtitle="Type shortcuts like “tomorrow 7pm #Work !!” and Agenda fills date, time, Space, and priority."
          value={editor.smartParsingEnabled}
          onValueChange={(smartParsingEnabled) => onEditor({ smartParsingEnabled })}
        />
        <SettingToggle
          accent={accent}
          last
          title="Continue numbered lists"
          subtitle="Pressing return after “1. …” starts the next number automatically on Today’s page."
          value={editor.continueNumberedLists}
          onValueChange={(continueNumberedLists) => onEditor({ continueNumberedLists })}
        />
      </SettingsSection>

      <SettingsSection title="Markdown">
        <SettingToggle
          accent={accent}
          last
          title="Render markdown"
          subtitle="Show bold, lists, and other markdown formatting in the daily note."
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
          accent={accent}
          title="Daily Notes folder sync"
          subtitle="Mirrors dated text into the searchable local index."
          value={folderSync}
          onValueChange={onFolderSync}
        />
        <SettingToggle
          accent={accent}
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
  accent,
  last,
  onValueChange,
  subtitle,
  title,
  value,
}: {
  accent: string;
  last?: boolean;
  onValueChange: (value: boolean) => void;
  subtitle?: string;
  title: string;
  value: boolean;
}) {
  const { colorScheme } = useAppAppearance();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.settingRow, styles.toggleRow, last && styles.lastRow]}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.trailingControl}>
        <NativeSwitch
          accent={accent}
          colorScheme={colorScheme}
          onValueChange={onValueChange}
          value={value}
        />
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
    rowTitle: { color: theme.text, fontFamily: fonts.sansMedium, fontSize: 16 },
    rowSubtitle: {
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 12.5,
      lineHeight: 17,
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
      backgroundColor: theme.section,
      ...continuousCorner(16),
    },
    actionText: { fontFamily: fonts.sansMedium, fontSize: 15 },
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
