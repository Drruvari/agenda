import { BlurTargetView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  ReduceMotion,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { BlurSurface } from '@/components/ui/BlurSurface';
import { BottomBar } from '@/components/ui/BottomBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PermissionCard } from '@/components/ui/PermissionCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { useToast } from '@/components/ui/ToastProvider';
import {
  addDays,
  type AgendaItem,
  formatLongDate,
  loadTodayView,
  parseLocalDate,
  priorityLabel,
  type TodayViewModel,
  toLocalDateString,
  useData,
} from '@/data';
import { CalendarPickerModal } from '@/features/calendar/CalendarPickerModal';
import { TodaysPage } from '@/features/todays-page/TodaysPage';
import { useDayTransition } from '@/hooks/useDayTransition';
import { usePlannerGestures } from '@/hooks/usePlannerGestures';
import { triggerHaptic } from '@/lib/haptics';
import {
  type CalendarAccessState,
  type DeviceCalendarEvent,
  getCalendarAccessState,
  listDeviceEvents,
  requestCalendarAccess,
} from '@/native/calendar/deviceCalendar';
import { mergeNativeBirthdays } from '@/native/calendar/mergeNativeBirthdays';
import {
  type BirthdayAccessState,
  type DeviceBirthday,
  getBirthdayAccessState,
  listDeviceBirthdays,
  requestBirthdayAccess,
} from '@/native/contacts/deviceBirthdays';
import { cancelReminder } from '@/native/notifications/reminders';
import {
  completeSystemReminder,
  type DeviceSystemReminder,
  listSystemReminders,
} from '@/native/reminders/systemReminders';
import {
  type AgendaTheme,
  continuousCorner,
  fonts,
  motion,
  rgba,
  useAppAppearance,
  useAppTheme,
} from '@/theme';

const ALL_DAY_PREVIEW_COUNT = 2;
const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
const rowEnter = FadeInDown.duration(motion.duration.normal)
  .easing(easeOut)
  .reduceMotion(ReduceMotion.System);
const rowExit = FadeOutUp.duration(motion.duration.fast)
  .easing(easeOut)
  .reduceMotion(ReduceMotion.System);
const rowLayout = LinearTransition.springify()
  .damping(motion.soft.damping)
  .stiffness(motion.soft.stiffness)
  .mass(motion.soft.mass)
  .reduceMotion(ReduceMotion.System);
const sectionEnter = FadeInDown.duration(motion.duration.normal)
  .easing(easeOut)
  .reduceMotion(ReduceMotion.System);
const sectionExit = FadeOutUp.duration(motion.duration.fast)
  .easing(easeOut)
  .reduceMotion(ReduceMotion.System);
const checkEnter = ZoomIn.springify()
  .damping(motion.snappy.damping)
  .stiffness(motion.snappy.stiffness)
  .mass(motion.snappy.mass)
  .reduceMotion(ReduceMotion.System);
const checkExit = ZoomOut.duration(motion.duration.instant)
  .easing(easeOut)
  .reduceMotion(ReduceMotion.System);

type Mode = 'Recent' | 'Today' | 'Upcoming';
type Priority = '' | '!' | '!!' | '!!!';

type Task = {
  id: string;
  title: string;
  subtitle: string;
  priority?: Priority;
  late?: boolean;
  completed?: boolean;
  special?: 'calendar' | 'note' | 'birthday';
  item?: AgendaItem;
  systemReminderId?: string;
};

type ScheduledTask = Task & {
  time: string;
  icon?: 'clock';
};

type Routine = {
  id: string;
  title: string;
  subtitle: string;
  completed: boolean;
};

function plannerPalette(theme: AgendaTheme) {
  return {
    bg: theme.background,
    text: theme.text,
    surface: theme.section,
    muted: theme.textSecondary,
    placeholder: theme.placeholder,
    divider: theme.separator,
    accent: theme.primary,
    accentSoft: theme.primarySoft,
    warning: theme.warning,
    danger: theme.danger,
    iconMuted: theme.border,
    checkboxBorder: theme.border,
    onPrimary: theme.onPrimary,
    card: theme.card,
  };
}

function usePlannerTheme() {
  const theme = useAppTheme();
  return useMemo(() => ({ C: plannerPalette(theme), styles: createStyles(theme) }), [theme]);
}

export default function PlannerScreen() {
  const { C, styles } = usePlannerTheme();
  const { colorScheme } = useAppAppearance();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const { repos, revision, refresh, settings, settingsStore, ui, setUI } = useData();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const { style: dayTransitionStyle, run: runDayTransition } = useDayTransition();
  const blurTarget = useRef<View | null>(null);
  const [view, setView] = useState<TodayViewModel | null>(null);
  const [deviceEvents, setDeviceEvents] = useState<DeviceCalendarEvent[]>([]);
  const [deviceBirthdays, setDeviceBirthdays] = useState<DeviceBirthday[]>([]);
  const [systemReminders, setSystemReminders] = useState<DeviceSystemReminder[]>([]);
  const [calendarAccess, setCalendarAccess] = useState<CalendarAccessState>('undetermined');
  const [birthdayAccess, setBirthdayAccess] = useState<BirthdayAccessState>('undetermined');
  const [calendarPickerOpen, setCalendarPickerOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(100);
  const [drawingActive, setDrawingActive] = useState(false);
  const today = toLocalDateString();
  const mode: Mode =
    ui.selectedDate < today ? 'Recent' : ui.selectedDate > today ? 'Upcoming' : 'Today';

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

  const reload = useCallback(async () => {
    const next = await loadTodayView(
      repos,
      ui.selectedDate,
      ui.activeSpaceId,
      settings.general.showCompleted,
    );
    const start = parseLocalDate(ui.selectedDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const [calendarState, birthdayState] = await Promise.all([
      getCalendarAccessState(),
      getBirthdayAccessState(),
    ]);
    const [nativeEvents, birthdays, reminders] = await Promise.all([
      calendarState === 'granted'
        ? listDeviceEvents(start, end).catch(() => [])
        : Promise.resolve([]),
      birthdayState === 'granted'
        ? listDeviceBirthdays(start).catch(() => [])
        : Promise.resolve([]),
      listSystemReminders(start, end).catch(() => []),
    ]);
    setView(next);
    setCalendarAccess(calendarState);
    setBirthdayAccess(birthdayState);
    setDeviceEvents(nativeEvents);
    setDeviceBirthdays(birthdays);
    setSystemReminders(reminders);
  }, [repos, settings.general.showCompleted, ui.activeSpaceId, ui.selectedDate]);

  useEffect(() => {
    const timer = setTimeout(() => void reload(), 0);
    return () => clearTimeout(timer);
  }, [reload, revision]);

  const connectCalendar = async () => {
    setCalendarAccess(await requestCalendarAccess());
    refresh();
  };

  const connectBirthdays = async () => {
    setBirthdayAccess(await requestBirthdayAccess());
    refresh();
  };

  const spacesById = useMemo(
    () => new Map(view?.spaces.map((space) => [space.id, space.name]) ?? []),
    [view?.spaces],
  );

  const mapItem = useCallback(
    (item: AgendaItem): Task => {
      const spaceName = item.spaceId ? spacesById.get(item.spaceId) : undefined;
      const typeLabel =
        item.type === 'event'
          ? `${item.durationMinutes} min`
          : item.type === 'note'
            ? 'Note'
            : 'Task';
      return {
        id: item.id,
        title: item.title,
        subtitle: [spaceName, typeLabel].filter(Boolean).join(', '),
        priority: priorityLabel(item.priority) as Priority,
        completed: item.type === 'task' ? item.completed : false,
        special: item.type === 'event' ? 'calendar' : item.type === 'note' ? 'note' : undefined,
        item,
      };
    },
    [spacesById],
  );

  const birthdays = useMemo(
    () => mergeNativeBirthdays(deviceEvents, deviceBirthdays),
    [deviceBirthdays, deviceEvents],
  );

  const allDay = useMemo<Task[]>(
    () => [
      ...(view?.allDay.map(mapItem) ?? []),
      ...deviceEvents
        .filter(
          (event) =>
            event.kind === 'event' &&
            event.allDay &&
            !view?.allDay.some((item) => item.deviceEventId === event.id),
        )
        .map((event) => ({
          id: `device:${event.id}`,
          title: event.title,
          subtitle: event.calendarTitle ?? 'Device calendar',
          special: 'calendar' as const,
        })),
      ...birthdays.map((birthday) => ({
        id: birthday.id,
        title: birthday.title,
        subtitle: birthday.subtitle,
        special: 'birthday' as const,
      })),
      ...systemReminders
        .filter((reminder) => reminder.allDay)
        .map((reminder) => ({
          id: `system-reminder:${reminder.id}`,
          title: reminder.title,
          subtitle: reminder.listTitle ?? 'Apple Reminders',
          systemReminderId: reminder.id,
        })),
    ],
    [birthdays, deviceEvents, mapItem, systemReminders, view?.allDay],
  );

  const scheduled = useMemo<ScheduledTask[]>(
    () =>
      [
        ...(view?.scheduled.map((item) => ({
          ...mapItem(item),
          time: item.time ?? '',
          icon: item.type === 'event' ? ('clock' as const) : undefined,
        })) ?? []),
        ...deviceEvents
          .filter(
            (event) =>
              event.kind === 'event' &&
              !event.allDay &&
              !view?.scheduled.some((item) => item.deviceEventId === event.id),
          )
          .map((event) => ({
            id: `device:${event.id}`,
            title: event.title,
            subtitle: event.calendarTitle ?? 'Device calendar',
            time: new Date(event.startDate).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
            icon: 'clock' as const,
            special: 'calendar' as const,
          })),
        ...systemReminders
          .filter((reminder) => !reminder.allDay && reminder.dueDate)
          .map((reminder) => ({
            id: `system-reminder:${reminder.id}`,
            title: reminder.title,
            subtitle: reminder.listTitle ?? 'Apple Reminders',
            time: new Date(reminder.dueDate as string).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
            icon: 'clock' as const,
            systemReminderId: reminder.id,
          })),
      ].sort((a, b) => a.time.localeCompare(b.time)),
    [deviceEvents, mapItem, systemReminders, view?.scheduled],
  );

  const completed = useMemo(() => view?.completed.map(mapItem) ?? [], [mapItem, view?.completed]);
  const routines = useMemo<Routine[]>(
    () =>
      view?.routines.map(({ routine, completed: done, spaceName }) => ({
        id: routine.id,
        title: routine.name,
        subtitle: spaceName ?? 'Routine',
        completed: done,
      })) ?? [],
    [view?.routines],
  );

  const completedRoutines = useMemo(
    () => routines.filter((routine) => routine.completed).length,
    [routines],
  );

  const completeTask = async (task: Task) => {
    if (task.item?.type !== 'task') return;
    try {
      await cancelReminder(task.item.notificationId).catch(() => undefined);
      await repos.agenda.complete(task.item.id);
      triggerHaptic('success');
      refresh();
      showToast(`Completed “${task.title}”`, {
        subtitle: 'Task is completed',
        actionLabel: 'Undo',
        onAction: () => {
          void repos.agenda
            .uncomplete(task.item!.id)
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
      await repos.agenda.uncomplete(task.item.id);
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
    if (task.item?.type !== 'task') return;
    router.push(`/tasks/${task.item.id}`);
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
    const canToggle = isAgendaTask || Boolean(task.systemReminderId);
    if (!canToggle) {
      return {
        onToggleComplete: undefined as (() => void) | undefined,
        onPress: undefined as (() => void) | undefined,
        onLongPress: undefined as (() => void) | undefined,
        onSwipeComplete: undefined as (() => void) | undefined,
      };
    }

    const onSwipeComplete = task.completed ? undefined : () => swipeComplete(task);

    if (settings.general.clickToEdit) {
      return {
        onToggleComplete: () => toggleTaskCompletion(task),
        onPress: isAgendaTask ? () => editTask(task) : () => toggleTaskCompletion(task),
        onLongPress: undefined as (() => void) | undefined,
        onSwipeComplete,
      };
    }

    return {
      onToggleComplete: undefined as (() => void) | undefined,
      onPress: () => toggleTaskCompletion(task),
      onLongPress: isAgendaTask ? () => editTask(task) : undefined,
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
    (date: Date) => {
      const selectedDate = toLocalDateString(date);
      const today = toLocalDateString();
      const mode: Mode =
        selectedDate < today ? 'Recent' : selectedDate > today ? 'Upcoming' : 'Today';
      const direction: -1 | 0 | 1 =
        selectedDate > ui.selectedDate ? 1 : selectedDate < ui.selectedDate ? -1 : 0;

      runDayTransition(direction, () => {
        setUI({
          selectedDate,
          mode: mode.toLowerCase() as 'recent' | 'today' | 'upcoming',
          ...(settings.general.keepFilterWhileChangingDays ? {} : { activeSpaceId: null }),
        });
      });
    },
    [runDayTransition, setUI, settings.general.keepFilterWhileChangingDays, ui.selectedDate],
  );

  const shiftDay = useCallback(
    (delta: number) => {
      const next = parseLocalDate(ui.selectedDate);
      next.setDate(next.getDate() + delta);
      triggerHaptic('selection');
      chooseDate(next);
    },
    [chooseDate, ui.selectedDate],
  );

  const openQuickAdd = useCallback(() => {
    triggerHaptic('medium');
    router.push('/quick-add');
  }, [router]);

  const {
    scrollRef,
    composedGesture,
    onScroll,
    onScrollEndDrag,
    pullContentStyle,
    pullHintStyle,
    pullLabelStyle,
    releaseLabelStyle,
  } = usePlannerGestures({
    onShiftDay: shiftDay,
    onPullAdd: openQuickAdd,
    gesturesEnabled: !drawingActive,
  });

  const setMode = useCallback(
    (next: Mode) => {
      const today = toLocalDateString();
      const selectedDate =
        next === 'Recent' ? addDays(today, -1) : next === 'Upcoming' ? addDays(today, 1) : today;
      const direction: -1 | 0 | 1 =
        selectedDate > ui.selectedDate ? 1 : selectedDate < ui.selectedDate ? -1 : 0;

      runDayTransition(direction, () => {
        setUI({
          selectedDate,
          mode: next.toLowerCase() as 'recent' | 'today' | 'upcoming',
          ...(settings.general.keepFilterWhileChangingDays ? {} : { activeSpaceId: null }),
        });
      });
    },
    [runDayTransition, setUI, settings.general.keepFilterWhileChangingDays, ui.selectedDate],
  );

  const dateHeading =
    settings.general.dateFormat === 'short'
      ? parseLocalDate(ui.selectedDate).toLocaleDateString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      : formatLongDate(ui.selectedDate);

  const visibleAllDay = ui.allDayExpanded ? allDay : allDay.slice(0, ALL_DAY_PREVIEW_COUNT);
  const hiddenAllDayCount = ui.allDayExpanded
    ? 0
    : Math.max(0, allDay.length - ALL_DAY_PREVIEW_COUNT);

  const isDark = colorScheme === 'dark';
  const headerFrosted = isDark ? rgba('#000000', 0.2) : rgba('#FFFFFF', 0.35);
  const headerTint = isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight';

  return (
    <View style={styles.safeArea}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <BlurTargetView ref={blurTarget} style={styles.blurTarget}>
        <Animated.View style={styles.blurTarget}>
          <Animated.View
            pointerEvents="none"
            style={[styles.pullHintWrap, { top: headerHeight - 4 }, pullHintStyle]}
          >
            <View style={styles.pullHint}>
              <Animated.Text style={[styles.pullHintText, pullLabelStyle]}>
                Pull to add
              </Animated.Text>
              <Animated.Text
                style={[styles.pullHintText, styles.pullHintOverlay, releaseLabelStyle]}
              >
                Release to add
              </Animated.Text>
            </View>
          </Animated.View>

          <GestureDetector gesture={composedGesture}>
            <Animated.ScrollView
              ref={scrollRef}
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              scrollEnabled={!drawingActive}
              bounces
              alwaysBounceVertical
              overScrollMode="always"
              onScroll={onScroll}
              onScrollEndDrag={onScrollEndDrag}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  paddingTop: headerHeight,
                  paddingBottom: Math.max(128, insets.bottom + 108),
                },
              ]}
            >
              <Animated.View style={pullContentStyle}>
                <Animated.View style={[styles.page, dayTransitionStyle]}>
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateTitle}>{dateHeading}</Text>
                    <Text style={styles.dateSubtitle}>Swipe to change day • pull down to add</Text>
                  </View>

                  {settings.general.showSpaces && view?.spaces.length ? (
                    <Animated.ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.spaceFilters}
                    >
                      <SpaceFilter
                        active={!ui.activeSpaceId}
                        label="All"
                        onPress={() => setUI({ activeSpaceId: null })}
                      />
                      {view.spaces.map((space) => (
                        <SpaceFilter
                          active={ui.activeSpaceId === space.id}
                          key={space.id}
                          label={space.name}
                          onPress={() => setUI({ activeSpaceId: space.id })}
                        />
                      ))}
                    </Animated.ScrollView>
                  ) : null}

                  <View style={styles.connectStack}>
                    <PermissionCard
                      title="Device calendar"
                      state={calendarAccess}
                      undetermined="Allow calendar access to show your meetings and events here."
                      denied="Calendar access is off. Enable Calendar for Agenda in system settings."
                      unavailable="Calendar sync needs a development build. Run: npx expo run:android"
                      button="Connect calendar"
                      onPress={() => void connectCalendar()}
                    />
                    <PermissionCard
                      title="Contact birthdays"
                      state={birthdayAccess}
                      undetermined="Allow Contacts access to show birthdays saved on contacts."
                      denied="Contacts access is off. Enable Contacts for Agenda in system settings."
                      unavailable="Contact birthdays need a development build. Run: npx expo run:android"
                      button="Show birthdays"
                      onPress={() => void connectBirthdays()}
                    />
                  </View>

                  <View style={styles.contentStack}>
                    <View style={styles.groupCard}>
                      <View style={styles.allDayHeader}>
                        <View style={styles.headerLabelRow}>
                          <Icon name="orbit" color={C.accent} size={24} stroke={1.7} />
                          <Text style={[styles.sectionLabel, styles.accentLabel]}>ALL DAY</Text>
                        </View>

                        <SquareIconButton
                          name={ui.allDayExpanded ? 'minimize' : 'expand'}
                          tone="accentSoft"
                          onPress={() => setUI({ allDayExpanded: !ui.allDayExpanded })}
                          accessibilityLabel={
                            ui.allDayExpanded
                              ? 'Collapse all-day section'
                              : 'Expand all-day section'
                          }
                        />
                      </View>

                      {visibleAllDay.length > 0 ? (
                        visibleAllDay.map((task) => {
                          const done = Boolean(task.completed);
                          const interaction = interactionFor(task);
                          return (
                            <TaskRow
                              compact={settings.general.compactStream}
                              completed={done}
                              key={task.id}
                              task={task}
                              onComplete={interaction.onSwipeComplete}
                              onLongPress={interaction.onLongPress}
                              onPress={interaction.onPress}
                              onToggleComplete={interaction.onToggleComplete}
                            />
                          );
                        })
                      ) : (
                        <EmptyState message="Nothing all day. Add a task or event." />
                      )}

                      {hiddenAllDayCount > 0 ? (
                        <AnimatedPressable
                          accessibilityRole="button"
                          accessibilityLabel={`Show ${hiddenAllDayCount} more all-day items`}
                          haptic="selection"
                          onPress={() => setUI({ allDayExpanded: true })}
                          pressedStyle={styles.pressed}
                          style={styles.moreRow}
                        >
                          <Text style={styles.moreText}>+{hiddenAllDayCount} more</Text>
                        </AnimatedPressable>
                      ) : null}

                      {ui.allDayExpanded ? (
                        <Animated.View entering={sectionEnter} exiting={sectionExit}>
                          <View style={styles.scheduledHeader}>
                            <Text style={styles.sectionLabel}>SCHEDULED</Text>
                            <Text style={styles.sectionCount}>{scheduled.length}</Text>
                          </View>

                          {scheduled.length > 0 ? (
                            scheduled.map((task) => {
                              const done = Boolean(task.completed);
                              const interaction = interactionFor(task);
                              return (
                                <ScheduledRow
                                  compact={settings.general.compactStream}
                                  completed={done}
                                  key={task.id}
                                  task={task}
                                  onComplete={interaction.onSwipeComplete}
                                  onLongPress={interaction.onLongPress}
                                  onPress={interaction.onPress}
                                  onToggleComplete={interaction.onToggleComplete}
                                />
                              );
                            })
                          ) : (
                            <EmptyState message="No scheduled items yet." />
                          )}
                        </Animated.View>
                      ) : null}
                    </View>

                    {settings.general.showCompleted ? (
                      <View style={styles.groupCard}>
                        <AnimatedPressable
                          onPress={() => setUI({ completedExpanded: !ui.completedExpanded })}
                          accessibilityRole="button"
                          accessibilityLabel="Toggle completed tasks"
                          accessibilityState={{ expanded: ui.completedExpanded }}
                          haptic="selection"
                          pressedStyle={styles.pressed}
                          style={styles.completedHeader}
                        >
                          <Text style={styles.sectionLabel}>{completed.length} COMPLETED</Text>
                          {ui.completedExpanded ? (
                            <Icon name="chevronUp" size={20} color={C.muted} />
                          ) : (
                            <Icon name="chevronDown" size={20} color={C.muted} />
                          )}
                        </AnimatedPressable>

                        {ui.completedExpanded ? (
                          <Animated.View entering={sectionEnter} exiting={sectionExit}>
                            {completed.length > 0 ? (
                              completed.map((task) => {
                                const interaction = interactionFor(task);
                                return (
                                  <TaskRow
                                    compact={settings.general.compactStream}
                                    key={task.id}
                                    task={task}
                                    completed
                                    onLongPress={interaction.onLongPress}
                                    onPress={interaction.onPress}
                                    onToggleComplete={interaction.onToggleComplete}
                                  />
                                );
                              })
                            ) : (
                              <EmptyState message="No completed items yet." />
                            )}
                          </Animated.View>
                        ) : null}
                      </View>
                    ) : null}

                    <View style={styles.groupCard}>
                      <View style={styles.routineHeader}>
                        <Text style={styles.sectionLabel}>ROUTINES</Text>
                        <View style={styles.routineHeaderRight}>
                          <Text style={styles.sectionCount}>
                            {completedRoutines}/{routines.length}
                          </Text>
                          <SquareIconButton
                            name="more"
                            tone="accentSoft"
                            onPress={() => router.push('/routines')}
                            accessibilityLabel="Routine options"
                          />
                        </View>
                      </View>

                      {routines.length > 0 ? (
                        <View style={styles.routineRow}>
                          {routines.map((routine) => (
                            <RoutineCard
                              key={routine.id}
                              routine={routine}
                              onPress={() => void toggleRoutine(routine.id)}
                            />
                          ))}
                        </View>
                      ) : (
                        <EmptyState message="No routines yet. Create one to build a habit." />
                      )}
                    </View>

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
                </Animated.View>
              </Animated.View>
            </Animated.ScrollView>
          </GestureDetector>
        </Animated.View>
      </BlurTargetView>

      <View
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        pointerEvents="box-none"
        style={styles.stickyHeader}
      >
        <BlurSurface
          blurTarget={blurTarget}
          borderBottomRadius={24}
          elevated={false}
          intensity={90}
          overlayColor={headerFrosted}
          tint={headerTint}
          style={styles.stickyHeaderBlur}
          contentStyle={[styles.stickyHeaderContent, { paddingTop: insets.top + 6 }]}
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
        </BlurSurface>
      </View>

      <BottomBar
        blurTarget={blurTarget}
        bottom={Math.max(16, insets.bottom + 10)}
        onAdd={() => router.push('/task-create')}
        onMore={() => router.push('/quick-add')}
        onSearch={() => router.push('/search')}
      />

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

function specialIconName(special: NonNullable<Task['special']>): IconName {
  if (special === 'birthday') return 'birthday';
  if (special === 'note') return 'pencil';
  return 'calendar';
}

function TaskRow({
  task,
  completed = false,
  compact = false,
  onComplete,
  onLongPress,
  onPress,
  onToggleComplete,
}: {
  task: Task;
  completed?: boolean;
  compact?: boolean;
  onComplete?: () => void;
  onLongPress?: () => void;
  onPress?: () => void;
  onToggleComplete?: () => void;
}) {
  const { C, styles } = usePlannerTheme();
  const isDone = completed || Boolean(task.completed);
  const interactive = Boolean(onPress || onLongPress);
  const content = (
    <AnimatedPressable
      disabled={!interactive}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole={onToggleComplete ? 'button' : onPress ? 'checkbox' : undefined}
      accessibilityState={onToggleComplete ? undefined : onPress ? { checked: isDone } : undefined}
      pressScale={0.99}
      pressedStyle={styles.pressed}
      style={[styles.taskRow, compact && styles.taskRowCompact, isDone && styles.completedRow]}
    >
      <View style={styles.taskMain}>
        {task.special ? (
          <View style={styles.checkboxSlot}>
            <Icon name={specialIconName(task.special)} size={24} color={C.iconMuted} />
          </View>
        ) : (
          <RoundCheckbox checked={isDone} onPress={onToggleComplete} />
        )}

        <View style={styles.taskCopy}>
          <View style={styles.titleRow}>
            {!!task.priority && !isDone ? (
              <Text style={styles.priorityInline}>{task.priority}</Text>
            ) : null}
            <Text numberOfLines={1} style={[styles.taskTitle, isDone && styles.taskTitleCompleted]}>
              {task.title}
            </Text>
          </View>
          <Text numberOfLines={1} style={[styles.taskSubtitle, task.late && styles.lateText]}>
            {task.subtitle}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );

  return (
    <Animated.View entering={rowEnter} exiting={rowExit} layout={rowLayout}>
      {onComplete ? <SwipeableRow onComplete={onComplete}>{content}</SwipeableRow> : content}
    </Animated.View>
  );
}

function ScheduledRow({
  compact = false,
  completed = false,
  task,
  onComplete,
  onLongPress,
  onPress,
  onToggleComplete,
}: {
  compact?: boolean;
  completed?: boolean;
  task: ScheduledTask;
  onComplete?: () => void;
  onLongPress?: () => void;
  onPress?: () => void;
  onToggleComplete?: () => void;
}) {
  const { C, styles } = usePlannerTheme();
  const isDone = completed || Boolean(task.completed);
  const interactive = Boolean(onPress || onLongPress);
  const content = (
    <View style={[styles.scheduledRow, compact && styles.scheduledRowCompact]}>
      <Text style={[styles.timeText, isDone && styles.taskTitleCompleted]}>{task.time}</Text>
      <View style={styles.timeDivider} />

      <AnimatedPressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        disabled={!interactive}
        accessibilityRole={onToggleComplete ? 'button' : onPress ? 'checkbox' : undefined}
        accessibilityState={
          onToggleComplete ? undefined : onPress ? { checked: isDone } : undefined
        }
        pressScale={0.99}
        pressedStyle={styles.pressed}
        style={[styles.scheduledTask, compact && styles.scheduledTaskCompact]}
      >
        <View style={styles.taskMain}>
          {task.icon === 'clock' ? (
            <View style={styles.checkboxSlot}>
              <Icon name="clock" size={24} color={C.iconMuted} />
            </View>
          ) : (
            <RoundCheckbox checked={isDone} onPress={onToggleComplete} />
          )}

          <View style={styles.taskCopy}>
            <View style={styles.titleRow}>
              {!!task.priority && !isDone ? (
                <Text style={styles.priorityInline}>{task.priority}</Text>
              ) : null}
              <Text
                style={[styles.taskTitle, isDone && styles.taskTitleCompleted]}
                numberOfLines={1}
              >
                {task.title}
              </Text>
            </View>
            <Text style={styles.taskSubtitle} numberOfLines={1}>
              {task.subtitle}
            </Text>
          </View>
        </View>
      </AnimatedPressable>
    </View>
  );

  return (
    <Animated.View entering={rowEnter} exiting={rowExit} layout={rowLayout}>
      {onComplete ? <SwipeableRow onComplete={onComplete}>{content}</SwipeableRow> : content}
    </Animated.View>
  );
}

function RoundCheckbox({ checked = false, onPress }: { checked?: boolean; onPress?: () => void }) {
  const { styles } = usePlannerTheme();
  const content = (
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked ? (
        <Animated.View entering={checkEnter} exiting={checkExit} style={styles.checkboxFill} />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <AnimatedPressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      haptic="selection"
      hitSlop={8}
      onPress={onPress}
    >
      {content}
    </AnimatedPressable>
  );
}

function RoutineCard({ routine, onPress }: { routine: Routine; onPress: () => void }) {
  const { styles } = usePlannerTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: routine.completed }}
      haptic="selection"
      pressScale={motion.cardPressScale}
      pressedStyle={styles.pressed}
      style={[styles.routineCard, routine.completed && styles.routineCardCompleted]}
    >
      <View style={[styles.routineCheck, routine.completed && styles.routineCheckDone]}>
        {routine.completed ? (
          <Animated.View
            entering={checkEnter}
            exiting={checkExit}
            style={styles.routineCheckFill}
          />
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        style={[styles.routineTitle, routine.completed && styles.routineTitleCompleted]}
      >
        {routine.title}
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

function SquareIconButton({
  name,
  tone,
  onPress,
  accessibilityLabel,
}: {
  name: IconName;
  tone: 'accent' | 'accentSoft';
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { C, styles } = usePlannerTheme();
  const filled = tone === 'accent';

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      haptic={filled ? 'medium' : 'light'}
      pressedStyle={styles.pressed}
      style={[styles.squareButton, filled ? styles.squareButtonAccent : styles.squareButtonSoft]}
    >
      <Icon name={name} size={24} color={filled ? C.onPrimary : C.accent} />
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
    scrollView: {
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
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
    },
    stickyHeaderBlur: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.divider,
    },
    stickyHeaderContent: {
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    topBar: {
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    segmented: {
      flex: 1,
      minWidth: 0,
    },
    topActions: {
      flexDirection: 'row',
      flexShrink: 0,
      gap: 8,
    },
    circleButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.divider,
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

    dateBlock: {
      marginTop: 12,
      marginBottom: 16,
    },
    dateTitle: {
      fontFamily: fonts.serif,
      fontSize: 36,
      lineHeight: 47,
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
      fontSize: 14,
    },
    spaceFilterLabelActive: {
      color: C.onPrimary,
    },

    connectStack: {
      gap: 12,
      marginBottom: 16,
    },

    contentStack: {
      gap: 16,
    },
    groupCard: {
      backgroundColor: C.surface,
      ...continuousCorner(16),
      padding: 4,
      gap: 4,
      overflow: 'hidden',
    },

    allDayHeader: {
      height: 44,
      paddingLeft: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 4,
    },
    moreRow: {
      minHeight: 36,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },
    moreText: {
      fontFamily: fonts.sansMedium,
      fontSize: 14,
      lineHeight: 18,
      color: C.muted,
    },
    squareButton: {
      width: 44,
      height: 44,
      ...continuousCorner(12),
      alignItems: 'center',
      justifyContent: 'center',
    },
    squareButtonAccent: {
      backgroundColor: C.accent,
    },
    squareButtonSoft: {
      backgroundColor: C.accentSoft,
    },
    sectionLabel: {
      fontFamily: fonts.sansSemi,
      fontSize: 14,
      lineHeight: 18,
      color: C.muted,
      textTransform: 'uppercase',
    },
    accentLabel: {
      fontSize: 16,
      lineHeight: 18,
      color: C.accent,
    },
    sectionCount: {
      fontFamily: fonts.sansMedium,
      fontSize: 14,
      lineHeight: 18,
      color: C.muted,
    },

    taskRow: {
      minHeight: 56,
      paddingVertical: 8,
      paddingHorizontal: 12,
      ...continuousCorner(16),
      backgroundColor: C.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    taskRowCompact: {
      minHeight: 46,
      paddingVertical: 4,
    },
    completedRow: {
      opacity: 1,
    },
    taskMain: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    checkboxSlot: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.checkboxBorder,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      backgroundColor: C.card,
    },
    checkboxChecked: {
      borderColor: C.accent,
      backgroundColor: C.card,
      padding: 2,
    },
    checkboxFill: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: C.accent,
    },
    taskCopy: {
      flex: 1,
      minWidth: 0,
      gap: 4,
      justifyContent: 'center',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minWidth: 0,
    },
    taskTitle: {
      flexShrink: 1,
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      lineHeight: 20,
      color: C.text,
    },
    taskTitleCompleted: {
      textDecorationLine: 'line-through',
      color: C.muted,
    },
    taskSubtitle: {
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 16,
      color: C.muted,
    },
    lateText: {
      color: C.danger,
    },
    priorityInline: {
      flexShrink: 0,
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 18,
      color: C.accent,
    },

    scheduledHeader: {
      height: 32,
      paddingVertical: 7,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    scheduledRow: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surface,
    },
    scheduledRowCompact: {
      minHeight: 46,
    },
    timeText: {
      width: 56,
      paddingLeft: 8,
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      lineHeight: 16,
      color: C.text,
      fontVariant: ['tabular-nums'],
    },
    timeDivider: {
      width: 1,
      height: 32,
      marginHorizontal: 8,
      backgroundColor: C.divider,
    },
    scheduledTask: {
      minHeight: 56,
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 16,
      ...continuousCorner(16),
      backgroundColor: C.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    scheduledTaskCompact: {
      minHeight: 46,
      paddingVertical: 4,
    },

    completedHeader: {
      height: 36,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    routineHeader: {
      height: 44,
      paddingLeft: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    routineHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    routineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 4,
    },
    routineCard: {
      flex: 1,
      minWidth: 0,
      height: 84,
      padding: 16,
      ...continuousCorner(16),
      backgroundColor: C.card,
      alignItems: 'center',
      gap: 8,
    },
    routineCardCompleted: {
      backgroundColor: C.accentSoft,
    },
    routineCheck: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.checkboxBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.card,
    },
    routineCheckDone: {
      borderColor: C.accent,
      backgroundColor: C.card,
      padding: 2,
    },
    routineCheckFill: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: C.accent,
    },
    routineTitle: {
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      lineHeight: 20,
      color: C.text,
      textAlign: 'center',
    },
    routineTitleCompleted: {
      fontFamily: fonts.sansSemi,
      color: C.accent,
    },

    pressed: {
      opacity: 0.72,
    },
  });
}
