import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientInk } from '@/components/AmbientInk';
import { SystemIcon } from '@/components/system-icon';
import { formatTime, TimeControl } from '@/components/TimeControl';
import { BOOK_URL, BOOK_URL_LABEL } from '@/config';
import { lightImpactHaptic, selectionHaptic, warningHaptic } from '@/feedback/haptics';
import { requestPermission } from '@/notifications/scheduler';
import { useUserStore } from '@/store/userStore';
import { color, font, letterSpacing, levelPalettes, space, type } from '@/theme/tokens';

export default function SettingsScreen() {
  const notifTime = useUserStore((state) => state.notifTime);
  const notifEnabled = useUserStore((state) => state.notifEnabled);
  const setNotifTime = useUserStore((state) => state.setNotifTime);
  const setNotifEnabled = useUserStore((state) => state.setNotifEnabled);

  const onToggle = async (next: boolean) => {
    selectionHaptic();
    if (!next) {
      setNotifEnabled(false);
      return;
    }
    const granted = await requestPermission();
    if (granted) {
      setNotifEnabled(true);
    } else if (process.env.EXPO_OS !== 'web') {
      warningHaptic();
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

  const showWidgetInstructions = () => {
    selectionHaptic();
    Alert.alert(
      'Add the Emotionary widget',
      'Touch and hold your Home or Lock Screen, tap Customize or +, then choose Emotionary.',
      [{ text: 'Got it' }],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AmbientInk />
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => {
            selectionHaptic();
            router.back();
          }}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <SystemIcon name="arrow.left" fallback="←" size={20} color={color.ink} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Settings
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>Make your daily ritual feel like yours.</Text>

        <Text style={styles.section}>DAILY WORD</Text>
        <View style={styles.cardBlock}>
          <View style={styles.toggleRow}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>One word, every day</Text>
              <Text style={styles.rowDescription}>A quiet reminder at the time you choose.</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={(value) => void onToggle(value)}
              trackColor={{ false: color.hairline, true: color.ink }}
              thumbColor={color.card}
              accessibilityLabel="Daily word notification"
            />
          </View>
          {notifEnabled && (
            <View style={styles.timeBlock}>
              <TimeControl value={notifTime} onChange={setNotifTime} />
              <Text style={styles.note}>Delivered around {formatTime(notifTime)} each day.</Text>
            </View>
          )}
        </View>

        <Text style={styles.section}>WIDGETS</Text>
        <View style={[styles.cardBlock, styles.widgetBlock]}>
          <View style={styles.widgetPreviews} accessibilityElementsHidden>
            <View style={styles.homeWidget}>
              <View style={styles.widgetOrb} />
              <Text style={styles.widgetWord}>Apricity</Text>
              <Text style={styles.widgetDefinition}>The warmth of winter sunlight.</Text>
            </View>
            <View style={styles.lockWidget}>
              <Text style={styles.lockTime}>11:19</Text>
              <Text style={styles.lockWord}>Apricity</Text>
              <Text style={styles.lockPronunciation}>[uh-PRIS-ih-tee]</Text>
            </View>
          </View>
          <Text style={styles.widgetTitle}>Home & Lock Screen</Text>
          <Text style={styles.widgetCopy}>Keep the day&apos;s word close without opening the app.</Text>
          <Pressable
            onPress={showWidgetInstructions}
            style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.outlineButtonText}>HOW TO ADD THE WIDGET</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>THE BOOK</Text>
        <View style={styles.cardBlock}>
          <Text style={styles.bookTitle}>Emotionary</Text>
          <Text style={styles.about}>
            A companion to the original collection: words for feelings you&apos;ve felt but never
            named.
          </Text>
          <Pressable
            onPress={() => {
              lightImpactHaptic();
              void Linking.openURL(BOOK_URL);
            }}
            accessibilityRole="link"
          >
            <Text style={styles.link}>GET THE BOOK → {BOOK_URL_LABEL.toUpperCase()}</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '1.1.0'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  headerRow: {
    minHeight: 50,
    paddingHorizontal: space.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  title: { fontFamily: font.display, fontSize: type.title, color: color.ink, textAlign: 'center' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: space.l, paddingTop: space.s, paddingBottom: space.xxl, gap: space.s },
  intro: {
    fontFamily: font.serifItalic,
    fontSize: type.small,
    lineHeight: 21,
    color: color.inkMuted,
    textAlign: 'center',
    paddingHorizontal: space.l,
    paddingBottom: space.m,
  },
  section: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
    paddingTop: space.l,
  },
  cardBlock: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderColor: color.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: space.m,
    gap: space.s,
    boxShadow: '0 8px 24px rgba(67, 52, 35, 0.05)',
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m },
  rowCopy: { flex: 1 },
  rowLabel: { fontFamily: font.serifSemiBold, fontSize: type.body, color: color.ink },
  rowDescription: { fontFamily: font.serif, fontSize: type.caption, lineHeight: 18, color: color.inkMuted, marginTop: 3 },
  timeBlock: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hairline, paddingTop: space.s },
  note: { fontFamily: font.serifItalic, fontSize: type.caption, color: color.inkMuted, textAlign: 'center' },
  widgetBlock: { alignItems: 'center' },
  widgetPreviews: { flexDirection: 'row', gap: space.m, paddingBottom: space.s },
  homeWidget: {
    width: 112,
    height: 112,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: levelPalettes[1].tint,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.s,
  },
  widgetOrb: { width: 25, height: 25, borderRadius: 13, backgroundColor: levelPalettes[3].deep, marginBottom: 4 },
  widgetWord: { fontFamily: font.display, fontSize: type.small, color: color.ink },
  widgetDefinition: { fontFamily: font.serif, fontSize: 7, lineHeight: 9, color: color.inkMuted, textAlign: 'center' },
  lockWidget: {
    width: 112,
    height: 112,
    borderRadius: 25,
    borderCurve: 'continuous',
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTime: { fontFamily: font.display, fontSize: 22, color: color.paper },
  lockWord: { fontFamily: font.serifSemiBold, fontSize: type.caption, color: color.paper, marginTop: 3 },
  lockPronunciation: { fontFamily: font.serif, fontSize: 8, color: 'rgba(255,255,255,0.68)' },
  widgetTitle: { fontFamily: font.display, fontSize: type.body + 1, color: color.ink },
  widgetCopy: { fontFamily: font.serif, fontSize: type.caption, lineHeight: 18, color: color.inkMuted, textAlign: 'center' },
  outlineButton: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: color.ink,
    paddingHorizontal: space.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.s,
  },
  outlineButtonText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.ink,
  },
  bookTitle: { fontFamily: font.display, fontSize: type.body + 1, color: color.ink },
  about: { fontFamily: font.serif, fontSize: type.small, lineHeight: 21, color: color.ink },
  link: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.ink,
    textDecorationLine: 'underline',
    marginTop: space.s,
  },
  version: { fontFamily: font.serif, fontSize: type.caption, color: color.inkFaint, textAlign: 'center', paddingTop: space.xl },
  pressed: { opacity: 0.72 },
});
