import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatTime, TimeControl } from '@/components/TimeControl';
import { lightImpactHaptic, selectionHaptic, successHaptic } from '@/feedback/haptics';
import { requestPermission } from '@/notifications/scheduler';
import { useUserStore } from '@/store/userStore';
import { color, font, letterSpacing, space, type } from '@/theme/tokens';

/**
 * First-run onboarding — DESIGN.md §5.6: brand moment → time picker with a
 * contextual permission ask. Skippable, no account, no paywall, no email.
 */
export default function OnboardingScreen() {
  const [step, setStep] = useState<0 | 1>(0);
  const notifTime = useUserStore((s) => s.notifTime);
  const setNotifTime = useUserStore((s) => s.setNotifTime);
  const setNotifEnabled = useUserStore((s) => s.setNotifEnabled);
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);

  const finish = () => {
    successHaptic();
    completeOnboarding();
    router.replace('/');
  };

  const enableAndFinish = async () => {
    const granted = await requestPermission();
    setNotifEnabled(granted);
    finish();
  };

  return (
    <SafeAreaView style={styles.screen}>
      {step === 0 ? (
        <View style={styles.body}>
          <View style={styles.center}>
            <Text style={styles.glyph}>✳</Text>
            <Text style={styles.wordmark}>EMOTIONARY</Text>
            <Text style={styles.tagline}>
              Words for feelings you&apos;ve felt{'\n'}but never named.
            </Text>
          </View>
          <Pressable
            style={styles.primary}
            onPress={() => {
              selectionHaptic();
              setStep(1);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>BEGIN</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.center}>
            <Text style={styles.stepTitle}>One word, every day.</Text>
            <Text style={styles.stepBody}>
              A single word arrives each morning. Pick your time.
            </Text>
            <View style={styles.pickerWrap}>
              <TimeControl value={notifTime} onChange={setNotifTime} />
            </View>
            <Text style={styles.note}>Delivered around {formatTime(notifTime)}.</Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              style={styles.primary}
              onPress={() => {
                lightImpactHaptic();
                void enableAndFinish();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>ENABLE DAILY WORD</Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={finish}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>Maybe later</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  body: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 34, color: color.ink, marginBottom: space.l },
  wordmark: {
    fontFamily: font.serifSemiBold,
    fontSize: 24,
    letterSpacing: 8,
    color: color.ink,
  },
  tagline: {
    fontFamily: font.serifItalic,
    fontSize: type.body,
    lineHeight: type.body * 1.6,
    color: color.inkMuted,
    textAlign: 'center',
    marginTop: space.l,
  },
  stepTitle: { fontFamily: font.display, fontSize: type.title, color: color.ink, textAlign: 'center' },
  stepBody: {
    fontFamily: font.serif,
    fontSize: type.small,
    color: color.inkMuted,
    textAlign: 'center',
    marginTop: space.m,
  },
  pickerWrap: { marginTop: space.l, alignSelf: 'stretch' },
  note: {
    fontFamily: font.serifItalic,
    fontSize: type.caption,
    color: color.inkFaint,
    marginTop: space.m,
  },
  actions: { gap: space.m },
  primary: {
    backgroundColor: color.ink,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: font.serifMedium,
    fontSize: type.small,
    letterSpacing: letterSpacing.caps,
    color: color.paper,
  },
  secondary: { alignItems: 'center', paddingVertical: space.s },
  secondaryText: {
    fontFamily: font.serif,
    fontSize: type.small,
    color: color.inkMuted,
    textDecorationLine: 'underline',
  },
});
