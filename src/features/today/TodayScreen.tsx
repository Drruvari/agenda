import { BlurTargetView } from 'expo-blur';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { BottomBar } from '@/components/ui/BottomBar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PermissionCard } from '@/components/ui/PermissionCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/ToastProvider';
import {
  addDays,
  formatLongDate,
  INBOX_FILTER_ID,
  isInboxSpaceFilter,
  parseLocalDate,
  toLocalDateString,
  useData,
} from '@/data';
import { completeAgendaTask, uncompleteAgendaTask } from '@/domain/agendaLifecycle';
import { useAppSheets } from '@/features/app-sheets/AppSheetsContext';
import { CalendarPickerModal } from '@/features/calendar/CalendarPickerModal';
import { useItemEditor } from '@/features/item-editor';
import { useLibrary } from '@/features/library';
import { AgendaSections } from '@/features/today/components/AgendaSections';
import { RoutinesSection } from '@/features/today/components/RoutinesSection';
import {
  type TodayAgendaTask as Task,
  type TodayMode as Mode,
  useTodayAgenda,
} from '@/features/today/hooks/useTodayAgenda';
import { useTodayView } from '@/features/today/hooks/useTodayView';
import { TodaysPage } from '@/features/todays-page/TodaysPage';
import { usePlannerGestures } from '@/hooks/usePlannerGestures';
import { triggerHaptic } from '@/lib/haptics';
import {
  completeSystemReminder,
  systemRemindersSupported,
} from '@/native/reminders/systemReminders';
import { type AgendaTheme, fonts, useAppAppearance, useAppTheme } from '@/theme';

type PlannerGestures = ReturnType<typeof usePlannerGestures>;
type AnimatedScrollProps = ComponentProps<typeof Animated.ScrollView>;
type AnimatedViewStyle = ComponentProps<typeof Animated.View>['style'];

function PlannerGestureScroll({
  scrollGesture,
  scrollRef,
  scrollEnabled,
  onScroll,
  onScrollEndDrag,
  contentContainerStyle,
  pullContentStyle,
  pageStyle,
  children,
}: {
  scrollGesture: PlannerGestures['scrollGesture'];
  scrollRef: AnimatedScrollProps['ref'];
  scrollEnabled: boolean;
  onScroll: AnimatedScrollProps['onScroll'];
  onScrollEndDrag: PlannerGestures['onScrollEndDrag'];
  contentContainerStyle: AnimatedScrollProps['contentContainerStyle'];
  pullContentStyle: AnimatedViewStyle;
  pageStyle: AnimatedViewStyle;
  children: ReactNode;
}) {
  const body = (
    <Animated.View style={pullContentStyle} collapsable={false}>
      <Animated.View style={pageStyle}>{children}</Animated.View>
    </Animated.View>
  );

  const scroll = (
    <Animated.ScrollView
      ref={scrollRef}
      style={gestureScrollStyles.scrollView}
      automaticallyAdjustContentInsets={Platform.OS === 'ios'}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : 'never'}
      scrollEventThrottle={16}
      scrollEnabled={scrollEnabled}
      bounces={Platform.OS === 'ios'}
      alwaysBounceVertical={Platform.OS === 'ios'}
      overScrollMode="never"
      nestedScrollEnabled
      onScroll={onScroll}
      onScrollEndDrag={onScrollEndDrag}
      contentContainerStyle={contentContainerStyle}
    >
      {body}
    </Animated.ScrollView>
  );

  return <GestureDetector gesture={scrollGesture}>{scroll}</GestureDetector>;
}
const gestureScrollStyles = StyleSheet.create({
  scrollView: { flex: 1 },
});

