import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Checkbox } from '@/components/ui/Checkbox';
import { Icon } from '@/components/ui/Icon';
import { OrbitLogo } from '@/components/ui/OrbitLogo';
import { formatLongDate, toLocalDateString, useData } from '@/data';
import { createAgendaTask } from '@/domain/agendaLifecycle';
import { markOnboardingCompleted } from '@/features/onboarding/onboardingStorage';
import { triggerHaptic } from '@/lib/haptics';
import { type AgendaTheme, continuousCorner, fonts, useAppTheme } from '@/theme';

type Step = 'outcome' | 'firstTask' | 'ready';

const STEPS: Step[] = ['outcome', 'firstTask', 'ready'];

const PREVIEW_ALL_DAY = ['Finish project', 'Buy groceries'] as const;
const PREVIEW_SCHEDULED = [
  { time: '09:30', title: 'Team meeting' },
  { time: '14:00', title: 'Dentist' },
] as const;
const PREVIEW_ROUTINES = [
  { title: 'Workout', done: true },
  { title: 'Read', done: false },
] as const;

export function OnboardingScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { repos, refresh, settingsStore, ui, setUI } = useData();
  const [step, setStep] = useState<Step>('outcome');
  const [taskTitle, setTaskTitle] = useState('');
  const [createdTitle, setCreatedTitle] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = toLocalDateString();
  const dateLabel = formatLongDate(today);
  const stepIndex = STEPS.indexOf(step);

  const finish = useCallback(async () => {
    await markOnboardingCompleted((key, value) => settingsStore.setItem(key, value));
    setUI({ selectedDate: today, mode: 'today' });
    refresh();
    router.replace('/');
  }, [refresh, setUI, settingsStore, today]);

  const addFirstTask = useCallback(async () => {
    const title = taskTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await createAgendaTask(repos, {
        title,
        date: ui.selectedDate || today,
      });
      triggerHaptic('success');
      setCreatedTitle(title);
      setStep('ready');
    } catch {
      triggerHaptic('error');
    } finally {
      setBusy(false);
    }
  }, [busy, repos, taskTitle, today, ui.selectedDate]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.top}>
        <OrbitLogo color={theme.primary} size={28} stroke={1.8} />
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${((stepIndex + 1) / STEPS.length) * 100}%` }]}
          />
        </View>
      </View>

      <View style={styles.body}>
        {step === 'outcome' ? (
          <Animated.View
            entering={FadeIn.duration(280)}
            exiting={FadeOut.duration(160)}
            style={styles.stage}
          >
            <Text style={styles.brand}>Agenda</Text>
            <Text style={styles.headline}>Your agenda belongs on your phone.</Text>
            <Text style={styles.subhead}>
              Make today feel clear — tasks, plans, routines, and what’s on your calendar. Stored on
              this device. No account. No cloud required.
            </Text>
            <TodayPreview
              dateLabel={dateLabel}
              allDay={[...PREVIEW_ALL_DAY]}
              scheduled={[...PREVIEW_SCHEDULED]}
              routines={[...PREVIEW_ROUTINES]}
              styles={styles}
              theme={theme}
            />
          </Animated.View>
        ) : null}

        {step === 'firstTask' ? (
          <Animated.View entering={FadeInDown.duration(280)} style={styles.stage}>
            <Text style={styles.headline}>What’s one thing you want to get done today?</Text>
            <Text style={styles.subhead}>This becomes a real task on your day — not a demo.</Text>
            <TextInput
              autoFocus
              placeholder="Finish presentation"
              placeholderTextColor={theme.placeholder}
              style={styles.input}
              value={taskTitle}
              onChangeText={setTaskTitle}
              onSubmitEditing={() => void addFirstTask()}
              returnKeyType="done"
            />
          </Animated.View>
        ) : null}

        {step === 'ready' ? (
          <Animated.View entering={FadeInDown.duration(280)} style={styles.stage}>
            <Text style={styles.headline}>Your day is ready.</Text>
            <Text style={styles.subhead}>
              That’s enough to get started. Your day lives here on this phone — private, offline,
              and easy to keep.
            </Text>
            <TodayPreview
              dateLabel={dateLabel}
              allDay={createdTitle ? [createdTitle] : []}
              scheduled={[]}
              routines={[]}
              styles={styles}
              theme={theme}
            />
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.actions}>
        {step === 'outcome' ? (
          <AnimatedPressable
            accessibilityRole="button"
            haptic="medium"
            onPress={() => setStep('firstTask')}
            style={styles.primary}
          >
            <Text style={styles.primaryLabel}>Get started</Text>
          </AnimatedPressable>
        ) : null}

        {step === 'firstTask' ? (
          <>
            <AnimatedPressable
              accessibilityRole="button"
              disabled={!taskTitle.trim() || busy}
              haptic="medium"
              onPress={() => void addFirstTask()}
              style={[styles.primary, (!taskTitle.trim() || busy) && styles.primaryDisabled]}
            >
              {busy ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <Text style={styles.primaryLabel}>Add to today</Text>
              )}
            </AnimatedPressable>
            <AnimatedPressable
              accessibilityRole="button"
              disabled={busy}
              haptic="selection"
              onPress={() => setStep('ready')}
              style={styles.secondary}
            >
              <Text style={styles.secondaryLabel}>Skip for now</Text>
            </AnimatedPressable>
          </>
        ) : null}

        {step === 'ready' ? (
          <AnimatedPressable
            accessibilityRole="button"
            haptic="medium"
            onPress={() => void finish()}
            style={styles.primary}
          >
            <Text style={styles.primaryLabel}>Open my day</Text>
          </AnimatedPressable>
        ) : null}
      </View>
    </View>
  );
}

function TodayPreview({
  dateLabel,
  allDay,
  scheduled,
  routines,
  styles,
  theme,
}: {
  dateLabel: string;
  allDay: string[];
  scheduled: { time: string; title: string }[];
  routines: { title: string; done: boolean }[];
  styles: ReturnType<typeof createStyles>;
  theme: AgendaTheme;
}) {
  return (
    <View style={styles.preview}>
      <Text style={styles.previewDate}>{dateLabel}</Text>

      <View style={styles.previewSection}>
        <View style={styles.previewHeader}>
          <Icon name="orbit" color={theme.primary} size={18} stroke={1.8} />
          <Text style={[styles.previewLabel, { color: theme.primary }]}>ALL DAY</Text>
        </View>
        {allDay.length ? (
          allDay.map((title) => (
            <View key={title} style={styles.previewRow}>
              <Checkbox />
              <Text style={styles.previewTitle}>{title}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.previewEmpty}>Nothing all day yet.</Text>
        )}
      </View>

      {scheduled.length ? (
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>SCHEDULED</Text>
          {scheduled.map((item) => (
            <View key={`${item.time}-${item.title}`} style={styles.previewRow}>
              <Text style={styles.previewTime}>{item.time}</Text>
              <Text style={styles.previewTitle}>{item.title}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {routines.length ? (
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>ROUTINES</Text>
          {routines.map((item) => (
            <View key={item.title} style={styles.previewRow}>
              <Checkbox checked={item.done} />
              <Text style={styles.previewTitle}>{item.title}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: 22,
      justifyContent: 'space-between',
    },
    top: {
      alignItems: 'center',
      gap: 16,
    },
    progressTrack: {
      width: '100%',
      maxWidth: 220,
      height: 4,
      borderRadius: 999,
      backgroundColor: theme.separator,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: theme.primary,
    },
    body: {
      flex: 1,
      justifyContent: 'center',
    },
    stage: {
      gap: 14,
    },
    brand: {
      fontFamily: fonts.serif,
      fontSize: 34,
      lineHeight: 40,
      letterSpacing: -0.5,
      color: theme.text,
      textAlign: 'center',
    },
    headline: {
      fontFamily: fonts.serif,
      fontSize: 30,
      lineHeight: 36,
      letterSpacing: -0.4,
      color: theme.text,
      textAlign: 'center',
    },
    subhead: {
      fontFamily: fonts.sans,
      fontSize: 16,
      lineHeight: 23,
      color: theme.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
    input: {
      marginTop: 8,
      minHeight: 56,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontFamily: fonts.sansMedium,
      fontSize: 17,
      color: theme.text,
      backgroundColor: theme.section,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.separator,
      ...continuousCorner(16),
    },
    preview: {
      marginTop: 10,
      padding: 16,
      gap: 14,
      backgroundColor: theme.section,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.separator,
      ...continuousCorner(20),
    },
    previewDate: {
      fontFamily: fonts.serif,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.3,
      color: theme.text,
    },
    previewSection: {
      gap: 8,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    previewLabel: {
      fontFamily: fonts.sansSemi,
      fontSize: 11,
      letterSpacing: 0.6,
      color: theme.textSecondary,
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 28,
    },
    previewTime: {
      width: 44,
      fontFamily: fonts.sansMedium,
      fontSize: 13,
      color: theme.textSecondary,
    },
    previewTitle: {
      flex: 1,
      fontFamily: fonts.sansMedium,
      fontSize: 15,
      color: theme.text,
    },
    previewEmpty: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: theme.textSecondary,
    },
    actions: {
      gap: 8,
    },
    primary: {
      minHeight: 54,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      ...continuousCorner(16),
    },
    primaryDisabled: {
      opacity: 0.4,
    },
    primaryLabel: {
      fontFamily: fonts.sansSemi,
      fontSize: 16,
      color: theme.onPrimary,
    },
    secondary: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryLabel: {
      fontFamily: fonts.sansMedium,
      fontSize: 15,
      color: theme.textSecondary,
    },
  });
}
