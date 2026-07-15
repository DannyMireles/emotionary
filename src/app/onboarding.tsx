import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatTime, TimeControl } from '@/components/TimeControl';
import { WordTypeIcon } from '@/components/word-type-icon';
import type { WordType } from '@/content/types';
import { lightImpactHaptic, selectionHaptic, successHaptic } from '@/feedback/haptics';
import { requestPermission } from '@/notifications/scheduler';
import type { NotifTime } from '@/store/userStore';
import { useUserStore } from '@/store/userStore';
import { color, font, letterSpacing, levelPalettes, space, type } from '@/theme/tokens';

const PAGES = ['welcome', 'discover', 'connect', 'grow'] as const;
type OnboardingPage = (typeof PAGES)[number];

const pageColors: Record<OnboardingPage, string> = {
  welcome: '#FBF5EA',
  discover: '#F5E2EC',
  connect: '#FCEBD9',
  grow: '#E4ECE7',
};

const categoryCards: {
  type: WordType;
  title: string;
  body: string;
  tint: string;
}[] = [
  {
    type: 'wanderword',
    title: 'WANDERWORD',
    body: 'Words gathered from cultures around the world.',
    tint: '#FBF2E3',
  },
  {
    type: 'hidden_english',
    title: 'HIDDEN ENGLISH',
    body: 'Rare English words waiting to be rediscovered.',
    tint: '#E5ECE7',
  },
  {
    type: 'psychology',
    title: 'PSYCHOLOGY',
    body: 'Words from the study of the mind.',
    tint: '#F5E1EA',
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const notifTime = useUserStore((state) => state.notifTime);
  const setNotifTime = useUserStore((state) => state.setNotifTime);
  const setNotifEnabled = useUserStore((state) => state.setNotifEnabled);
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);
  const reducedMotion = useReducedMotion();

  const page = PAGES[step];
  const isFirst = step === 0;
  const isLast = step === PAGES.length - 1;

  const finish = () => {
    successHaptic();
    completeOnboarding();
    router.replace('/');
  };

  const goNext = () => {
    selectionHaptic();
    setStep((current) => Math.min(current + 1, PAGES.length - 1));
  };

  const goBack = () => {
    selectionHaptic();
    setStep((current) => Math.max(current - 1, 0));
  };

  const enableDailyWord = async () => {
    lightImpactHaptic();
    const granted = await requestPermission();
    setNotifEnabled(granted);
    finish();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.card, { backgroundColor: pageColors[page] }]}>
        <CornerBubbles visible={page === 'welcome'} />
        <View style={styles.nav}>
          {!isFirst ? (
            <Pressable
              onPress={goBack}
              style={styles.navButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.navGlyph}>‹</Text>
            </Pressable>
          ) : (
            <View style={styles.navButton} />
          )}
          <View style={styles.dots} accessibilityElementsHidden>
            {PAGES.map((_, index) => (
              <View key={index} style={[styles.dot, index === step && styles.dotActive]} />
            ))}
          </View>
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            key={page}
            entering={reducedMotion ? undefined : FadeIn.duration(280)}
            style={styles.page}
          >
            {page === 'welcome' && <WelcomePage />}
            {page === 'discover' && <DiscoverPage />}
            {page === 'connect' && <ConnectPage />}
            {page === 'grow' && (
              <GrowPage notifTime={notifTime} setNotifTime={setNotifTime} />
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          {isLast ? (
            <>
              <Pressable
                style={styles.primary}
                onPress={() => void enableDailyWord()}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>ENABLE DAILY WORD</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={finish} accessibilityRole="button">
                <Text style={styles.secondaryText}>NOT NOW</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.primary} onPress={goNext} accessibilityRole="button">
              <Text style={styles.primaryText}>NEXT</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function WelcomePage() {
  return (
    <>
      <BubbleMark />
      <Text style={styles.title} accessibilityRole="header">
        Welcome to{'\n'}
        <Text style={styles.wordmark}>Emotionary</Text>
      </Text>
      <Text style={styles.body}>
        A dictionary of emotions that helps you understand yourself and the world around you.
      </Text>
    </>
  );
}

function DiscoverPage() {
  return (
    <>
      <View style={[styles.heroCircle, { backgroundColor: '#F386AC' }]} />
      <Text style={styles.title} accessibilityRole="header">Discover</Text>
      <Text style={styles.body}>
        Explore beautiful words that capture complex emotions and human experiences.
      </Text>
      <View style={styles.categoryList}>
        {categoryCards.map((category) => (
          <View
            key={category.type}
            style={[styles.categoryCard, { backgroundColor: category.tint }]}
          >
            <WordTypeIcon wordType={category.type} size={22} color={color.inkMuted} />
            <View style={styles.categoryCopy}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categoryBody}>{category.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function ConnectPage() {
  return (
    <>
      <View style={[styles.heroCircle, { backgroundColor: '#F4BF4F' }]} />
      <Text style={styles.title} accessibilityRole="header">Connect</Text>
      <Text style={styles.body}>
        Save your favorite words, reflect, and connect with what you feel every day.
      </Text>
      <View style={styles.connectionPreview}>
        <View style={[styles.previewBubble, { backgroundColor: levelPalettes[3].deep }]} />
        <View
          style={[
            styles.previewBubble,
            styles.previewBubbleOverlap,
            { backgroundColor: levelPalettes[2].deep },
          ]}
        />
        <View
          style={[
            styles.previewBubble,
            styles.previewBubbleOverlap,
            { backgroundColor: levelPalettes[4].deep },
          ]}
        />
      </View>
      <Text style={styles.previewCaption}>SAVE · REFLECT · SHARE</Text>
    </>
  );
}

function GrowPage({
  notifTime,
  setNotifTime,
}: {
  notifTime: NotifTime;
  setNotifTime: (time: NotifTime) => void;
}) {
  return (
    <>
      <View style={[styles.heroCircle, { backgroundColor: '#4B8EE5' }]} />
      <Text style={styles.title} accessibilityRole="header">Grow</Text>
      <Text style={styles.body}>
        Build self-awareness, expand your vocabulary, and deepen your emotional intelligence.
      </Text>
      <View style={styles.reminderCard}>
        <Text style={styles.reminderLabel}>YOUR DAILY WORD</Text>
        <Text style={styles.reminderCopy}>Choose when you would like a gentle reminder.</Text>
        <TimeControl value={notifTime} onChange={setNotifTime} />
        <Text style={styles.reminderTime}>Around {formatTime(notifTime)}</Text>
      </View>
    </>
  );
}

function BubbleMark() {
  return (
    <View style={styles.bubbleMark} accessibilityElementsHidden>
      <View style={[styles.markBubble, { backgroundColor: levelPalettes[3].deep }]} />
      <View
        style={[
          styles.markBubble,
          styles.markOverlap,
          { backgroundColor: levelPalettes[1].deep },
        ]}
      />
      <View
        style={[styles.markBubble, styles.markOverlap, { backgroundColor: '#3F73B3' }]}
      />
    </View>
  );
}

function CornerBubbles({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.cornerBubbles} pointerEvents="none" accessibilityElementsHidden>
      <View style={[styles.cornerBubble, styles.cornerRose]} />
      <View style={[styles.cornerBubble, styles.cornerSage]} />
      <View style={[styles.cornerBubble, styles.cornerGold]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper, padding: space.m },
  card: {
    flex: 1,
    borderRadius: 26,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(33,28,21,0.12)',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(76, 62, 42, 0.08)',
  },
  nav: {
    minHeight: 48,
    paddingHorizontal: space.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  navButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navGlyph: { fontFamily: font.display, fontSize: 34, color: color.ink },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: space.s },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: color.inkMuted,
  },
  dotActive: { backgroundColor: color.ink, borderColor: color.ink },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space.l,
    paddingVertical: space.s,
  },
  page: { alignItems: 'center', justifyContent: 'center' },
  heroCircle: { width: 98, height: 98, borderRadius: 49, marginBottom: space.l },
  bubbleMark: { flexDirection: 'row', marginBottom: space.l },
  markBubble: { width: 34, height: 34, borderRadius: 17, opacity: 0.9 },
  markOverlap: { marginLeft: -8 },
  title: {
    fontFamily: font.display,
    fontSize: 33,
    lineHeight: 39,
    color: color.ink,
    textAlign: 'center',
  },
  wordmark: { color: levelPalettes[5].deep },
  body: {
    maxWidth: 280,
    marginTop: space.m,
    fontFamily: font.serif,
    fontSize: type.small,
    lineHeight: type.small * 1.62,
    color: color.ink,
    textAlign: 'center',
  },
  categoryList: { alignSelf: 'stretch', gap: space.s, marginTop: space.l },
  categoryCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.m,
    paddingVertical: space.s,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(33,28,21,0.1)',
  },
  categoryCopy: { flex: 1 },
  categoryTitle: {
    fontFamily: font.serifSemiBold,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
  },
  categoryBody: {
    marginTop: 3,
    fontFamily: font.serif,
    fontSize: type.caption,
    lineHeight: type.caption * 1.35,
    color: color.ink,
  },
  connectionPreview: { flexDirection: 'row', marginTop: space.xl },
  previewBubble: { width: 64, height: 64, borderRadius: 32, opacity: 0.76 },
  previewBubbleOverlap: { marginLeft: -18 },
  previewCaption: {
    marginTop: space.m,
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
  },
  reminderCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: space.l,
    paddingHorizontal: space.m,
    paddingTop: space.m,
    paddingBottom: space.s,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(33,28,21,0.12)',
  },
  reminderLabel: {
    fontFamily: font.serifSemiBold,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
  },
  reminderCopy: {
    marginTop: space.xs,
    fontFamily: font.serif,
    fontSize: type.caption,
    color: color.inkMuted,
    textAlign: 'center',
  },
  reminderTime: {
    marginTop: -space.s,
    fontFamily: font.serifItalic,
    fontSize: type.caption,
    color: color.inkMuted,
  },
  footer: {
    minHeight: 96,
    paddingHorizontal: space.xl,
    paddingTop: space.s,
    paddingBottom: space.l,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space.xs,
    zIndex: 2,
  },
  primary: {
    minWidth: 154,
    minHeight: 44,
    backgroundColor: color.ink,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.paper,
  },
  secondary: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.m,
  },
  secondaryText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
    textDecorationLine: 'underline',
  },
  cornerBubbles: {
    position: 'absolute',
    left: -30,
    bottom: -28,
    width: 150,
    height: 150,
  },
  cornerBubble: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    opacity: 0.72,
  },
  cornerRose: { left: 0, top: 0, backgroundColor: levelPalettes[3].deep },
  cornerSage: { left: 22, top: 58, backgroundColor: levelPalettes[4].deep },
  cornerGold: { left: 78, top: 76, backgroundColor: levelPalettes[1].deep },
});
