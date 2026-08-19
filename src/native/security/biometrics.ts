import { requireOptionalNativeModule } from 'expo-modules-core';

type LocalAuthenticationModule = typeof import('expo-local-authentication');

let cached: LocalAuthenticationModule | null | undefined;

async function getLocalAuthentication(): Promise<LocalAuthenticationModule | null> {
  if (cached !== undefined) {
    return cached;
  }

  if (!requireOptionalNativeModule('ExpoLocalAuthentication')) {
    cached = null;
    return cached;
  }

  try {
    cached = await import('expo-local-authentication');
  } catch {
    cached = null;
  }

  return cached;
}

export async function canAuthenticate(): Promise<boolean> {
  const localAuthentication = await getLocalAuthentication();

  if (!localAuthentication) {
    return false;
  }

  try {
    const level = await localAuthentication.getEnrolledLevelAsync();
    return level !== localAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

export async function biometricAvailable(): Promise<boolean> {
  const localAuthentication = await getLocalAuthentication();

  if (!localAuthentication) {
    return false;
  }

  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      localAuthentication.hasHardwareAsync(),
      localAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

export async function authenticateApp(): Promise<boolean> {
  const localAuthentication = await getLocalAuthentication();

  if (!localAuthentication) {
    return false;
  }

  try {
    const result = await localAuthentication.authenticateAsync({
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
