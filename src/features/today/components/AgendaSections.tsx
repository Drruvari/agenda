import { Host as SwiftUIHost, Image as SFImage } from '@expo/ui/swift-ui';
import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  ReduceMotion,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import {
  type TodayAgendaTask,
  type TodayScheduledTask,
} from '@/features/today/hooks/useTodayAgenda';
import { type AgendaTheme, continuousCorner, fonts, motion, useAppTheme } from '@/theme';

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
const checkEnter = ZoomIn.springify()
  .damping(motion.snappy.damping)
  .stiffness(motion.snappy.stiffness)
  .mass(motion.snappy.mass)
  .reduceMotion(ReduceMotion.System);
const checkExit = ZoomOut.duration(motion.duration.instant)
  .easing(easeOut)
  .reduceMotion(ReduceMotion.System);
const sectionEnter = FadeInDown.duration(motion.duration.normal)
  .easing(easeOut)
  .reduceMotion(ReduceMotion.System);
const sectionExit = FadeOutUp.duration(motion.duration.fast)
  .easing(easeOut)
  .reduceMotion(ReduceMotion.System);

const ALL_DAY_PREVIEW_COUNT = 2;

type Priority = '' | '!' | '!!' | '!!!';

type Interaction = {
  onLongPress?: () => void;
  onPress?: () => void;
  onSwipeComplete?: () => void;
  onToggleComplete?: () => void;
};

type AgendaSectionsProps = {
  allDay: TodayAgendaTask[];
  allDayExpanded: boolean;
  compact: boolean;
  completed: TodayAgendaTask[];
  completedExpanded: boolean;
  emptyHint: string | null;
  interactionFor: (task: TodayAgendaTask) => Interaction;
  onAllDayExpandedChange: (expanded: boolean) => void;
  onCompletedExpandedChange: (expanded: boolean) => void;
  scheduled: TodayScheduledTask[];
  showCompleted: boolean;
};

