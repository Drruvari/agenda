import { useRouter, useSegments } from 'expo-router';
import { type PropsWithChildren, useEffect } from 'react';

import { useData } from '@/data/provider/DataContext';
import { isOnboardingCompleted } from '@/features/onboarding/onboardingStorage';

/**
 * Redirects first-launch users to /onboarding until they finish or skip the flow.
 */
export function OnboardingGate({ children }: PropsWithChildren) {
  const { settingsStore } = useData();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const completed = await isOnboardingCompleted((key) => settingsStore.getItem(key));
      if (cancelled) return;

      const onOnboarding = segments.some((segment) => segment === 'onboarding');
      if (!completed && !onOnboarding) {
        router.replace('/onboarding');
      } else if (completed && onOnboarding) {
        router.replace('/');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, segments, settingsStore]);

  return children;
}
