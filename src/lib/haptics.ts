import * as Haptics from 'expo-haptics';

export type HapticFeedback = 'selection' | 'light' | 'medium' | 'success' | 'warning' | 'error';

export function triggerHaptic(feedback: HapticFeedback) {
  let effect: Promise<void>;

  switch (feedback) {
    case 'selection':
      effect = Haptics.selectionAsync();
      break;
    case 'light':
      effect = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      effect = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'success':
      effect = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      effect = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'error':
      effect = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
  }

  void effect.catch(() => undefined);
}
