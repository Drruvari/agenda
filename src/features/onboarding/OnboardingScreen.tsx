import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Icon, type IconName } from '@/components/ui/Icon';
import { OrbitLogo } from '@/components/ui/OrbitLogo';
import { useData } from '@/data';
import { markOnboardingCompleted } from '@/features/onboarding/onboardingStorage';
import { requestCalendarAccess } from '@/native/calendar/deviceCalendar';
import { requestReminderAccess } from '@/native/notifications/reminders';
import {
  requestSystemReminderAccess,
  systemRemindersSupported,
} from '@/native/reminders/systemReminders';
import { type AgendaTheme, continuousCorner, fonts, useAppTheme } from '@/theme';

type StepId = 'calendar' | 'reminders' | 'notifications';

type Step = {
  id: StepId;
  icon: IconName;
  title: string;
  body: string;
  allowLabel: string;
  request: () => Promise<unknown>;
};

function buildSteps(): Step[] {
  const steps: Step[] = [
    {
      id: 'calendar',
      icon: 'calendar',
      title: 'Calendar',
      body: 'Show meetings and events, including birthdays from your Birthdays calendar.',
      allowLabel: 'Allow calendar',
      request: () => requestCalendarAccess(),
    },
  ];

  if (systemRemindersSupported && Platform.OS === 'ios') {
    steps.push({
      id: 'reminders',
      icon: 'checklist',
      title: 'Apple Reminders',
      body: 'Show incomplete Apple Reminders on the day they’re due.',
      allowLabel: 'Allow Reminders',
      request: () => requestSystemReminderAccess(),
    });
  }

  steps.push({
    id: 'notifications',
    icon: 'bell',
    title: 'Notifications',
    body: 'Get Agenda’s own local alerts for timed tasks you create in the app.',
    allowLabel: 'Allow notifications',
    request: () => requestReminderAccess(),
  });

  return steps;
}

export function OnboardingScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { settingsStore, refresh } = useData();
  const steps = useMemo(() => buildSteps(), []);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const step = steps[index]!;
  const isLast = index >= steps.length - 1;

  const finish = useCallback(async () => {
    await markOnboardingCompleted((key, value) => settingsStore.setItem(key, value));
    refresh();
    router.replace('/');
  }, [refresh, settingsStore]);

  const goNext = useCallback(async () => {
    if (isLast) {
      await finish();
      return;
    }
    setIndex((current) => current + 1);
  }, [finish, isLast]);

  const onAllow = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await step.request();
      await goNext();
    } finally {
      setBusy(false);
    }
  }, [busy, goNext, step]);

  const onSkip = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await goNext();
    } finally {
      setBusy(false);
    }
  }, [busy, goNext]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.brand}>
        <OrbitLogo color={theme.primary} size={36} stroke={1.8} />
        <Text style={styles.brandName}>Agenda</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Icon name={step.icon} color={theme.primary} size={28} stroke={1.7} />
        </View>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>
      </View>

      <View style={styles.dots}>
        {steps.map((entry, stepIndex) => (
          <View
            key={entry.id}
            style={[styles.dot, stepIndex === index ? styles.dotActive : null]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <AnimatedPressable
          accessibilityRole="button"
          disabled={busy}
          haptic="medium"
          onPress={() => void onAllow()}
          style={styles.primary}
        >
          <Text style={styles.primaryLabel}>{step.allowLabel}</Text>
        </AnimatedPressable>
        <AnimatedPressable
          accessibilityRole="button"
          disabled={busy}
          haptic="selection"
          onPress={() => void onSkip()}
          style={styles.secondary}
        >
          <Text style={styles.secondaryLabel}>{isLast ? 'Finish' : 'Not now'}</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: 24,
      justifyContent: 'space-between',
    },
    brand: {
      alignItems: 'center',
      gap: 10,
    },
    brandName: {
      fontFamily: fonts.serif,
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.4,
      color: theme.text,
    },
    card: {
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 8,
    },
    iconWrap: {
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.section,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.separator,
      ...continuousCorner(20),
      marginBottom: 8,
    },
    title: {
      fontFamily: fonts.sansSemi,
      fontSize: 26,
      lineHeight: 32,
      letterSpacing: -0.3,
      color: theme.text,
      textAlign: 'center',
    },
    body: {
      fontFamily: fonts.sans,
      fontSize: 16,
      lineHeight: 24,
      color: theme.textSecondary,
      textAlign: 'center',
      maxWidth: 320,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.separator,
    },
    dotActive: {
      backgroundColor: theme.primary,
      width: 18,
    },
    actions: {
      gap: 10,
    },
    primary: {
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      ...continuousCorner(16),
    },
    primaryLabel: {
      fontFamily: fonts.sansSemi,
      fontSize: 16,
      color: theme.onPrimary,
    },
    secondary: {
      minHeight: 48,
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
