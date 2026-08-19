import * as Haptics from 'expo-haptics';

export type HapticFeedback = 'selection' | 'light' | 'medium' | 'success' | 'warning' | 'error';

function getHapticEffect(feedback: HapticFeedback): Promise<void> {
  switch (feedback) {
    case 'selection':
      return Haptics.selectionAsync();

    case 'light':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    case 'medium':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    case 'success':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    case 'warning':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    case 'error':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

export function triggerHaptic(feedback: HapticFeedback): void {
  void getHapticEffect(feedback).catch(() => undefined);
}
