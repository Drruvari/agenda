import { requireOptionalNativeModule } from 'expo-modules-core';

type ScreenCaptureModule = typeof import('expo-screen-capture');

const PROTECTION_KEY = 'agenda-app-lock';

let cached: ScreenCaptureModule | null | undefined;

async function getScreenCapture(): Promise<ScreenCaptureModule | null> {
  if (cached !== undefined) {
    return cached;
  }

  if (!requireOptionalNativeModule('ExpoScreenCapture')) {
    cached = null;
    return cached;
  }

  try {
    cached = await import('expo-screen-capture');
  } catch {
    cached = null;
  }

  return cached;
}

export async function enableAppSwitcherPrivacy(): Promise<void> {
  const screenCapture = await getScreenCapture();
  if (!screenCapture) return;

  try {
    await screenCapture.preventScreenCaptureAsync(PROTECTION_KEY);
  } catch {
    // Best-effort privacy protection.
  }
}

export async function disableAppSwitcherPrivacy(): Promise<void> {
  const screenCapture = await getScreenCapture();
  if (!screenCapture) return;

  try {
    await screenCapture.allowScreenCaptureAsync(PROTECTION_KEY);
  } catch {
    // Best-effort privacy protection.
  }
}
