import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type ScreenCaptureModule = typeof import('expo-screen-capture');

const PROTECTION_KEY = 'agenda-app-lock';

let cached: ScreenCaptureModule | null | undefined;

function getScreenCapture(): ScreenCaptureModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === 'web') {
    cached = null;
    return cached;
  }

  if (!requireOptionalNativeModule('ExpoScreenCapture')) {
    cached = null;
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-screen-capture') as ScreenCaptureModule;
  } catch {
    cached = null;
  }
  return cached;
}

/**
 * Hide agenda content in the app switcher / recent apps.
 * iOS: blur overlay via enableAppSwitcherProtectionAsync.
 * Android: FLAG_SECURE via preventScreenCaptureAsync (blank recent-apps preview).
 */
export async function enableAppSwitcherPrivacy(): Promise<void> {
  const ScreenCapture = getScreenCapture();
  if (!ScreenCapture) return;

  try {
    if (Platform.OS === 'ios') {
      await ScreenCapture.enableAppSwitcherProtectionAsync(0.85);
    } else {
      await ScreenCapture.preventScreenCaptureAsync(PROTECTION_KEY);
    }
  } catch {
    // Native module missing (e.g. Expo Go edge cases) — fail soft.
  }
}

export async function disableAppSwitcherPrivacy(): Promise<void> {
  const ScreenCapture = getScreenCapture();
  if (!ScreenCapture) return;

  try {
    if (Platform.OS === 'ios') {
      await ScreenCapture.disableAppSwitcherProtectionAsync();
    } else {
      await ScreenCapture.allowScreenCaptureAsync(PROTECTION_KEY);
    }
  } catch {
    // ignore
  }
}
