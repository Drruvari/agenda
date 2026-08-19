import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus, StyleSheet, View } from 'react-native';

import { useData } from '@/data/provider/DataContext';
import {
  disableAppSwitcherPrivacy,
  enableAppSwitcherPrivacy,
} from '@/native/security/appSwitcherPrivacy';
import { authenticateApp, canAuthenticate } from '@/native/security/biometrics';

import { AppLockScreen } from './AppLockScreen';
import { setNotificationPreviewMode } from './notificationPrivacy';
import {
  loadAppLockPreferences,
  saveAppLockDelay,
  saveAppLockEnabled,
  saveNotificationPreview,
} from './storage';
import {
  type AppLockPreferences,
  DEFAULT_APP_LOCK_PREFERENCES,
  type LockDelay,
  lockDelayToMs,
  type NotificationPreviewMode,
} from './types';

type AppLockContextValue = {
  prefs: AppLockPreferences;
  locked: boolean;
  biometricsReady: boolean;
  setEnabled: (enabled: boolean) => Promise<boolean>;
  setDelay: (delay: LockDelay) => Promise<void>;
  setNotificationPreview: (mode: NotificationPreviewMode) => Promise<void>;
  unlock: () => Promise<boolean>;
};

const AppLockContext = createContext<AppLockContextValue | null>(null);

export function useAppLock(): AppLockContextValue {
  const value = useContext(AppLockContext);
  if (!value) {
    throw new Error('useAppLock must be used within AppLockProvider');
  }
  return value;
}

export function AppLockProvider({ children }: PropsWithChildren) {
  const { settingsStore } = useData();
  const [prefs, setPrefs] = useState<AppLockPreferences>(DEFAULT_APP_LOCK_PREFERENCES);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [biometricsReady, setBiometricsReady] = useState(false);

  const backgroundedAt = useRef<number | null>(null);
  const authenticatingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const [loaded, authAvailable] = await Promise.all([
        loadAppLockPreferences(settingsStore),
        canAuthenticate(),
      ]);
      if (cancelled) return;

      setPrefs(loaded);
      setBiometricsReady(authAvailable);
      setNotificationPreviewMode(loaded.notificationPreview);

      if (loaded.enabled) {
        setLocked(true);
        await enableAppSwitcherPrivacy();
      }

      setReady(true);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [settingsStore]);

  const unlock = useCallback(async () => {
    if (authenticatingRef.current) return false;
    authenticatingRef.current = true;
    setAuthenticating(true);
    try {
      const ok = await authenticateApp();
      if (ok) setLocked(false);
      return ok;
    } finally {
      authenticatingRef.current = false;
      setAuthenticating(false);
    }
  }, []);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const available = await canAuthenticate();
        if (!available) {
          setBiometricsReady(false);
          return false;
        }
        const ok = await authenticateApp();
        if (!ok) return false;
        await saveAppLockEnabled(settingsStore, true);
        await enableAppSwitcherPrivacy();
        setPrefs((current) => ({ ...current, enabled: true }));
        setBiometricsReady(true);
        setLocked(false);
        return true;
      }

      const ok = locked ? await unlock() : await authenticateApp();
      if (!ok) return false;

      await saveAppLockEnabled(settingsStore, false);
      await disableAppSwitcherPrivacy();
      setPrefs((current) => ({ ...current, enabled: false }));
      setLocked(false);
      return true;
    },
    [locked, settingsStore, unlock],
  );

  const setDelay = useCallback(
    async (delay: LockDelay) => {
      await saveAppLockDelay(settingsStore, delay);
      setPrefs((current) => ({ ...current, delay }));
    },
    [settingsStore],
  );

  const setNotificationPreview = useCallback(
    async (mode: NotificationPreviewMode) => {
      await saveNotificationPreview(settingsStore, mode);
      setNotificationPreviewMode(mode);
      setPrefs((current) => ({ ...current, notificationPreview: mode }));
    },
    [settingsStore],
  );

  useEffect(() => {
    if (!ready) return;

    const { enabled, delay } = prefs;

    const onChange = (next: AppStateStatus) => {
      // Only use `background` — `inactive` fires for Face ID sheets and causes loops.
      if (next === 'background') {
        if (!enabled) {
          backgroundedAt.current = null;
          return;
        }
        backgroundedAt.current = Date.now();
        if (delay === 'immediately') {
          setLocked(true);
        }
        return;
      }

      if (next !== 'active') return;
      if (!enabled) return;
      if (authenticatingRef.current) return;

      const started = backgroundedAt.current;
      backgroundedAt.current = null;
      if (started == null) return;

      const elapsed = Date.now() - started;
      if (elapsed >= lockDelayToMs(delay)) {
        setLocked(true);
      }
    };

    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [prefs, ready]);

  useEffect(() => {
    if (!ready || !locked || !prefs.enabled) return;
    if (authenticatingRef.current) return;

    const timer = setTimeout(() => {
      void unlock();
    }, 350);

    return () => clearTimeout(timer);
  }, [locked, prefs.enabled, ready, unlock]);

  const value = useMemo<AppLockContextValue>(
    () => ({
      prefs,
      locked: prefs.enabled && locked,
      biometricsReady,
      setEnabled,
      setDelay,
      setNotificationPreview,
      unlock,
    }),
    [prefs, locked, biometricsReady, setEnabled, setDelay, setNotificationPreview, unlock],
  );

  if (!ready) {
    return <View style={styles.fill} />;
  }

  return (
    <AppLockContext.Provider value={value}>
      <View style={styles.fill}>
        {children}
        {prefs.enabled && locked ? (
          <AppLockScreen authenticating={authenticating} onUnlock={() => void unlock()} />
        ) : null}
      </View>
    </AppLockContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
