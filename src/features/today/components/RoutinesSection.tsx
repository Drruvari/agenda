import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, ReduceMotion, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import type { TodayRoutine } from '@/features/today/hooks/useTodayAgenda';
import { type AgendaTheme, continuousCorner, fonts, motion, useAppTheme } from '@/theme';

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
  onManage: () => void;
  onToggle: (id: string) => void;
  routines: TodayRoutine[];
};

export function RoutinesSection({ activeSpaceLabel, onManage, onToggle, routines }: Props) {
  const { C, styles } = useRoutineTheme();
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
            <Icon name="add" size={24} color={C.muted} />
          </AnimatedPressable>
        </View>
      </View>

      {routines.length > 0 ? (
        <View style={styles.routineRow}>
          {routines.map((routine) => (
            <RoutineCard key={routine.id} routine={routine} onPress={() => onToggle(routine.id)} />
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

function RoutineCard({ routine, onPress }: { routine: TodayRoutine; onPress: () => void }) {
  const { styles } = useRoutineTheme();
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

function useRoutineTheme() {
  const theme = useAppTheme();
  return useMemo(
    () => ({ C: { muted: theme.textSecondary }, styles: createStyles(theme) }),
    [theme],
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    groupCard: {
      padding: 12,
      ...continuousCorner(24),
      backgroundColor: theme.card,
      gap: 8,
      overflow: 'hidden',
    },
    pressed: { opacity: 0.72 },
    routineCard: {
      flex: 1,
      minWidth: 0,
      height: 84,
      padding: 16,
      ...continuousCorner(16),
      backgroundColor: theme.section,
      alignItems: 'center',
      gap: 8,
    },
    routineCardCompleted: { backgroundColor: theme.primarySoft },
    routineCheck: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card,
    },
    routineCheckDone: { borderColor: theme.primary, backgroundColor: theme.card, padding: 2 },
    routineCheckFill: { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.primary },
    routineHeader: {
      minHeight: 36,
      paddingLeft: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    routineHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    routineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    routineTitle: {
      fontFamily: fonts.sansMedium,
      fontWeight: '500',
      fontSize: 16,
      lineHeight: 20,
      color: theme.text,
      textAlign: 'center',
    },
    routineTitleCompleted: {
      fontFamily: fonts.sansSemi,
      fontWeight: '600',
      color: theme.primary,
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
  });
}
