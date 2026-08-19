import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type ScreenCaptureModule = typeof import('expo-screen-capture');

const PROTECTION_KEY = 'agenda-app-lock';
const APP_SWITCHER_BLUR_INTENSITY = 0.85;

let cached: ScreenCaptureModule | null | undefined;

async function getScreenCapture(): Promise<ScreenCaptureModule | null> {
  if (cached !== undefined) {
    return cached;
  }

  if (Platform.OS === 'web' || !requireOptionalNativeModule('ExpoScreenCapture')) {
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

  if (!screenCapture) {
    return;
  }

  try {
    if (Platform.OS === 'ios') {
      await screenCapture.enableAppSwitcherProtectionAsync(APP_SWITCHER_BLUR_INTENSITY);
      return;
    }

    await screenCapture.preventScreenCaptureAsync(PROTECTION_KEY);
  } catch {
    // Best-effort privacy protection.
  }
}

export async function disableAppSwitcherPrivacy(): Promise<void> {
  const screenCapture = await getScreenCapture();

  if (!screenCapture) {
    return;
  }

  try {
    if (Platform.OS === 'ios') {
      await screenCapture.disableAppSwitcherProtectionAsync();
      return;
    }

    await screenCapture.allowScreenCaptureAsync(PROTECTION_KEY);
  } catch {
    // Best-effort privacy protection.
  }
}