export function AgendaSections({
  allDay,
  allDayExpanded,
  compact,
  completed,
  completedExpanded,
  emptyHint,
  interactionFor,
  onAllDayExpandedChange,
  onCompletedExpandedChange,
  scheduled,
  showCompleted,
}: AgendaSectionsProps) {
  const { C, styles } = useAgendaSectionTheme();
  const visibleAllDay = allDayExpanded ? allDay : allDay.slice(0, ALL_DAY_PREVIEW_COUNT);
  const hiddenAllDayCount = allDayExpanded ? 0 : Math.max(0, allDay.length - ALL_DAY_PREVIEW_COUNT);

  return (
    <>
      <View style={styles.groupCard}>
        <View style={styles.allDayHeader}>
          <Text style={styles.sectionLabel}>All day</Text>
          {allDay.length > ALL_DAY_PREVIEW_COUNT ? (
            <SectionIconButton
              accessibilityLabel={
                allDayExpanded ? 'Collapse all-day section' : 'Expand all-day section'
              }
              name={allDayExpanded ? 'chevronUp' : 'chevronDown'}
              onPress={() => onAllDayExpandedChange(!allDayExpanded)}
            />
          ) : null}
        </View>

        {visibleAllDay.length > 0 ? (
          visibleAllDay.map((task) => {
            const interaction = interactionFor(task);
            return (
              <TaskRow
                compact={compact}
                completed={Boolean(task.completed)}
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
          <EmptyState compact message={emptyHint ?? 'Nothing all day. Add a task or event.'} />
        )}

        {hiddenAllDayCount > 0 ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={`Show ${hiddenAllDayCount} more all-day items`}
            haptic="selection"
            onPress={() => onAllDayExpandedChange(true)}
            pressedStyle={styles.pressed}
            style={styles.moreRow}
          >
            <Text style={styles.moreText}>+{hiddenAllDayCount} more</Text>
          </AnimatedPressable>
        ) : null}

        <Animated.View style={styles.scheduledSection}>
          <View style={styles.scheduledHeader}>
            <Text style={styles.sectionLabel}>Scheduled</Text>
            <Text style={styles.sectionCount}>{scheduled.length}</Text>
          </View>
          {scheduled.length > 0 ? (
            scheduled.map((task) => {
              const interaction = interactionFor(task);
              return (
                <ScheduledRow
                  compact={compact}
                  completed={Boolean(task.completed)}
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
            <EmptyState compact message={emptyHint ?? 'No scheduled items yet.'} />
          )}
        </Animated.View>
      </View>

      {showCompleted ? (
        <View style={styles.groupCard}>
          <AnimatedPressable
            onPress={() => onCompletedExpandedChange(!completedExpanded)}
            accessibilityRole="button"
            accessibilityLabel="Toggle completed tasks"
            accessibilityState={{ expanded: completedExpanded }}
            haptic="selection"
            pressedStyle={styles.pressed}
            style={styles.completedHeader}
          >
            <Text style={styles.sectionLabel}>{completed.length} Completed</Text>
            <Icon
              name={completedExpanded ? 'chevronUp' : 'chevronDown'}
              size={20}
              color={C.muted}
            />
          </AnimatedPressable>

          {completedExpanded ? (
            <Animated.View
              entering={sectionEnter}
              exiting={sectionExit}
              style={styles.completedList}
            >
              {completed.length > 0 ? (
                completed.map((task) => {
                  const interaction = interactionFor(task);
                  return (
                    <TaskRow
                      compact={compact}
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
    </>
  );
}

function SectionIconButton({
  accessibilityLabel,
  name,
  onPress,
}: {
  accessibilityLabel: string;
  name: IconName;
  onPress: () => void;
}) {
  const { C, styles } = useAgendaSectionTheme();
  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      haptic="light"
      onPress={onPress}
      pressedStyle={styles.pressed}
      style={styles.squareButton}
    >
      <Icon name={name} size={24} color={C.muted} />
    </AnimatedPressable>
  );
}

function useAgendaSectionTheme() {
  const theme = useAppTheme();
  return useMemo(
    () => ({
      C: {
        accent: theme.primary,
        birthday: String(theme.category.pink),
        danger: theme.danger,
        event: String(theme.category.blue),
        muted: theme.textSecondary,
        note: String(theme.category.purple),
        reminder: String(theme.category.green),
        task: theme.primary,
        text: theme.text,
        warning: theme.warning,
      },
      styles: createStyles(theme),
    }),
    [theme],
  );
}

function specialIconName(special: NonNullable<TodayAgendaTask['special']>): IconName {
  if (special === 'birthday') return 'birthday';
  if (special === 'note') return 'pencil';
  return 'calendar';
}

function itemAccent(
  task: TodayAgendaTask,
  completed: boolean,
  C: ReturnType<typeof useAgendaSectionTheme>['C'],
): string {
  if (completed) return C.muted;
  if (task.period === 'Recent' || (task.period !== 'Upcoming' && task.late)) return C.danger;
  if (task.special === 'birthday') return C.birthday;
  if (task.special === 'note') return C.note;
  if (task.special === 'calendar' || task.item?.type === 'event') return C.event;
  if (task.systemReminderId) return C.reminder;
  return C.task;
}

function priorityColor(
  priority: Priority | undefined,
  C: ReturnType<typeof useAgendaSectionTheme>['C'],
) {
  if (priority === '!!!') return C.danger;
  if (priority === '!!') return C.warning;
  return C.task;
}

function recurrenceLabel(task: TodayAgendaTask): string | null {
  if (!task.item || (task.item.type !== 'task' && task.item.type !== 'event')) return null;
  const recurrence = task.item.recurrence;
  if (!recurrence) return null;

  const frequency = recurrence.freq[0].toUpperCase() + recurrence.freq.slice(1);
  return recurrence.interval && recurrence.interval > 1
    ? `Every ${recurrence.interval} ${recurrence.freq === 'daily' ? 'days' : `${recurrence.freq.slice(0, -2)}s`}`
    : frequency;
}

function RepeatIndicator({
  accessibilityLabel,
  color,
}: {
  accessibilityLabel: string;
  color: string;
}) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={metadataStyles.icon}>
      {Platform.OS === 'ios' ? (
        <SwiftUIHost matchContents style={metadataStyles.iconHost}>
          <SFImage systemName="repeat" size={16} color={color} />
        </SwiftUIHost>
      ) : (
        <Icon name="repeat" size={16} stroke={2} color={color} />
      )}
    </View>
  );
}

const metadataStyles = StyleSheet.create({
  icon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  iconHost: { width: 16, height: 16 },
});

function TaskMetadata({ task }: { task: TodayAgendaTask }) {
  const { C, styles } = useAgendaSectionTheme();
  const recurrence = recurrenceLabel(task);
  if (!task.subtitle && !recurrence) return null;

  return (
    <View style={styles.metadataRow}>
      {task.subtitle ? (
        <Text numberOfLines={1} style={styles.taskSubtitle}>
          {task.subtitle}
        </Text>
      ) : null}
      {task.subtitle && recurrence ? <View style={styles.metadataSeparator} /> : null}
      {recurrence ? (
        <View style={styles.indicatorMetadata}>
          <RepeatIndicator
            accessibilityLabel={`Repeats ${recurrence.toLowerCase()}`}
            color={C.muted}
          />
        </View>
      ) : null}
    </View>
  );
}

type RowInteractionProps = {
  compact?: boolean;
  completed?: boolean;
  onComplete?: () => void;
  onLongPress?: () => void;
  onPress?: () => void;
  onToggleComplete?: () => void;
};

export function TaskRow({
  task,
  completed = false,
  compact = false,
  onComplete,
  onLongPress,
  onPress,
  onToggleComplete,
}: RowInteractionProps & { task: TodayAgendaTask }) {
  const { C, styles } = useAgendaSectionTheme();
  const isDone = completed || Boolean(task.completed);
  const accent = itemAccent(task, isDone, C);
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
      style={[
        styles.itemSurface,
        styles.taskRow,
        compact && styles.taskRowCompact,
        isDone && styles.completedRow,
      ]}
    >
      <View style={styles.taskMain}>
        {task.special ? (
          <View style={styles.checkboxSlot}>
            <Icon name={specialIconName(task.special)} size={22} stroke={2} color={accent} />
          </View>
        ) : (
          <RoundCheckbox checked={isDone} color={accent} onPress={onToggleComplete} />
        )}
        <View style={styles.taskCopy}>
          <View style={styles.titleRow}>
            {!!task.priority && !isDone ? (
              <Text style={[styles.priorityInline, { color: priorityColor(task.priority, C) }]}>
                {task.priority}
              </Text>
            ) : null}
            <Text numberOfLines={1} style={[styles.taskTitle, isDone && styles.taskTitleCompleted]}>
              {task.title}
            </Text>
          </View>
          <TaskMetadata task={task} />
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

export function ScheduledRow({
  compact = false,
  completed = false,
  task,
  onComplete,
  onLongPress,
  onPress,
  onToggleComplete,
}: RowInteractionProps & { task: TodayScheduledTask }) {
  const { C, styles } = useAgendaSectionTheme();
  const isDone = completed || Boolean(task.completed);
  const accent = itemAccent(task, isDone, C);
  const interactive = Boolean(onPress || onLongPress);
  const isEvent = task.special === 'calendar' || task.item?.type === 'event';
  const body = (
    <>
      <Text style={[styles.timeText, isDone && styles.taskTitleCompleted, { color: accent }]}>
        {task.time}
      </Text>
      <View style={[styles.scheduleAccentBar, { backgroundColor: accent }]} />
      <View style={[styles.scheduledTask, compact && styles.scheduledTaskCompact]}>
        <View style={styles.taskMain}>
          {!isEvent ? (
            <RoundCheckbox checked={isDone} color={accent} onPress={onToggleComplete} />
          ) : null}
          <View style={styles.taskCopy}>
            <View style={styles.titleRow}>
              {!!task.priority && !isDone ? (
                <Text style={[styles.priorityInline, { color: priorityColor(task.priority, C) }]}>
                  {task.priority}
                </Text>
              ) : null}
              <Text
                style={[styles.taskTitle, isDone && styles.taskTitleCompleted]}
                numberOfLines={1}
              >
                {task.title}
              </Text>
            </View>
            <TaskMetadata task={task} />
          </View>
        </View>
      </View>
    </>
  );

  // RNGH TouchableOpacity receives taps inside the planner's GestureDetector ScrollView on iOS.
  const content = (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={task.title}
      activeOpacity={0.82}
      delayLongPress={350}
      disabled={!interactive}
      onLongPress={onLongPress}
      onPress={onPress}
      style={[styles.itemSurface, styles.scheduledRow, compact && styles.scheduledRowCompact]}
    >
      {body}
    </TouchableOpacity>
  );

  return onComplete ? <SwipeableRow onComplete={onComplete}>{content}</SwipeableRow> : content;
}

function RoundCheckbox({
  checked = false,
  color,
  onPress,
}: {
  checked?: boolean;
  color: string;
  onPress?: () => void;
}) {
  const { styles } = useAgendaSectionTheme();
  const content = (
    <View style={[styles.checkbox, { borderColor: color }, checked && styles.checkboxChecked]}>
      {checked ? (
        <Animated.View
          entering={checkEnter}
          exiting={checkExit}
          style={[styles.checkboxFill, { backgroundColor: color }]}
        />
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

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    allDayHeader: {
      minHeight: 32,
      paddingHorizontal: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      backgroundColor: 'transparent',
    },
    checkboxChecked: { borderColor: theme.primary, padding: 2 },
    checkboxFill: { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.primary },
    checkboxSlot: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    completedRow: { opacity: 1 },
    completedHeader: {
      minHeight: 36,
      paddingHorizontal: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    completedList: { gap: 8 },
    groupCard: {
      padding: 12,
      ...continuousCorner(24),
      backgroundColor: theme.card,
      gap: 8,
      overflow: 'hidden',
    },
    indicatorMetadata: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
    itemSurface: {
      ...continuousCorner(18),
      backgroundColor: theme.isDark ? '#2C2C2E' : '#F2F2F7',
    },
    metadataRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
    metadataSeparator: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: theme.separator,
      flexShrink: 0,
    },
    moreRow: { minHeight: 36, paddingHorizontal: 16, justifyContent: 'center' },
    moreText: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 14,
      lineHeight: 18,
      color: theme.textSecondary,
    },
    pressed: { opacity: 0.72 },
    priorityInline: {
      flexShrink: 0,
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 18,
      color: theme.primary,
    },
    scheduleAccentBar: { width: 3, height: 36, marginRight: 12, borderRadius: 2 },
    scheduledHeader: {
      minHeight: 32,
      paddingHorizontal: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    scheduledRow: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    scheduledRowCompact: { minHeight: 46 },
    scheduledTask: {
      minHeight: 64,
      flex: 1,
      paddingVertical: 10,
      backgroundColor: 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    scheduledTaskCompact: { minHeight: 46, paddingVertical: 4 },
    scheduledSection: {
      marginTop: 2,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.separator,
      gap: 8,
    },
    sectionCount: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 14,
      lineHeight: 18,
      color: theme.textSecondary,
    },
    sectionLabel: {
      fontFamily: fonts.sansSemi,
      fontWeight: '600',
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0.35,
      textTransform: 'uppercase',
      color: theme.textSecondary,
    },
    squareButton: {
      width: 44,
      height: 44,
      ...continuousCorner(12),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    taskCopy: { flex: 1, minWidth: 0, gap: 4, justifyContent: 'center' },
    taskMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
    taskRow: {
      minHeight: 58,
      paddingVertical: 9,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    taskRowCompact: { minHeight: 46, paddingVertical: 4 },
    taskSubtitle: {
      flexShrink: 1,
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 16,
      color: theme.textSecondary,
    },
    taskTitle: {
      flexShrink: 1,
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 16,
      lineHeight: 20,
      color: theme.text,
    },
    taskTitleCompleted: { textDecorationLine: 'line-through', color: theme.textSecondary },
    timeText: {
      width: 54,
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 15,
      lineHeight: 19,
      color: theme.text,
      fontVariant: ['tabular-nums'],
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  });
}
