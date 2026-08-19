import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, ReduceMotion, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import type { TodayRoutine } from '@/features/today/hooks/useTodayAgenda';
import { useAppTheme } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { motion } from '@/theme/motion';
import { continuousCorner, spacing } from '@/theme/tokens';

const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
const checkEnter = ZoomIn.springify()
  .damping(motion.snappy.damping)
  .stiffness(motion.snappy.stiffness)
  .mass(motion.snappy.mass)
  .reduceMotion(ReduceMotion.System);
const checkExit = ZoomOut.duration(motion.duration.instant)
  .easing(easeOut)
  .reduceMotion(ReduceMotion.System);

type Props = {
  activeSpaceLabel: string | null;
  compact?: boolean;
  onManage: () => void;
  onToggle: (id: string) => void;
  routines: TodayRoutine[];
};

export function RoutinesSection({
  activeSpaceLabel,
  compact = false,
  onManage,
  onToggle,
  routines,
}: Props) {
  const { C, styles } = useRoutineTheme(compact);
  const completed = routines.filter((routine) => routine.completed).length;

  return (
    <View style={styles.groupCard}>
      <View style={styles.routineHeader}>
        <Text style={styles.sectionLabel}>Routines</Text>
        <View style={styles.routineHeaderRight}>
          <Text style={styles.sectionCount}>
            {completed}/{routines.length}
          </Text>
          <AnimatedPressable
            accessibilityLabel="Add or manage routines"
            accessibilityRole="button"
            haptic="light"
            onPress={onManage}
            pressedStyle={styles.pressed}
            style={styles.squareButton}
          >
            <Icon name="add" size={18} color={C.muted} stroke={1.5} />
          </AnimatedPressable>
        </View>
      </View>

      {routines.length > 0 ? (
        <View style={styles.routineRow}>
          {routines.map((routine) => (
            <RoutineCard
              compact={compact}
              key={routine.id}
              routine={routine}
              onPress={() => onToggle(routine.id)}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          compact
          message={
            activeSpaceLabel
              ? `No routines for ${activeSpaceLabel}.`
              : 'No routines yet. Create one to build a habit.'
          }
        />
      )}
    </View>
  );
}

function RoutineCard({
  compact,
  routine,
  onPress,
}: {
  compact: boolean;
  routine: TodayRoutine;
  onPress: () => void;
}) {
  const { C, styles } = useRoutineTheme(compact);
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
      <View
        style={[
          styles.routineCheck,
          {
            borderColor: routine.completed ? C.checkboxDone : C.checkbox,
          },
          routine.completed && styles.routineCheckDone,
        ]}
      >
        {routine.completed ? (
          <Animated.View
            entering={checkEnter}
            exiting={checkExit}
            style={[styles.routineCheckFill, { backgroundColor: C.checkboxDone }]}
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

function useRoutineTheme(compact = false) {
  const theme = useAppTheme();
  return useMemo(
    () => ({
      C: {
        checkbox: theme.border,
        checkboxDone: theme.text,
        muted: theme.textSecondary,
      },
      styles: createStyles(theme, compact),
    }),
    [compact, theme],
  );
}

function createStyles(theme: AgendaTheme, compact: boolean) {
  const completedTitle = theme.isDark ? theme.textSecondary : 'rgba(60, 60, 67, 0.6)';
  const padX = spacing.lg;
  const padY = compact ? spacing.xs : spacing.sm;
  const sectionGap = compact ? spacing.xs : spacing.sm;

  return StyleSheet.create({
    groupCard: {
      paddingTop: padY,
      paddingBottom: compact ? spacing.md : spacing.lg,
      ...continuousCorner(26),
      backgroundColor: theme.card,
      gap: sectionGap,
      overflow: 'hidden',
    },
    pressed: { opacity: 0.72 },
    routineCard: {
      flex: 1,
      minWidth: 0,
      height: compact ? 72 : 80,
      paddingHorizontal: spacing.md,
      paddingVertical: compact ? spacing.sm : spacing.md,
      ...continuousCorner(16),
      backgroundColor: theme.isDark ? theme.section : theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    routineCardCompleted: {
      backgroundColor: theme.isDark ? theme.section : theme.background,
    },
    routineCheck: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card,
    },
    routineCheckDone: { padding: 2 },
    routineCheckFill: { width: 16, height: 16, borderRadius: 8 },
    routineHeader: {
      paddingTop: padY,
      paddingBottom: padY,
      paddingHorizontal: padX,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    routineHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    routineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingHorizontal: padX,
    },
    routineTitle: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 16,
      lineHeight: 19,
      color: theme.text,
      textAlign: 'center',
    },
    routineTitleCompleted: {
      textDecorationLine: 'line-through',
      color: completedTitle,
    },
    sectionCount: {
      fontFamily: fonts.sansSemi,
      fontWeight: '600',
      fontSize: 14,
      lineHeight: 18,
      textTransform: 'uppercase',
      color: theme.textSecondary,
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
  });
}
