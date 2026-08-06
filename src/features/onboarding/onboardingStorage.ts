export const ONBOARDING_COMPLETED_KEY = 'onboarding.v2.completed';

export async function isOnboardingCompleted(
  getItem: (key: string) => Promise<string | null>,
): Promise<boolean> {
  return (await getItem(ONBOARDING_COMPLETED_KEY)) === 'true';
}

export async function markOnboardingCompleted(
  setItem: (key: string, value: string) => Promise<void>,
): Promise<void> {
  await setItem(ONBOARDING_COMPLETED_KEY, 'true');
}
