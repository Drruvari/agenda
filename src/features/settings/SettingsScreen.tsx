import { BlurTargetView } from 'expo-blur';
import { router } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlurSurface } from '@/components/ui/BlurSurface';
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
import {
  type AgendaTheme,
  continuousCorner,
  fonts,
  getAccentColor,
  useAppAppearance,
  useAppTheme,
} from '@/theme';

import { SettingPicker } from './SettingPicker';
import {
  createBackup,
  createDiagnostic,
  formatTodayPage,
  pageTextToHtml,
  parseBackup,
  restoreBackup,
} from './settingsData';
import { pickBackupFile, printPage, saveBackupFile } from './settingsFiles';

type SettingsTab = 'general' | 'editor' | 'export' | 'sync';

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
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
    const index = {
      generatedAt: new Date().toISOString(),
      notes: folderSync ? notes.map(({ date, bodyText }) => ({ date, bodyText })) : [],
      agenda: items.map(({ id, date, title, details, type }) => ({
        id,
        date,
        title,
        details,
        type,
      })),
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
    tab === 'general' ? (
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
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <BlurTargetView ref={blurTarget} style={styles.blurTarget}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={styles.roundButton}
          >
            <Icon name="back" size={24} color={theme.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.doneButton, { backgroundColor: `${accent}1A` }]}
          >
            <Text style={[styles.doneLabel, { color: accent }]}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
        >
          {content}
        </ScrollView>
      </BlurTargetView>

      <View
        style={[
          styles.tabBarWrap,
          { bottom: Math.max(insets.bottom + (Platform.OS === 'android' ? 8 : 0), 12) },
        ]}
      >
        <BlurSurface
          blurTarget={blurTarget}
          intensity={85}
          overlayColor={theme.floating}
          tint="systemChromeMaterialDark"
          style={styles.tabBarSurface}
          contentStyle={styles.tabBar}
        >
          {TABS.map((item) => {
            const selected = tab === item.value;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={item.value}
                onPress={() => setTab(item.value)}
                style={[styles.tab, selected && styles.tabActive]}
              >
                <Icon name={item.icon} size={24} color={theme.floatingText} stroke={1.8} />
                <Text style={styles.tabLabel}>{item.label}</Text>
              </Pressable>
            );
          })}
        </BlurSurface>
      </View>
    </SafeAreaView>
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
      <Section title="Date">
        <SettingPicker
          title="Date Format"
          subtitle="Changes the page heading."
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
          value={general.weekStartsOn}
          options={[
            { label: 'Monday', value: 'monday' },
            { label: 'Sunday', value: 'sunday' },
          ]}
          onValueChange={(weekStartsOn) => onGeneral({ weekStartsOn })}
        />
      </Section>

      <Section title="Appearance">
        <SettingPicker
          title="Mode"
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
            <Text style={styles.rowTitle}>Accent</Text>
            <Text style={styles.rowSubtitle}>Applied across controls and indicators.</Text>
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
          subtitle="Optional context filters above the stream."
          value={general.showSpaces}
          onValueChange={(showSpaces) => onGeneral({ showSpaces })}
        />
        <SettingToggle
          accent={accent}
          title="Completed"
          subtitle="Keep completed as a separate section."
          value={general.showCompleted}
          onValueChange={(showCompleted) => onGeneral({ showCompleted })}
        />
        <SettingToggle
          accent={accent}
          title="Compact stream"
          subtitle="Tighter cards when the day is busy."
          value={general.compactStream}
          onValueChange={(compactStream) => onGeneral({ compactStream })}
        />
        <SettingToggle
          accent={accent}
          title="Keep filter while changing days"
          value={general.keepFilterWhileChangingDays}
          onValueChange={(keepFilterWhileChangingDays) =>
            onGeneral({ keepFilterWhileChangingDays })
          }
        />
        <SettingToggle
          accent={accent}
          title="Calendar indicators"
          subtitle="Show dots for agenda items and daily notes."
          value={general.calendarIndicators}
          onValueChange={(calendarIndicators) => onGeneral({ calendarIndicators })}
        />
        <SettingToggle
          accent={accent}
          last
          title="Click to edit"
          subtitle="On: tap opens edit, circle completes. Off: tap completes, hold to edit."
          value={general.clickToEdit}
          onValueChange={(clickToEdit) => onGeneral({ clickToEdit })}
        />
      </Section>

      <Section title="Manage">
        <SettingRow
          title={`${spaces.length} Spaces`}
          subtitle={`${spaces.length} contexts`}
          onPress={() => router.push('/settings/spaces')}
        />
        <SettingRow
          last
          title="Routines"
          subtitle="Reusable packs"
          onPress={() => router.push('/routines')}
        />
      </Section>

      <Section title="Drawing">
        <SettingToggle
          accent={accent}
          last
          title="Pen-only drawing"
          subtitle="When supported, ignore finger/mouse drawing."
          value={general.penOnlyDrawing}
          onValueChange={(penOnlyDrawing) => onGeneral({ penOnlyDrawing })}
        />
      </Section>
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
      <Section title="Page">
        <SettingPicker
          title="Font"
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
      </Section>

      <Section title="Creation">
        <SettingPicker
          title="Default add type"
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
          title="Event duration"
          value={editor.defaultEventDurationMinutes}
          options={[15, 30, 45, 60, 90].map((value) => ({ label: `${value} min`, value }))}
          onValueChange={(defaultEventDurationMinutes) => onEditor({ defaultEventDurationMinutes })}
        />
        <SettingPicker
          title="Default Space"
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
          accent={accent}
          title="Smart parsing"
          subtitle="/event, tomorrow, 7pm, #Work, !!"
          value={editor.smartParsingEnabled}
          onValueChange={(smartParsingEnabled) => onEditor({ smartParsingEnabled })}
        />
        <SettingToggle
          accent={accent}
          last
          title="Continue numbered lists"
          value={editor.continueNumberedLists}
          onValueChange={(continueNumberedLists) => onEditor({ continueNumberedLists })}
        />
      </Section>

      <Section title="Markdown">
        <SettingToggle
          accent={accent}
          last
          title="Render markdown"
          value={editor.renderMarkdown}
          onValueChange={(renderMarkdown) => onEditor({ renderMarkdown })}
        />
      </Section>

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
      <Section title="Today’s page">
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
      </Section>
      <Section title="Backup">
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
          subtitle="Replaces the current local data after confirmation."
          onPress={onImport}
        />
      </Section>
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
      <Section title="Status">
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
      </Section>

      <Section title="Sync">
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
      </Section>

      <Section>
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
      </Section>

      <Section title="Diagnostic">
        <View style={[styles.diagnostic, styles.lastRow]}>
          <Text style={styles.diagnosticText}>
            {diagnostic
              ? `items: ${diagnostic.items}\nspaces: ${diagnostic.spaces}\nroutines: ${diagnostic.routines}\nnotes: ${diagnostic.notes}\ndrawings: ${diagnostic.drawings}\nfilter: ${activeFilter}\nstorage: local database\napprox bytes: ${diagnostic.bytes}`
              : 'Loading diagnostics…'}
          </Text>
        </View>
      </Section>
    </View>
  );
}

