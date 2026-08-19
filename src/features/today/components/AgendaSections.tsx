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
import { useAppTheme } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { motion } from '@/theme/motion';
import { continuousCorner, spacing } from '@/theme/tokens';

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
  const { styles } = useAgendaSectionTheme(compact);
  const visibleAllDay = allDayExpanded ? allDay : allDay.slice(0, ALL_DAY_PREVIEW_COUNT);
  const hiddenAllDayCount = allDayExpanded ? 0 : Math.max(0, allDay.length - ALL_DAY_PREVIEW_COUNT);

  return (
    <>
      <View style={styles.groupCard}>
        <View style={styles.allDayHeader}>
          <Text style={styles.sectionLabel}>All day</Text>
          <SectionIconButton
            accessibilityLabel={
              allDayExpanded ? 'Collapse all-day section' : 'Expand all-day section'
            }
            compact={compact}
            disabled={allDay.length <= ALL_DAY_PREVIEW_COUNT}
            name={allDayExpanded ? 'minimize' : 'expand'}
            onPress={() => onAllDayExpandedChange(!allDayExpanded)}
          />
        </View>

        <View style={styles.listBlock}>
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
        </View>

        <View style={styles.sectionDivider}>
          <View style={styles.sectionDividerLine} />
        </View>

        <Animated.View style={styles.scheduledSection}>
          <View style={styles.scheduledHeader}>
            <Text style={styles.sectionLabel}>Scheduled</Text>
            <Text style={styles.sectionCount}>{scheduled.length}</Text>
          </View>
          <View style={styles.listBlock}>
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
          </View>
        </Animated.View>
      </View>

      {showCompleted ? (
        <View style={styles.groupCard}>
          <View style={styles.completedHeader}>
            <Text style={styles.sectionLabel}>Completed</Text>
            <View style={styles.completedHeaderRight}>
              <Text style={styles.sectionCount}>{completed.length}</Text>
              <SectionIconButton
                accessibilityLabel={
                  completedExpanded ? 'Collapse completed section' : 'Expand completed section'
                }
                compact={compact}
                name={completedExpanded ? 'minimize' : 'expand'}
                onPress={() => onCompletedExpandedChange(!completedExpanded)}
              />
            </View>
          </View>

          {completedExpanded ? (
            <Animated.View entering={sectionEnter} exiting={sectionExit} style={styles.listBlock}>
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
                <EmptyState compact message="No completed items yet." />
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
  compact = false,
  disabled = false,
  name,
  onPress,
}: {
  accessibilityLabel: string;
  compact?: boolean;
  disabled?: boolean;
  name: IconName;
  onPress: () => void;
}) {
  const { C, styles } = useAgendaSectionTheme(compact);
  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      haptic="light"
      onPress={onPress}
      pressedStyle={styles.pressed}
      style={[styles.squareButton, disabled && styles.squareButtonDisabled]}
    >
      <Icon name={name} size={18} color={C.muted} stroke={1.5} />
    </AnimatedPressable>
  );
}

function useAgendaSectionTheme(compact = false) {
  const theme = useAppTheme();
  return useMemo(
    () => ({
      C: {
        accent: theme.primary,
        checkbox: theme.border,
        checkboxDone: theme.text,
        danger: theme.danger,
        muted: theme.textSecondary,
        note: theme.textTertiary,
        special: theme.border,
        text: theme.text,
        warning: theme.warning,
      },
      styles: createStyles(theme, compact),
    }),
    [compact, theme],
  );
}

function specialIconName(special: NonNullable<TodayAgendaTask['special']>): IconName {
  if (special === 'birthday') return 'birthday';
  if (special === 'note') return 'pencil';
  return 'calendar';
}

function priorityColor(
  priority: Priority | undefined,
  C: ReturnType<typeof useAgendaSectionTheme>['C'],
) {
  if (priority === '!!!') return C.danger;
  if (priority === '!!') return C.warning;
  return C.accent;
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

function TaskMetadata({ compact = false, task }: { compact?: boolean; task: TodayAgendaTask }) {
  const { C, styles } = useAgendaSectionTheme(compact);
  const recurrence = recurrenceLabel(task);
  if (!task.detail && !task.subtitle && !recurrence) return null;

  return (
    <View style={styles.metadataBlock}>
      {task.detail ? (
        <Text numberOfLines={1} style={styles.taskDetail}>
          {task.detail}
        </Text>
      ) : null}
      {task.subtitle ? (
        <Text numberOfLines={1} style={styles.taskSubtitle}>
          {task.subtitle}
        </Text>
      ) : null}
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
  const { C, styles } = useAgendaSectionTheme(compact);
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
      style={styles.taskRow}
    >
      <View style={styles.taskBody}>
        <View style={styles.titleLine}>
          {task.special ? (
            <View style={styles.checkboxSlot}>
              <Icon name={specialIconName(task.special)} size={24} stroke={2} color={C.special} />
            </View>
          ) : (
            <RoundCheckbox checked={isDone} compact={compact} onPress={onToggleComplete} />
          )}
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
        </View>
        <TaskMetadata compact={compact} task={task} />
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
  const { C, styles } = useAgendaSectionTheme(compact);
  const isDone = completed || Boolean(task.completed);
  const interactive = Boolean(onPress || onLongPress);
  const isEvent = task.special === 'calendar' || task.item?.type === 'event';
  const body = (
    <>
      <View style={[styles.taskBody, styles.scheduledCopy]}>
        <View style={styles.titleLine}>
          {!isEvent ? (
            <RoundCheckbox checked={isDone} compact={compact} onPress={onToggleComplete} />
          ) : (
            <View style={styles.checkboxSlot}>
              <Icon name="calendar" size={24} stroke={2} color={C.special} />
            </View>
          )}
          <View style={styles.titleRow}>
            {!!task.priority && !isDone ? (
              <Text style={[styles.priorityInline, { color: priorityColor(task.priority, C) }]}>
                {task.priority}
              </Text>
            ) : null}
            <Text style={[styles.taskTitle, isDone && styles.taskTitleCompleted]} numberOfLines={1}>
              {task.title}
            </Text>
          </View>
        </View>
        <TaskMetadata compact={compact} task={task} />
      </View>
      {task.durationLabel ? (
        <View style={styles.durationBadge}>
          <Text style={styles.durationBadgeText}>{task.durationLabel}</Text>
        </View>
      ) : null}
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
      style={styles.scheduledRow}
    >
      {body}
    </TouchableOpacity>
  );

  return onComplete ? <SwipeableRow onComplete={onComplete}>{content}</SwipeableRow> : content;
}

function RoundCheckbox({
  checked = false,
  compact = false,
  onPress,
}: {
  checked?: boolean;
  compact?: boolean;
  onPress?: () => void;
}) {
  const { C, styles } = useAgendaSectionTheme(compact);
  const content = (
    <View
      style={[
        styles.checkbox,
        { borderColor: checked ? C.checkboxDone : C.checkbox },
        checked && styles.checkboxChecked,
      ]}
    >
      {checked ? (
        <Animated.View
          entering={checkEnter}
          exiting={checkExit}
          style={[styles.checkboxFill, { backgroundColor: C.checkboxDone }]}
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

function createStyles(theme: AgendaTheme, compact: boolean) {
  const dividerColor = theme.isDark ? theme.separator : '#E6E6E6';
  const completedTitle = theme.isDark ? theme.textSecondary : 'rgba(60, 60, 67, 0.6)';
  const badgeText = theme.isDark ? theme.textSecondary : 'rgba(60, 60, 67, 0.6)';
  const padX = spacing.lg;
  const padY = compact ? spacing.xs : spacing.sm;
  const rowGap = compact ? spacing.sm : spacing.md;
  const sectionGap = compact ? spacing.xs : spacing.sm;

  return StyleSheet.create({
    allDayHeader: {
      paddingTop: padY,
      paddingBottom: padY,
      paddingHorizontal: padX,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      backgroundColor: theme.card,
    },
    checkboxChecked: { padding: 2 },
    checkboxFill: { width: 16, height: 16, borderRadius: 8 },
    checkboxSlot: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    completedHeader: {
      paddingTop: padY,
      paddingBottom: padY,
      paddingHorizontal: padX,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    completedHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    durationBadge: {
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
      borderRadius: 999,
      backgroundColor: theme.isDark ? theme.section : theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    durationBadgeText: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 12,
      lineHeight: 16,
      color: badgeText,
    },
    groupCard: {
      paddingTop: padY,
      paddingBottom: compact ? spacing.md : spacing.lg,
      ...continuousCorner(26),
      backgroundColor: theme.card,
      gap: sectionGap,
      overflow: 'hidden',
    },
    indicatorMetadata: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
    listBlock: { gap: rowGap, alignSelf: 'stretch' },
    metadataBlock: {
      paddingLeft: 34,
      gap: 0,
      alignSelf: 'stretch',
    },
    moreRow: { paddingVertical: spacing.xs, paddingHorizontal: padX, justifyContent: 'center' },
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
      color: theme.danger,
    },
    scheduledCopy: { flex: 1, minWidth: 0 },
    scheduledHeader: {
      paddingHorizontal: padX,
      paddingBottom: padY,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    scheduledRow: {
      paddingHorizontal: padX,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    scheduledSection: {
      gap: sectionGap,
      alignSelf: 'stretch',
    },
    sectionCount: {
      fontFamily: fonts.sansSemi,
      fontWeight: '600',
      fontSize: 14,
      lineHeight: 18,
      textTransform: 'uppercase',
      color: theme.textSecondary,
    },
    sectionDivider: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xl,
      alignSelf: 'stretch',
    },
    sectionDividerLine: {
      height: StyleSheet.hairlineWidth * 2,
      backgroundColor: dividerColor,
      alignSelf: 'stretch',
    },
    sectionLabel: {
      fontFamily: fonts.sansSemi,
      fontWeight: '600',
      fontSize: 15,
      lineHeight: 18,
      textTransform: 'uppercase',
      color: theme.textSecondary,
    },
    squareButton: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    squareButtonDisabled: { opacity: 0.35 },
    taskBody: {
      gap: 0,
      alignSelf: 'stretch',
      justifyContent: 'center',
    },
    taskDetail: {
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 17,
      color: theme.textTertiary,
    },
    taskRow: {
      paddingHorizontal: padX,
      justifyContent: 'center',
    },
    taskSubtitle: {
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 17,
      color: theme.textSecondary,
    },
    taskTitle: {
      flexShrink: 1,
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 16,
      lineHeight: 19,
      color: theme.text,
    },
    taskTitleCompleted: {
      textDecorationLine: 'line-through',
      color: completedTitle,
    },
    titleLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm + 2,
      minWidth: 0,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 1,
      minWidth: 0,
      flexShrink: 1,
    },
  });
}
