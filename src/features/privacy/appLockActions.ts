import { Alert } from 'react-native';

export async function requestAppLockChange({
  enabled,
  biometricsReady,
  setEnabled,
  onFailure,
}: {
  enabled: boolean;
  biometricsReady: boolean;
  setEnabled: (enabled: boolean) => Promise<boolean>;
  onFailure: () => void;
}): Promise<void> {
  if (enabled && !biometricsReady) {
    Alert.alert(
      'Device authentication required',
      'Set up Face ID, Touch ID, fingerprint, or a device passcode in system Settings, then try again.',
    );
    return;
  }

  const ok = await setEnabled(enabled);
  if (!ok && enabled) {
    onFailure();
  }
}