function Section({ children, title }: { children: ReactNode; title?: string }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.sectionWrap}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.sectionCard}>{children}</View>
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
    safeArea: { flex: 1, backgroundColor: theme.background },
    blurTarget: { flex: 1 },
    header: {
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingHorizontal: 16,
    },
    roundButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.section,
      borderRadius: 22,
    },
    headerTitle: {
      flex: 1,
      color: theme.text,
      fontFamily: fonts.sansSemi,
      fontSize: 24,
    },
    doneButton: {
      height: 44,
      justifyContent: 'center',
      paddingHorizontal: 18,
      ...continuousCorner(22),
    },
    doneLabel: { fontFamily: fonts.sansMedium, fontSize: 16 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 32 },
    sections: { gap: 16 },
    sectionWrap: { gap: 13 },
    sectionTitle: { color: theme.text, fontFamily: fonts.sansSemi, fontSize: 14 },
    sectionCard: { overflow: 'hidden', backgroundColor: theme.section, ...continuousCorner(16) },
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
    tabBarWrap: { position: 'absolute', left: 16, right: 16 },
    tabBarSurface: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255, 255, 255, 0.16)',
    },
    tabBar: {
      flexDirection: 'row',
      padding: 4,
    },
    tab: {
      flex: 1,
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      borderRadius: 28,
    },
    tabActive: { backgroundColor: 'rgba(0, 0, 0, 0.24)' },
    tabLabel: {
      color: theme.floatingText,
      fontFamily: fonts.sansMedium,
      fontSize: 14,
    },
  });
}
