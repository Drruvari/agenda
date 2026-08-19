export async function canAuthenticate(): Promise<boolean> {
  return false;
}

export async function biometricAvailable(): Promise<boolean> {
  return false;
}

export async function authenticateApp(): Promise<boolean> {
  return false;
}
