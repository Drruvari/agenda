import 'react-native-gesture-handler';

// Polyfill missing TurboModule methods on stale Android binaries (seen on Samsung).
// Safe no-ops when the native module is already complete (Pixel / fresh builds).
try {
  const mod = require('react-native-gesture-handler/lib/module/RNGestureHandlerModule').default;
  if (mod) {
    if (typeof mod.install !== 'function') {
      mod.install = () => {};
    }
    if (typeof mod.flushOperations !== 'function') {
      mod.flushOperations = () => {};
    }
  }
} catch {
  // ignore — Metro may resolve the module differently
}

// eslint-disable-next-line import/first -- must load after gesture-handler + polyfill
import 'expo-router/entry';
