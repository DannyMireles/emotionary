import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useUserStore } from '@/store/userStore';

function run(effect: () => Promise<void>): void {
  if (Platform.OS === 'web' || !useUserStore.getState().hapticsEnabled) return;
  void effect().catch(() => {});
}

export function selectionHaptic(): void {
  run(() => Haptics.selectionAsync());
}

export function lightImpactHaptic(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function mediumImpactHaptic(): void {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function successHaptic(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warningHaptic(): void {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
