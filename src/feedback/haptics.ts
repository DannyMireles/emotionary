import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function run(effect: () => Promise<void>): void {
  if (Platform.OS === 'web') return;
  void effect().catch(() => {});
}

export function selectionHaptic(): void {
  run(() => Haptics.selectionAsync());
}

export function lightImpactHaptic(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function successHaptic(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warningHaptic(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