function plannerPalette(theme: AgendaTheme) {
  return {
    bg: theme.background,
    text: theme.text,
    surface: theme.section,
    muted: theme.textSecondary,
    placeholder: theme.placeholder,
    divider: theme.separator,
    accent: theme.primary,
    warning: theme.warning,
    danger: theme.danger,
    iconMuted: theme.border,
    checkboxBorder: theme.border,
    onPrimary: theme.onPrimary,
    card: theme.card,
    groupFill: theme.card,
    task: theme.primary,
    event: String(theme.category.blue),
    note: String(theme.category.purple),
    birthday: String(theme.category.pink),
    reminder: String(theme.category.green),
    itemFill: theme.isDark ? '#2C2C2E' : '#F2F2F7',
  };
}

function usePlannerTheme() {
  const theme = useAppTheme();
  return useMemo(() => ({ C: plannerPalette(theme), styles: createStyles(theme) }), [theme]);
}

export function TodayScreen() {
  const { C, styles } = usePlannerTheme();
  const { colorScheme } = useAppAppearance();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const { repos, refresh, settings, settingsStore, ui, setUI } = useData();
  const { showToast } = useToast();
  const {
    session: editorSession,
    openCreate,
    openEdit,
    openQuickAdd: openQuickAddEditor,
  } = useItemEditor();
  const { openCreateSpace, openLibrary } = useLibrary();
  const { openRoutines, openSearch } = useAppSheets();
  const editorOpen = Boolean(editorSession);
  const insets = useSafeAreaInsets();
  const blurTarget = useRef<View | null>(null);
  const {
    calendarAccess,
    calendarPromptDismissed,
    deviceBirthdays,
    deviceEvents,
    dismissCalendarPermission,
    dismissReminderPermission,
    reload,
    reminderAccess,
    reminderPromptDismissed,
    requestCalendarPermission,
    requestReminderPermission,
    systemReminders,
    view,
  } = useTodayView();
  const [calendarPickerOpen, setCalendarPickerOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(100);
  const [drawingActive, setDrawingActive] = useState(false);
  const today = toLocalDateString();
  const derivedMode: Mode =
    ui.selectedDate < today ? 'Recent' : ui.selectedDate > today ? 'Upcoming' : 'Today';
  const [pendingSelection, setPendingSelection] = useState<{
    mode: Mode;
    sourceDate: string;
  } | null>(null);
  const mode =
    pendingSelection?.sourceDate === ui.selectedDate ? pendingSelection.mode : derivedMode;
  const selectedDateRef = useRef(ui.selectedDate);

  useEffect(() => {
    selectedDateRef.current = ui.selectedDate;
  }, [ui.selectedDate]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      settingsStore.getItem('sync.openTodayShortcut'),
      Linking.getInitialURL(),
    ]).then(([enabled, initialUrl]) => {
      if (cancelled || enabled === 'false') return;
      const dateParam = Array.isArray(params.date) ? params.date[0] : params.date;
      if (dateParam === 'today' || initialUrl?.includes('#today')) {
        setUI({ selectedDate: toLocalDateString(), mode: 'today' });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [params.date, setUI, settingsStore]);

  const { activeSpaceLabel, allDay, completed, routines, scheduled } = useTodayAgenda({
    activeSpaceId: ui.activeSpaceId,
    deviceBirthdays,
    deviceEvents,
    mode: derivedMode,
    systemReminders,
    view,
  });
  const filteredEmptyHint = activeSpaceLabel
    ? `Nothing scheduled for ${activeSpaceLabel} today.`
    : null;

  const completeTask = async (task: Task) => {
    if (task.item?.type !== 'task') return;
    try {
      await completeAgendaTask(repos, task.item);
      triggerHaptic('success');
      refresh();
      showToast(`Completed “${task.title}”`, {
        subtitle: 'Task is completed',
        actionLabel: 'Undo',
        onAction: () => {
          if (task.item?.type !== 'task') return;
          void uncompleteAgendaTask(repos, { ...task.item, completed: true })
            .then(refresh)
            .catch(() => undefined);
        },
        tone: 'success',
      });
    } catch (error) {
      triggerHaptic('error');
      showToast(error instanceof Error ? error.message : 'Could not complete task', {
        tone: 'error',
      });
    }
  };

  const uncompleteTask = async (task: Task) => {
    if (task.item?.type !== 'task') return;
    try {
      await uncompleteAgendaTask(repos, task.item);
      triggerHaptic('selection');
      refresh();
    } catch (error) {
      triggerHaptic('error');
      showToast(error instanceof Error ? error.message : 'Could not restore task', {
        tone: 'error',
      });
    }
  };

  const completeNativeReminder = async (task: Task) => {
    if (!task.systemReminderId) return;
    try {
      await completeSystemReminder(task.systemReminderId);
      triggerHaptic('success');
      await reload();
    } catch (error) {
      triggerHaptic('error');
      showToast(error instanceof Error ? error.message : 'Could not complete reminder', {
        tone: 'error',
      });
    }
  };

  const editTask = (task: Task) => {
    if (!task.item) return;
    openEdit(task.item.id);
  };

  const toggleTaskCompletion = (task: Task) => {
    if (task.item?.type === 'task') {
      if (task.completed) void uncompleteTask(task);
      else void completeTask(task);
      return;
    }
    if (task.systemReminderId) void completeNativeReminder(task);
  };

  const swipeComplete = (task: Task) => {
    if (task.completed) return;
    if (task.item?.type === 'task') void completeTask(task);
    else if (task.systemReminderId) void completeNativeReminder(task);
  };

  const interactionFor = (task: Task) => {
    const isAgendaTask = task.item?.type === 'task';
    const canEdit = Boolean(task.item);
    const canToggle = isAgendaTask || Boolean(task.systemReminderId);

    const edit = canEdit ? () => editTask(task) : undefined;
    const onSwipeComplete = canToggle && !task.completed ? () => swipeComplete(task) : undefined;

    // Read-only Apple Calendar rows — still tappable so the user gets feedback.
    if (!canEdit && !canToggle) {
      const explain = () => {
        triggerHaptic('warning');
        showToast('Can’t edit this event in Agenda', {
          subtitle: 'It comes from Apple Calendar',
        });
      };
      return {
        onToggleComplete: undefined as (() => void) | undefined,
        onPress: explain,
        onLongPress: explain,
        onSwipeComplete: undefined as (() => void) | undefined,
      };
    }

    // Events / notes: always tap or long-press to edit (no complete toggle).
    if (canEdit && !canToggle) {
      return {
        onToggleComplete: undefined as (() => void) | undefined,
        onPress: edit,
        onLongPress: edit,
        onSwipeComplete: undefined as (() => void) | undefined,
      };
    }

    if (settings.general.clickToEdit) {
      return {
        onToggleComplete: canToggle ? () => toggleTaskCompletion(task) : undefined,
        onPress: edit ?? (() => toggleTaskCompletion(task)),
        onLongPress: undefined as (() => void) | undefined,
        onSwipeComplete,
      };
    }

    return {
      onToggleComplete: undefined as (() => void) | undefined,
      onPress: () => toggleTaskCompletion(task),
      onLongPress: edit,
      onSwipeComplete,
    };
  };

  const toggleRoutine = async (id: string) => {
    try {
      await repos.routines.toggleCompletion(id, ui.selectedDate);
      triggerHaptic('success');
      refresh();
    } catch (error) {
      triggerHaptic('error');
      showToast(error instanceof Error ? error.message : 'Could not update routine', {
        tone: 'error',
      });
    }
  };

  const chooseDate = useCallback(
    async (date: Date) => {
      const selectedDate = toLocalDateString(date);
      const today = toLocalDateString();
      const nextMode: Mode =
        selectedDate < today ? 'Recent' : selectedDate > today ? 'Upcoming' : 'Today';
      if (selectedDate === selectedDateRef.current) return;

      selectedDateRef.current = selectedDate;
      setPendingSelection({ mode: nextMode, sourceDate: ui.selectedDate });
      const activeSpaceId = settings.general.keepFilterWhileChangingDays ? ui.activeSpaceId : null;

      try {
        const loaded = await reload({
          activeSpaceId,
          includeNative: false,
          selectedDate,
        });
        if (!loaded) return;

        setUI({
          selectedDate,
          mode: nextMode.toLowerCase() as 'recent' | 'today' | 'upcoming',
          ...(settings.general.keepFilterWhileChangingDays ? {} : { activeSpaceId: null }),
        });
        setPendingSelection(null);
      } catch (error) {
        selectedDateRef.current = ui.selectedDate;
        setPendingSelection(null);
        showToast(error instanceof Error ? error.message : 'Could not load that day', {
          tone: 'error',
        });
      }
    },
    [
      reload,
      setUI,
      settings.general.keepFilterWhileChangingDays,
      showToast,
      ui.activeSpaceId,
      ui.selectedDate,
    ],
  );

  const shiftDay = useCallback(
    (delta: number) => {
      const next = parseLocalDate(selectedDateRef.current);
      next.setDate(next.getDate() + delta);
      triggerHaptic('selection');
      void chooseDate(next);
    },
    [chooseDate],
  );

  const openQuickAdd = useCallback(() => {
    triggerHaptic('medium');
    openQuickAddEditor();
  }, [openQuickAddEditor]);

  const pullDownToSearch = settings.general.pullDownToSearch;
  const pullDownEnabled = settings.general.pullDownToAdd || pullDownToSearch;
  const runPullAction = useCallback(() => {
    if (pullDownToSearch) {
      openSearch();
      return;
    }
    openQuickAdd();
  }, [openQuickAdd, openSearch, pullDownToSearch]);

  const {
    scrollRef,
    scrollGesture,
    onScroll,
    onScrollEndDrag,
    pullContentStyle,
    pullHintStyle,
    pullLabelStyle,
    releaseLabelStyle,
  } = usePlannerGestures({
    onShiftDay: shiftDay,
    onPullAdd: runPullAction,
    gesturesEnabled: !drawingActive,
    pullDownToAdd: pullDownEnabled,
    swipeToChangeDay: settings.general.swipeToChangeDay,
  });

  const setMode = useCallback(
    (next: Mode) => {
      const today = toLocalDateString();
      const selectedDate =
        next === 'Recent' ? addDays(today, -1) : next === 'Upcoming' ? addDays(today, 1) : today;
      void chooseDate(parseLocalDate(selectedDate));
    },
    [chooseDate],
  );

  const dateHeading =
    settings.general.dateFormat === 'short'
      ? parseLocalDate(ui.selectedDate).toLocaleDateString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      : formatLongDate(ui.selectedDate);
  const visibleItemCount = allDay.length + scheduled.length;
  const isToday = ui.selectedDate === toLocalDateString();
  const itemCountLabel = `${visibleItemCount} ${visibleItemCount === 1 ? 'item' : 'items'}`;
  const isDark = colorScheme === 'dark';
  const usesNativeChrome = Platform.OS === 'ios';
  const usesNativeBottomTabs = Platform.OS === 'android';
  const headerTop = usesNativeChrome ? 0 : insets.top + 6;

  return (
    <View style={styles.safeArea}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {usesNativeChrome ? (
        <>
          {!isToday ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button onPress={() => void chooseDate(new Date())}>
                Today
              </Stack.Toolbar.Button>
            </Stack.Toolbar>
          ) : null}
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              accessibilityLabel="Open calendar"
              icon="calendar"
              onPress={() => setCalendarPickerOpen(true)}
            />
            <Stack.Toolbar.Button
              accessibilityLabel="Add a task"
              icon="plus"
              onPress={() => openCreate('task')}
            />
            <Stack.Toolbar.Menu accessibilityLabel="More" icon="ellipsis">
              <Stack.Toolbar.MenuAction
                icon="tray.full"
                onPress={() => setUI({ activeSpaceId: null })}
              >
                All items
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction
                icon="tray"
                onPress={() => setUI({ activeSpaceId: INBOX_FILTER_ID })}
              >
                Inbox
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction icon="gearshape" onPress={() => router.push('/settings')}>
                Settings
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
          </Stack.Toolbar>
        </>
      ) : null}
      <BlurTargetView ref={blurTarget} style={styles.blurTarget}>
        <Animated.View style={styles.blurTarget}>
          {pullDownEnabled ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pullHintWrap,
                { top: usesNativeChrome ? insets.top + 56 : headerTop + headerHeight },
                pullHintStyle,
              ]}
            >
              <View style={styles.pullHint}>
                <Animated.Text style={[styles.pullHintText, pullLabelStyle]}>
                  {pullDownToSearch ? 'Pull to search' : 'Pull to add'}
                </Animated.Text>
                <Animated.Text
                  style={[styles.pullHintText, styles.pullHintOverlay, releaseLabelStyle]}
                >
                  {pullDownToSearch ? 'Release to search' : 'Release to add'}
                </Animated.Text>
              </View>
            </Animated.View>
          ) : null}

          <PlannerGestureScroll
            scrollGesture={scrollGesture}
            scrollRef={scrollRef}
            scrollEnabled={!drawingActive}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            pullContentStyle={pullContentStyle}
            pageStyle={styles.page}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: usesNativeChrome ? 20 : headerTop + headerHeight + 12,
                paddingBottom: usesNativeChrome ? 32 : Math.max(128, insets.bottom + 108),
              },
            ]}
          >
            <View style={styles.dateHeaderRow}>
              <View style={styles.dateBlock}>
                <Text style={styles.dateTitle}>{dateHeading}</Text>
                <Text style={styles.dateSubtitle}>
                  {isToday
                    ? visibleItemCount > 0
                      ? `Today · ${itemCountLabel}`
                      : 'Today'
                    : visibleItemCount > 0
                      ? itemCountLabel
                      : 'No items'}
                </Text>
              </View>
            </View>

            {!usesNativeChrome ? (
              <Animated.ScrollView
                horizontal
                directionalLockEnabled
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.spaceFilterScroll}
                contentContainerStyle={styles.spaceFilters}
              >
                <SpaceFilter
                  active={!ui.activeSpaceId}
                  label="All"
                  onPress={() => setUI({ activeSpaceId: null })}
                />
                <SpaceFilter
                  active={isInboxSpaceFilter(ui.activeSpaceId)}
                  label="Inbox"
                  onPress={() => setUI({ activeSpaceId: INBOX_FILTER_ID })}
                />
                {(view?.spaces ?? [])
                  .filter((space) => space.isPinned && space.name.toLowerCase() !== 'inbox')
                  .map((space) => (
                    <SpaceFilter
                      active={ui.activeSpaceId === space.id}
                      key={space.id}
                      label={space.name}
                      onPress={() => setUI({ activeSpaceId: space.id })}
                    />
                  ))}
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Quick add a space"
                  haptic="light"
                  onPress={openCreateSpace}
                  pressedStyle={styles.spaceAddPressed}
                  style={styles.spaceAdd}
                >
                  <Icon name="add" size={18} color={C.accent} stroke={2.2} />
                </AnimatedPressable>
              </Animated.ScrollView>
            ) : null}

            <View
              style={[
                styles.connectStack,
                ((calendarAccess !== 'granted' && !calendarPromptDismissed) ||
                  (systemRemindersSupported &&
                    reminderAccess !== 'granted' &&
                    !reminderPromptDismissed)) &&
                  styles.connectStackVisible,
              ]}
            >
              {!calendarPromptDismissed ? (
                <PermissionCard
                  title="Bring your schedule together"
                  state={calendarAccess}
                  undetermined="See meetings and events alongside today’s tasks — including birthdays from your Birthdays calendar."
                  denied="Calendar access is off. Enable Calendar for Agenda in system settings to bring meetings into your day."
                  unavailable="Calendar sync needs a development build. Run: npx expo run:ios"
                  button="Connect calendar"
                  onDismiss={dismissCalendarPermission}
                  onPress={() => void requestCalendarPermission()}
                />
              ) : null}
              {systemRemindersSupported && !reminderPromptDismissed ? (
                <PermissionCard
                  title="Already use Apple Reminders?"
                  state={reminderAccess}
                  undetermined="Bring reminders due today into Agenda, next to your tasks."
                  denied="Reminders access is off. Enable Reminders for Agenda in system settings."
                  unavailable="Apple Reminders need the iOS app."
                  button="Connect Reminders"
                  onDismiss={dismissReminderPermission}
                  onPress={() => void requestReminderPermission()}
                />
              ) : null}
            </View>

            <View style={styles.contentStack}>
              <AgendaSections
                allDay={allDay}
                allDayExpanded={ui.allDayExpanded}
                compact={settings.general.compactStream}
                completed={completed}
                completedExpanded={ui.completedExpanded}
                emptyHint={filteredEmptyHint}
                interactionFor={interactionFor}
                onAllDayExpandedChange={(allDayExpanded) => setUI({ allDayExpanded })}
                onCompletedExpandedChange={(completedExpanded) => setUI({ completedExpanded })}
                scheduled={scheduled}
                showCompleted={settings.general.showCompleted}
              />

              <RoutinesSection
                activeSpaceLabel={activeSpaceLabel}
                onManage={openRoutines}
                onToggle={(id) => void toggleRoutine(id)}
                routines={routines}
              />

              <TodaysPage
                key={ui.selectedDate}
                date={ui.selectedDate}
                repos={repos}
                settings={settings}
                onDrawingActiveChange={setDrawingActive}
                onError={(message) => showToast(message, { tone: 'error' })}
                onPersisted={refresh}
              />
            </View>
          </PlannerGestureScroll>
        </Animated.View>
      </BlurTargetView>

      {!usesNativeChrome ? (
        <View
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
          pointerEvents={editorOpen ? 'none' : 'box-none'}
          style={[styles.stickyHeader, { top: headerTop }]}
        >
          <TopBar
            calendarIndicator={
              settings.general.calendarIndicators &&
              Boolean(
                view &&
                (view.allDay.length ||
                  view.scheduled.length ||
                  view.completed.length ||
                  view.dailyNote?.bodyText.trim()),
              )
            }
            mode={mode}
            setMode={setMode}
            onCalendar={() => setCalendarPickerOpen(true)}
            onSettings={() => router.push('/settings')}
          />
        </View>
      ) : null}

      {!editorOpen && !usesNativeChrome && !usesNativeBottomTabs ? (
        <BottomBar
          blurTarget={blurTarget}
          bottom={Math.max(16, insets.bottom + 10)}
          onAdd={() => openCreate('task')}
          onMore={openLibrary}
          onSearch={openSearch}
        />
      ) : null}

      {calendarPickerOpen ? (
        <CalendarPickerModal
          onChange={chooseDate}
          onClose={() => setCalendarPickerOpen(false)}
          onToday={() => chooseDate(new Date())}
          value={parseLocalDate(ui.selectedDate)}
          visible
          weekStartsOn={settings.general.weekStartsOn}
        />
      ) : null}
    </View>
  );
}

