import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type LocalAuthenticationModule = typeof import('expo-local-authentication');

let cached: LocalAuthenticationModule | null | undefined;

/**
 * Probe the native binary before importing the JS package.
 * `require('expo-local-authentication')` calls `requireNativeModule`, which throws
 * (and redboxes) when the module isn't linked — e.g. Expo Go or a stale dev client.
 */
function getLocalAuthentication(): LocalAuthenticationModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === 'web') {
    cached = null;
    return cached;
  }

  if (!requireOptionalNativeModule('ExpoLocalAuthentication')) {
    cached = null;
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-local-authentication') as LocalAuthenticationModule;
  } catch {
    cached = null;
  }
  return cached;
}

/** True when the device can authenticate (biometrics and/or device PIN). */
export async function canAuthenticate(): Promise<boolean> {
  const LocalAuthentication = getLocalAuthentication();
  if (!LocalAuthentication) return false;

  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

/** True when strong biometrics (Face ID / fingerprint) are available and enrolled. */
export async function biometricAvailable(): Promise<boolean> {
  const LocalAuthentication = getLocalAuthentication();
  if (!LocalAuthentication) return false;

  try {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hardware && enrolled;
  } catch {
    return false;
  }
}

export async function authenticateApp(): Promise<boolean> {
  const LocalAuthentication = getLocalAuthentication();
  if (!LocalAuthentication) return false;

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Agenda',
      promptSubtitle: 'Authenticate to access your agenda',
      biometricsSecurityLevel: 'strong',
      disableDeviceFallback: false,
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch {
    return false;
  }
}
