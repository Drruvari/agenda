import { requireOptionalNativeModule } from 'expo-modules-core';

type ScreenCaptureModule = typeof import('expo-screen-capture');

const APP_SWITCHER_BLUR_INTENSITY = 0.85;

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
    await screenCapture.enableAppSwitcherProtectionAsync(APP_SWITCHER_BLUR_INTENSITY);
  } catch {
    // Best-effort privacy protection.
  }
}

export async function disableAppSwitcherPrivacy(): Promise<void> {
  const screenCapture = await getScreenCapture();
  if (!screenCapture) return;

  try {
    await screenCapture.disableAppSwitcherProtectionAsync();
  } catch {
    // Best-effort privacy protection.
  }
}
