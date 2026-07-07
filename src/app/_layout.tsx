import {
  Fraunces_300Light,
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  Literata_400Regular,
  Literata_400Regular_Italic,
  Literata_500Medium,
  Literata_600SemiBold,
} from '@expo-google-fonts/literata';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { useContentStore } from '@/content/store';
import { configureNotificationHandler, rebuildQueue } from '@/notifications/scheduler';
import { useUserStore } from '@/store/userStore';
import { color } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotificationHandler();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_300Light,
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_400Regular_Italic,
    Literata_400Regular,
    Literata_400Regular_Italic,
    Literata_500Medium,
    Literata_600SemiBold,
  });

  const contentHydrated = useContentStore((s) => s.hydrated);
  const hydrate = useContentStore((s) => s.hydrate);
  const sync = useContentStore((s) => s.sync);
  const words = useContentStore((s) => s.words);

  const [userHydrated, setUserHydrated] = useState(useUserStore.persist.hasHydrated());
  const onboarded = useUserStore((s) => s.onboarded);
  const notifTime = useUserStore((s) => s.notifTime);
  const notifEnabled = useUserStore((s) => s.notifEnabled);

  useEffect(() => useUserStore.persist.onFinishHydration(() => setUserHydrated(true)), []);

  // Boot: load cached content, then check for new words.
  useEffect(() => {
    void hydrate().then(() => void sync());
  }, [hydrate, sync]);

  // Foreground: probe for content changes (DESIGN.md §6.3).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => sub.remove();
  }, [sync]);

  // Rebuild the notification queue whenever its inputs change — words synced,
  // time changed, toggle flipped, or a fresh foreground (DESIGN.md §8).
  useEffect(() => {
    if (!userHydrated || !contentHydrated || !onboarded) return;
    void rebuildQueue({ words, time: notifTime, enabled: notifEnabled });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void rebuildQueue({ words, time: notifTime, enabled: notifEnabled });
    });
    return () => sub.remove();
  }, [userHydrated, contentHydrated, onboarded, words, notifTime, notifEnabled]);

  // Notification tap → Today (also covers cold starts via the last response).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.navigate('/');
    });
    return () => sub.remove();
  }, []);

  const ready = fontsLoaded && contentHydrated && userHydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.paper },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="word/[slug]" />
        <Stack.Screen
          name="share/[slug]"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
