import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatTime, TimeControl } from '@/components/TimeControl';
import { BOOK_URL, BOOK_URL_LABEL } from '@/config';
import { requestPermission } from '@/notifications/scheduler';
import { useUserStore } from '@/store/userStore';
import { color, font, letterSpacing, space, type } from '@/theme/tokens';

export default function SettingsScreen() {
  const notifTime = useUserStore((s) => s.notifTime);
  const notifEnabled = useUserStore((s) => s.notifEnabled);
  const setNotifTime = useUserStore((s) => s.setNotifTime);
  const setNotifEnabled = useUserStore((s) => s.setNotifEnabled);

  const onToggle = async (next: boolean) => {
    if (!next) {
      setNotifEnabled(false);
      return;
    }
    const granted = await requestPermission();
    if (granted) {
      setNotifEnabled(true);
    } else if (Platform.OS !== 'web') {
      Alert.alert(
        'Notifications are off',
        'Enable notifications for Emotionary in system settings to get your daily word.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => void Linking.openSettings() },
        ],
      );
    }
  };

  // The queue rebuild reacts to these store changes automatically (root layout).
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">
          Settings
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Close settings"
          hitSlop={10}
        >
          <Text style={styles.closeGlyph}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>DAILY WORD</Text>
        <View style={styles.cardBlock}>
          <View style={styles.toggleRow}>
            <Text style={styles.rowLabel}>One word, every day</Text>
            <Switch
              value={notifEnabled}
              onValueChange={(v) => void onToggle(v)}
              trackColor={{ true: color.ink }}
              accessibilityLabel="Daily word notification"
            />
          </View>
          {notifEnabled && (
            <>
              <TimeControl value={notifTime} onChange={setNotifTime} />
              <Text style={styles.note}>
                Delivered around {formatTime(notifTime)} each day.
              </Text>
            </>
          )}
        </View>

        {/*
          Reserved slot: "Restore Purchases" row appears here the day
          RevenueCat ships (required by Apple once IAP exists) — DESIGN.md §9.
        */}

        <Text style={styles.section}>THE BOOK</Text>
        <View style={styles.cardBlock}>
          <Text style={styles.about}>
            Emotionary is a companion to the original collection — words for feelings you've felt
            but never named.
          </Text>
          <Pressable onPress={() => Linking.openURL(BOOK_URL)} accessibilityRole="link">
            <Text style={styles.link}>GET THE BOOK → {BOOK_URL_LABEL.toUpperCase()}</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  headerRow: { marginTop: space.m },
  title: { fontFamily: font.display, fontSize: type.title, color: color.ink, textAlign: 'center' },
  close: {
    position: 'absolute',
    right: space.l,
    top: 6,
    minWidth: 44,
    minHeight: 32,
    alignItems: 'flex-end',
  },
  closeGlyph: { fontSize: 18, color: color.inkMuted },
  scroll: { paddingHorizontal: space.l, paddingBottom: space.xl },
  section: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
    marginTop: space.xl,
    marginBottom: space.s,
  },
  cardBlock: {
    backgroundColor: color.card,
    borderColor: color.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: space.m,
    gap: space.s,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontFamily: font.serif, fontSize: type.body, color: color.ink },
  note: {
    fontFamily: font.serifItalic,
    fontSize: type.caption,
    color: color.inkMuted,
    textAlign: 'center',
  },
  about: {
    fontFamily: font.serif,
    fontSize: type.small,
    lineHeight: type.small * 1.5,
    color: color.ink,
  },
  link: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.ink,
    textDecorationLine: 'underline',
    marginTop: space.s,
  },
  version: {
    fontFamily: font.serif,
    fontSize: type.caption,
    color: color.inkFaint,
    textAlign: 'center',
    marginTop: space.xxl,
  },
});
