import { router } from 'expo-router';
import { useEffect } from 'react';

export function leaveCurrentRoute(fallback = '/') {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback as never);
}

export function useOpenThenLeave(open: () => void, fallback = '/') {
  useEffect(() => {
    open();
    leaveCurrentRoute(fallback);
  }, [fallback, open]);
}
