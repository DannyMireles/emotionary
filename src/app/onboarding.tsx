import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientInk } from '@/components/AmbientInk';
import { formatTime, TimeControl } from '@/components/TimeControl';
import { lightImpactHaptic, selectionHaptic, successHaptic } from '@/feedback/haptics';
import { requestPermission } from '@/notifications/scheduler';
import type { NotifTime } from '@/store/userStore';
import { useUserStore } from '@/store/userStore';
import { color, font, letterSpacing, levelPalettes, space, type } from '@/theme/tokens';

const PAGES = [
  'welcome',
  'daily',
  'key',
  'levels',
  'drawn',
  'reminder',
  'widget',
  'first-word',
] as const;

const DRAWN_TO = [
  ['Sensations', 'Physical feelings and fleeting body moments'],
  ['Deep, powerful emotions', 'Grief, longing, awe, the feelings that sit heavy'],
  ['Love and connection', 'The feelings that pass between people'],
  ['Clinical', 'Psychological terms made simple'],
] as const;

const QUICK_TIMES: NotifTime[] = [
  { hour: 7, minute: 0 },
  { hour: 8, minute: 0 },
  { hour: 9, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 18, minute: 0 },
  { hour: 21, minute: 0 },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [selectedDrawnTo, setSelectedDrawnTo] = useState<string[]>(['Sensations']);
  const notifTime = useUserStore((s) => s.notifTime);
  const setNotifTime = useUserStore((s) => s.setNotifTime);
  const setNotifEnabled = useUserStore((s) => s.setNotifEnabled);
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);

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
    if (isLast) finish();
    else setStep((current) => Math.min(current + 1, PAGES.length - 1));
  };

  const goBack = () => {
    selectionHaptic();
    setStep((current) => Math.max(current - 1, 0));
  };

  const enableAndContinue = async () => {
    lightImpactHaptic();
    const granted = await requestPermission();
    setNotifEnabled(granted);
    setStep((current) => Math.min(current + 1, PAGES.length - 1));
  };

  const toggleDrawnTo = (label: string) => {
    selectionHaptic();
    setSelectedDrawnTo((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <AmbientInk />

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
        <View style={styles.navButton} />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {page === 'welcome' && (
          <View style={styles.center}>
            <Text style={styles.wordmark}>Emotionary</Text>
            <Text style={styles.eyebrow}>A COMPANION APP TO THE EMOTIONARY BOOK</Text>
            <Text style={styles.byline}>By Keila Shaheen</Text>
            <Text style={styles.intro}>
              One word a day. Expand your emotional palette, and recognize life's most
              fleeting gifts.
            </Text>
            <View style={styles.bookMini}>
              <Text style={styles.bookMiniTitle}>Emotionary</Text>
              <Text style={styles.bookMiniAuthor}>KEILA SHAHEEN</Text>
            </View>
            <Text style={styles.bookLink}>GET THE BOOK</Text>
          </View>
        )}

        {page === 'daily' && (
          <View style={styles.center}>
            <Text style={styles.kicker}>EVERY DAY</Text>
            <Text style={styles.title}>One word.{'\n'}Every day.</Text>
            <Text style={styles.body}>
              A single word arrives each day. No feed to scroll, no clutter. Just one thing
              worth sitting with.
            </Text>
          </View>
        )}

        {page === 'key' && (
          <View style={styles.center}>
            <Text style={styles.kicker}>THE KEY</Text>
            <Text style={styles.title}>Every word has an origin</Text>
            <Text style={styles.body}>
              We curated these words from three places. You'll always see a small icon telling
              you where each one came from.
            </Text>
            <View style={styles.keyList}>
              <KeyRow icon="🌍" title="Wanderword" body="Words borrowed from other languages, ones English never quite had." />
              <KeyRow icon="🔍" title="Hidden English" body="Real English words that fell out of use, waiting to be rediscovered." />
              <KeyRow icon="🧠" title="Clinical" body="Terms with roots in psychology, simplified for everyday use." />
            </View>
          </View>
        )}

        {page === 'levels' && (
          <View style={styles.center}>
            <Text style={styles.kicker}>THE LEVELS</Text>
            <Text style={styles.title}>A map for intensity</Text>
            <Text style={styles.body}>
              Every word belongs to one of five emotional depths, from fleeting sensations to
              transformative experiences.
            </Text>
            <View style={styles.levelList}>
              <LevelRow level={1} title="FLEETING" body="Light, fleeting, surface sensations" />
              <LevelRow level={2} title="UNDERCURRENTS" body="Present but subtle, humming beneath the surface" />
              <LevelRow level={3} title="IN-BETWEEN" body="Complex, mixed, pulling in two directions at once" />
              <LevelRow level={4} title="THE WEIGHT" body="Heavy, slow, demanding your full attention" />
              <LevelRow level={5} title="THE DEPTHS" body="The most intense, transformative human experiences" />
            </View>
          </View>
        )}

        {page === 'drawn' && (
          <View style={styles.center}>
            <Text style={styles.kicker}>JUST FOR YOU</Text>
            <Text style={styles.title}>What are you drawn to?</Text>
            <Text style={styles.body}>
              We'll surface more of what resonates. Pick as many as you like.
            </Text>
            <View style={styles.optionList}>
              {DRAWN_TO.map(([label, description]) => {
                const active = selectedDrawnTo.includes(label);
                return (
                  <Pressable
                    key={label}
                    onPress={() => toggleDrawnTo(label)}
                    style={[styles.option, active && styles.optionActive]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                  >
                    <Text style={[styles.optionTitle, active && styles.optionTextActive]}>
                      {label}
                    </Text>
                    <Text style={[styles.optionBody, active && styles.optionTextActive]}>
                      {description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {page === 'reminder' && (
          <View style={styles.center}>
            <Text style={styles.kicker}>STAY IN THE HABIT</Text>
            <Text style={styles.title}>Never miss your word</Text>
            <Text style={styles.body}>
              A gentle nudge once a day, just the word, nothing else. Pick when you'd like it to
              arrive.
            </Text>
            <Text style={styles.timeDisplay}>{formatTime(notifTime)}</Text>
            <View style={styles.timePills}>
              {QUICK_TIMES.map((time) => {
                const active = time.hour === notifTime.hour && time.minute === notifTime.minute;
                return (
                  <Pressable
                    key={formatTime(time)}
                    onPress={() => {
                      selectionHaptic();
                      setNotifTime(time);
                    }}
                    style={[styles.timePill, active && styles.timePillActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.timePillText, active && styles.timePillTextActive]}>
                      {formatTime(time)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.pickerWrap}>
              <TimeControl value={notifTime} onChange={setNotifTime} />
            </View>
            <Text style={styles.note}>Delivered around {formatTime(notifTime)}.</Text>
          </View>
        )}

        {page === 'widget' && (
          <View style={styles.center}>
            <Text style={styles.kicker}>BRING IT WITH YOU</Text>
            <Text style={styles.title}>On your Home & Lock Screen</Text>
            <Text style={styles.body}>
              Keep the day's word close with a quiet widget-style glance when you want it.
            </Text>
            <WidgetPreview />
            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>Add it to your Lock Screen</Text>
              <Text style={styles.instructionText}>
                Touch and hold your Lock Screen, tap Customize, then add Emotionary below the
                clock.
              </Text>
            </View>
          </View>
        )}

        {page === 'first-word' && (
          <View style={styles.center}>
            <Text style={styles.kicker}>YOUR FIRST WORD</Text>
            <FirstWordPreview />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {page === 'reminder' ? (
          <>
            <Pressable
              style={styles.primary}
              onPress={() => void enableAndContinue()}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>ENABLE NOTIFICATIONS</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={goNext} accessibilityRole="button">
              <Text style={styles.secondaryText}>NOT NOW</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.primary} onPress={goNext} accessibilityRole="button">
            <Text style={styles.primaryText}>{isLast ? 'CONTINUE' : step === 0 ? 'CONTINUE' : 'NEXT'}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function KeyRow({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={styles.keyRow}>
      <View style={styles.keyIconWrap}>
        <Text style={styles.keyIcon}>{icon}</Text>
      </View>
      <View style={styles.keyCopy}>
        <Text style={styles.keyTitle}>{title}</Text>
        <Text style={styles.keyBody}>{body}</Text>
      </View>
    </View>
  );
}

function LevelRow({ level, title, body }: { level: 1 | 2 | 3 | 4 | 5; title: string; body: string }) {
  return (
    <View style={styles.levelRow}>
      <View style={[styles.levelDot, { backgroundColor: levelPalettes[level].deep }]}>
        <Text style={styles.levelNumber}>{level}</Text>
      </View>
      <View style={styles.keyCopy}>
        <Text style={styles.keyTitle}>LEVEL {level} = {title}</Text>
        <Text style={styles.keyBody}>{body}</Text>
      </View>
    </View>
  );
}

function WidgetPreview() {
  return (
    <View style={styles.widgetPreview}>
      <View style={styles.homeWidget}>
        <View style={styles.widgetSwatch} />
        <Text style={styles.widgetLabel}>Home Screen</Text>
        <Text style={styles.widgetLink}>CONFIGURE</Text>
      </View>
      <View style={styles.lockWidget}>
        <Text style={styles.lockTime}>11:19</Text>
        <Text style={styles.lockWord}>Apricity</Text>
        <Text style={styles.lockPronunciation}>[uh-PRIS-ih-tee]</Text>
        <Text style={styles.widgetLabel}>Lock Screen</Text>
        <Text style={styles.widgetLink}>LEARN HOW</Text>
      </View>
    </View>
  );
}

function FirstWordPreview() {
  return (
    <View style={styles.firstWord}>
      <Text style={styles.firstType}>🔍 HIDDEN ENGLISH</Text>
      <Text style={styles.firstWordTitle}>Apricity</Text>
      <Text style={styles.firstPronunciation}>[uh-PRIS-ih-tee]</Text>
      <Text style={styles.firstOrigin}>ENGLISH (ARCHAIC)</Text>
      <Text style={styles.firstDefinition}>
        The warmth of the sun on a cold winter's day, small, specific, and disproportionately
        comforting.
      </Text>
      <View style={styles.previewRule} />
      <Text style={styles.firstWisdom}>Sometimes all you need is five minutes of light.</Text>
      <View style={styles.previewActions}>
        <Text style={styles.previewAction}>♡{'\n'}SAVE</Text>
        <Text style={styles.previewAction}>⤴{'\n'}SHARE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  nav: {
    minHeight: 42,
    paddingHorizontal: space.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  navButton: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  navGlyph: { fontFamily: font.display, fontSize: 34, color: color.ink },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: color.hairline },
  dotActive: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.ink },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    paddingTop: space.m,
    paddingBottom: space.xl,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  wordmark: {
    fontFamily: font.display,
    fontSize: 41,
    color: color.ink,
    textAlign: 'center',
  },
  eyebrow: {
    fontFamily: font.serifMedium,
    fontSize: 9,
    letterSpacing: 1.35,
    color: color.inkMuted,
    marginTop: space.s,
    textAlign: 'center',
  },
  byline: {
    fontFamily: font.serifItalic,
    fontSize: type.caption,
    color: color.inkMuted,
    marginTop: space.xs,
  },
  intro: {
    fontFamily: font.serif,
    fontSize: type.small,
    lineHeight: type.small * 1.58,
    color: color.ink,
    marginTop: space.xl,
    textAlign: 'center',
    maxWidth: 280,
  },
  bookMini: {
    width: 92,
    height: 128,
    borderWidth: 1,
    borderColor: color.ink,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.m,
    marginTop: space.xl,
    backgroundColor: color.card,
  },
  bookMiniTitle: { fontFamily: font.display, fontSize: type.body, color: color.ink },
  bookMiniAuthor: {
    fontFamily: font.serifMedium,
    fontSize: 7,
    letterSpacing: 0.8,
    color: color.inkMuted,
  },
  bookLink: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    color: color.ink,
    textDecorationLine: 'underline',
    marginTop: space.s,
  },
  kicker: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.badge,
    color: color.inkFaint,
    textAlign: 'center',
    marginBottom: space.s,
  },
  title: {
    fontFamily: font.display,
    fontSize: 30,
    lineHeight: 35,
    color: color.ink,
    textAlign: 'center',
  },
  body: {
    fontFamily: font.serif,
    fontSize: type.small,
    lineHeight: type.small * 1.55,
    color: color.inkMuted,
    textAlign: 'center',
    marginTop: space.m,
    maxWidth: 292,
  },
  keyList: { alignSelf: 'stretch', gap: space.m, marginTop: space.xl },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  keyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  keyIcon: { fontSize: 16 },
  keyCopy: { flex: 1 },
  keyTitle: { fontFamily: font.serifSemiBold, fontSize: type.small, color: color.ink },
  keyBody: {
    fontFamily: font.serif,
    fontSize: type.caption,
    lineHeight: type.caption * 1.45,
    color: color.inkMuted,
    marginTop: 2,
  },
  levelList: { alignSelf: 'stretch', gap: space.s, marginTop: space.xl },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  levelDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: { fontFamily: font.serifSemiBold, fontSize: type.caption, color: color.paper },
  optionList: { alignSelf: 'stretch', gap: space.s, marginTop: space.xl },
  option: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: space.m,
  },
  optionActive: { backgroundColor: color.ink, borderColor: color.ink },
  optionTitle: { fontFamily: font.serifSemiBold, fontSize: type.small, color: color.ink },
  optionBody: {
    fontFamily: font.serif,
    fontSize: type.caption,
    color: color.inkMuted,
    marginTop: 2,
  },
  optionTextActive: { color: color.paper },
  timeDisplay: {
    fontFamily: font.display,
    fontSize: 42,
    color: color.ink,
    marginTop: space.xl,
  },
  timePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.s,
    marginTop: space.m,
    maxWidth: 240,
  },
  timePill: {
    minWidth: 70,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: 'rgba(255,255,255,0.68)',
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  timePillActive: { backgroundColor: color.ink, borderColor: color.ink },
  timePillText: { fontFamily: font.serifMedium, fontSize: type.caption, color: color.ink },
  timePillTextActive: { color: color.paper },
  pickerWrap: { alignSelf: 'stretch', marginTop: space.m },
  note: {
    fontFamily: font.serifItalic,
    fontSize: type.caption,
    color: color.inkFaint,
    marginTop: space.s,
  },
  widgetPreview: {
    flexDirection: 'row',
    gap: space.m,
    marginTop: space.xl,
  },
  homeWidget: {
    width: 114,
    minHeight: 126,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.s,
  },
  lockWidget: {
    width: 114,
    minHeight: 126,
    borderRadius: 18,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.s,
  },
  widgetSwatch: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: levelPalettes[1].deep,
    marginBottom: space.s,
  },
  widgetLabel: {
    fontFamily: font.serifSemiBold,
    fontSize: type.caption,
    color: color.ink,
    textAlign: 'center',
  },
  widgetLink: {
    fontFamily: font.serifMedium,
    fontSize: 8,
    letterSpacing: 0.5,
    color: color.inkMuted,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  lockTime: { fontFamily: font.display, fontSize: 20, color: color.paper },
  lockWord: { fontFamily: font.serifSemiBold, fontSize: type.caption, color: color.paper },
  lockPronunciation: { fontFamily: font.serif, fontSize: 8, color: 'rgba(255,255,255,0.72)' },
  instructionCard: {
    borderRadius: 18,
    backgroundColor: color.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    padding: space.m,
    marginTop: space.m,
    maxWidth: 260,
  },
  instructionTitle: {
    fontFamily: font.display,
    fontSize: type.body,
    color: color.ink,
    textAlign: 'center',
  },
  instructionText: {
    fontFamily: font.serif,
    fontSize: type.caption,
    lineHeight: type.caption * 1.5,
    color: color.inkMuted,
    textAlign: 'center',
    marginTop: space.s,
  },
  firstWord: { alignItems: 'center', maxWidth: 300 },
  firstType: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.badge,
    color: color.inkFaint,
  },
  firstWordTitle: {
    fontFamily: font.display,
    fontSize: 42,
    color: color.ink,
    marginTop: space.m,
  },
  firstPronunciation: {
    fontFamily: font.serifItalic,
    fontSize: type.small,
    color: color.inkMuted,
  },
  firstOrigin: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkFaint,
    marginTop: 2,
  },
  firstDefinition: {
    fontFamily: font.serif,
    fontSize: type.body,
    lineHeight: type.body * 1.55,
    color: color.ink,
    textAlign: 'center',
    marginTop: space.l,
  },
  previewRule: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: color.hairline,
    marginTop: space.l,
  },
  firstWisdom: {
    fontFamily: font.serifItalic,
    fontSize: type.small,
    color: color.ink,
    textAlign: 'center',
    marginTop: space.m,
  },
  previewActions: { flexDirection: 'row', gap: space.xl, marginTop: space.m },
  previewAction: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    lineHeight: 18,
    color: color.inkMuted,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.s,
    paddingBottom: space.l,
    alignItems: 'center',
    gap: space.s,
  },
  primary: {
    minWidth: 164,
    backgroundColor: color.ink,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.paper,
  },
  secondary: { alignItems: 'center', paddingVertical: space.xs, paddingHorizontal: space.m },
  secondaryText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
    textDecorationLine: 'underline',
  },
});