function TopBar({
  calendarIndicator,
  mode,
  setMode,
  onCalendar,
  onSettings,
}: {
  calendarIndicator: boolean;
  mode: Mode;
  setMode: (mode: Mode) => void;
  onCalendar: () => void;
  onSettings: () => void;
}) {
  const { styles } = usePlannerTheme();
  const modes: { value: Mode; label: string }[] = [
    { value: 'Recent', label: 'Recent' },
    { value: 'Today', label: 'Today' },
    { value: 'Upcoming', label: 'Upcoming' },
  ];

  return (
    <View style={styles.topBar}>
      <SegmentedControl onChange={setMode} options={modes} style={styles.segmented} value={mode} />

      <View style={styles.topActions}>
        <CircleIconButton
          indicator={calendarIndicator}
          name="calendar"
          onPress={onCalendar}
          accessibilityLabel="Open calendar"
        />
        <CircleIconButton name="settings" onPress={onSettings} accessibilityLabel="Open settings" />
      </View>
    </View>
  );
}

function SpaceFilter({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const { styles } = usePlannerTheme();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      disabled={active}
      haptic="selection"
      onPress={onPress}
      pressScale={0.98}
      style={[styles.spaceFilter, active && styles.spaceFilterActive]}
    >
      <Text style={[styles.spaceFilterLabel, active && styles.spaceFilterLabelActive]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function CircleIconButton({
  indicator = false,
  name,
  onPress,
  accessibilityLabel,
}: {
  indicator?: boolean;
  name: IconName;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { C, styles } = usePlannerTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      pressScale={0.94}
      pressedStyle={styles.circleButtonPressed}
      style={styles.circleButton}
    >
      <Icon name={name} size={20} color={C.text} stroke={1.9} />
      {indicator ? <View style={styles.calendarDot} /> : null}
    </AnimatedPressable>
  );
}

function createStyles(theme: AgendaTheme) {
  const C = plannerPalette(theme);
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: C.bg,
    },
    blurTarget: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    page: {
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      paddingHorizontal: 16,
    },

    stickyHeader: {
      position: 'absolute',
      left: 12,
      right: 12,
      zIndex: 20,
      alignItems: 'center',
    },
    topBar: {
      width: '100%',
      maxWidth: 416,
      alignSelf: 'center',
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    segmented: {
      flex: 1,
      minWidth: 0,
      borderWidth: 0,
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 5 },
      elevation: 4,
    },
    topActions: {
      flexDirection: 'row',
      flexShrink: 0,
      padding: 3,
      borderRadius: 999,
      backgroundColor: C.surface,
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 5 },
      elevation: 4,
    },
    circleButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.groupFill,
    },
    circleButtonPressed: {
      opacity: 0.72,
      backgroundColor: C.card,
    },
    calendarDot: {
      position: 'absolute',
      right: 7,
      bottom: 7,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: C.accent,
      borderWidth: 1.5,
      borderColor: C.bg,
    },

    dateHeaderRow: {
      marginTop: Platform.OS === 'ios' ? 8 : 12,
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    dateBlock: {
      flex: 1,
      minWidth: 0,
    },
    dateTitle: {
      fontFamily: fonts.sans,
      fontWeight: '400',
      fontSize: Platform.OS === 'ios' ? 28 : 34,
      lineHeight: Platform.OS === 'ios' ? 34 : 41,
      letterSpacing: -0.45,
      color: C.text,
    },
    dateSubtitle: {
      marginTop: 2,
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 17,
      color: C.muted,
    },
    pullHintWrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 5,
      alignItems: 'center',
      paddingTop: 8,
    },
    pullHint: {
      minWidth: 118,
      height: 32,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.card,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.divider,
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    pullHintText: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 13,
      lineHeight: 16,
      color: C.muted,
    },
    pullHintOverlay: {
      position: 'absolute',
      color: C.text,
    },

    spaceFilters: {
      gap: 8,
      paddingBottom: 16,
    },
    spaceFilterScroll: {
      width: '100%',
      flexGrow: 0,
    },
    spaceFilter: {
      minHeight: 34,
      justifyContent: 'center',
      paddingHorizontal: 14,
      backgroundColor: C.surface,
      borderRadius: 999,
    },
    spaceFilterActive: {
      backgroundColor: C.accent,
    },
    spaceFilterLabel: {
      color: C.muted,
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 14,
    },
    spaceFilterLabelActive: {
      color: C.onPrimary,
    },
    spaceAdd: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surface,
    },
    spaceAddPressed: {
      opacity: 0.68,
      backgroundColor: C.card,
    },

    connectStack: {
      gap: 12,
    },
    connectStackVisible: {
      marginBottom: 16,
    },

    contentStack: {
      gap: 18,
    },
  });
}
