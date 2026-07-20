import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createAccount, signIn } from '@/auth/client';
import { AmbientInk } from '@/components/AmbientInk';
import { Paywall } from '@/components/Paywall';
import { SystemIcon } from '@/components/system-icon';
import { formatTime, TimeControl } from '@/components/TimeControl';
import { WordTypeIcon } from '@/components/word-type-icon';
import type { WordType } from '@/content/types';
import { lightImpactHaptic, selectionHaptic, successHaptic } from '@/feedback/haptics';
import { requestPermission } from '@/notifications/scheduler';
import type { NotifTime } from '@/store/userStore';
import { useUserStore } from '@/store/userStore';
import { color, font, letterSpacing, levelPalettes, space, type } from '@/theme/tokens';
import { BOOK_URL } from '@/config';

const PAGES = [
  'welcome',
  'daily',
  'key',
  'drawn',
  'reminder',
  'widget',
  'account',
  'first-word',
  'paywall',
] as const;

type OnboardingPage = (typeof PAGES)[number];
type AuthMode = 'create' | 'sign-in';

const pageColors: Record<OnboardingPage, string> = {
  welcome: '#FAF7F0',
  daily: '#F8E8EE',
  key: '#FAF7F0',
  drawn: '#E9EFEA',
  reminder: '#ECE8F4',
  widget: '#F8E8EE',
  account: '#F7EFE4',
  'first-word': '#FAF7F0',
  paywall: '#F8EEE8',
};

const DRAWN_TO = [
  ['Sensations', 'Physical feelings and fleeting body moments'],
  ['Deep, powerful emotions', 'Grief, longing, and awe'],
  ['Love and connection', 'The feelings that pass between people'],
  ['Psychology', 'Terms from the study of the mind'],
] as const;

const QUICK_TIMES: NotifTime[] = [
  { hour: 11, minute: 11 },
  { hour: 7, minute: 0 },
  { hour: 9, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 18, minute: 0 },
  { hour: 21, minute: 0 },
];

const SOURCE_CARDS: {
  type: WordType;
  title: string;
  body: string;
  tint: string;
  accent: string;
}[] = [
  {
    type: 'wanderword',
    title: 'WANDERWORD',
    body: 'Words gathered from languages and cultures around the world.',
    tint: '#F8E8D8',
    accent: '#8A5E35',
  },
  {
    type: 'hidden_english',
    title: 'HIDDEN ENGLISH',
    body: 'Rare English words waiting to be rediscovered.',
    tint: '#DEE9E2',
    accent: '#466A55',
  },
  {
    type: 'psychology',
    title: 'PSYCHOLOGY',
    body: 'Words from the study of the mind, made simple.',
    tint: '#E9CFE0',
    accent: '#7C3D64',
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [selectedDrawnTo, setSelectedDrawnTo] = useState<string[]>(['Sensations']);
  const [authMode, setAuthMode] = useState<AuthMode>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [accountComplete, setAccountComplete] = useState(false);
  const notifTime = useUserStore((state) => state.notifTime);
  const setNotifTime = useUserStore((state) => state.setNotifTime);
  const setNotifEnabled = useUserStore((state) => state.setNotifEnabled);
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);
  const reducedMotion = useReducedMotion();

  const page = PAGES[step];
  const isFirst = step === 0;

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

  const enableAndContinue = async () => {
    lightImpactHaptic();
    const granted = await requestPermission();
    setNotifEnabled(granted);
    goNext();
  };

  const toggleDrawnTo = (label: string) => {
    selectionHaptic();
    setSelectedDrawnTo((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );
  };

  const changeAuthMode = (nextMode: AuthMode) => {
    selectionHaptic();
    setAuthMode(nextMode);
    setAuthMessage('');
    setAccountComplete(false);
  };

  const submitAccount = async () => {
    if (!email.trim().includes('@')) {
      setAuthMessage('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setAuthMessage('Use at least 8 characters for your password.');
      return;
    }

    setAuthBusy(true);
    setAuthMessage('');
    try {
      if (authMode === 'create') {
        const result = await createAccount(email, password);
        setAuthMessage(
          result.requiresEmailConfirmation
            ? 'Check your email to confirm your account. You can keep exploring now.'
            : 'Your account is ready.',
        );
      } else {
        await signIn(email, password);
        setAuthMessage('You are signed in.');
      }
      setAccountComplete(true);
      successHaptic();
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Account request failed. Try again.');
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: pageColors[page] }]}>
      <AmbientInk />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            key={page}
            entering={reducedMotion ? undefined : FadeIn.duration(280)}
            style={styles.page}
          >
            {page === 'welcome' && <WelcomePage reducedMotion={reducedMotion} />}
            {page === 'daily' && <DailyPage reducedMotion={reducedMotion} />}
            {page === 'key' && <KeyPage />}
            {page === 'drawn' && (
              <DrawnPage selected={selectedDrawnTo} onToggle={toggleDrawnTo} />
            )}
            {page === 'reminder' && (
              <ReminderPage notifTime={notifTime} setNotifTime={setNotifTime} />
            )}
            {page === 'widget' && <WidgetPage />}
            {page === 'account' && (
              <AccountPage
                mode={authMode}
                onModeChange={changeAuthMode}
                email={email}
                password={password}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                message={authMessage}
                busy={authBusy}
                onSubmit={() => void submitAccount()}
              />
            )}
            {page === 'first-word' && <FirstWordPage />}
            {page === 'paywall' && (
              <Paywall onContinue={finish} onContinueFree={finish} />
            )}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, page === 'paywall' && styles.footerDotsOnly]}>
          {page !== 'paywall' && (
            <View style={styles.footerActions}>
              {!isFirst ? (
                <Pressable
                  onPress={goBack}
                  style={styles.backFooterButton}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <SystemIcon name="arrow.left" fallback="←" size={20} color={color.ink} />
                </Pressable>
              ) : <View style={styles.backFooterButton} />}
              <View style={styles.footerCtas}>
                {page === 'reminder' ? (
                  <>
                    <PrimaryButton label="ENABLE DAILY WORD" onPress={() => void enableAndContinue()} />
                    <SecondaryButton label="NOT NOW" onPress={goNext} />
                  </>
                ) : page === 'account' ? (
                  <>
                    <PrimaryButton
                      label={accountComplete ? 'CONTINUE' : authMode === 'create' ? 'CREATE ACCOUNT' : 'SIGN IN'}
                      onPress={accountComplete ? goNext : () => void submitAccount()}
                      busy={authBusy}
                    />
                    {!accountComplete && <SecondaryButton label="NOT NOW" onPress={goNext} />}
                  </>
                ) : (
                  <PrimaryButton label={step === 0 ? 'CONTINUE' : 'NEXT'} onPress={goNext} />
                )}
              </View>
              <View style={styles.backFooterButton} />
            </View>
          )}
          <View style={styles.dots} accessibilityElementsHidden>
            {PAGES.map((_, index) => (
              <View key={index} style={[styles.dot, index === step && styles.dotActive]} />
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function WelcomePage({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <View style={styles.center}>
      <Animated.View entering={reducedMotion ? undefined : ZoomIn.springify().damping(14)}>
        <BubbleMark />
      </Animated.View>
      <Text style={styles.wordmark} accessibilityRole="header">
        Emotionary
      </Text>
      <Text style={styles.eyebrow}>A COMPANION APP TO THE EMOTIONARY BOOK</Text>
      <Text style={styles.byline}>By Keila Shaheen</Text>
      <Text style={styles.intro}>
        One word a day. Expand your emotional palette, and recognize life&apos;s most fleeting
        gifts.
      </Text>
      <Pressable
        onPress={() => void Linking.openURL(BOOK_URL)}
        style={styles.bookButton}
        accessibilityRole="link"
        accessibilityLabel="Get the Emotionary book"
      >
        <Image
          source={require('../../assets/images/book-cover.png')}
          style={styles.bookMini}
          contentFit="contain"
        />
        <Text style={styles.bookLink}>GET THE BOOK</Text>
      </Pressable>
    </View>
  );
}

function DailyPage({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <View style={styles.center}>
      <Animated.View
        entering={reducedMotion ? undefined : ZoomIn.delay(80).springify().damping(15)}
        style={styles.notificationCard}
      >
        <View style={styles.notificationTop}>
          <BubbleMark compact />
          <Text style={styles.notificationApp}>EMOTIONARY</Text>
          <Text style={styles.notificationTime}>11:11</Text>
        </View>
        <Text style={styles.notificationTitle}>Your word of the day: Apricity</Text>
        <Text style={styles.notificationBody}>The warmth of the sun on a cold winter&apos;s day.</Text>
      </Animated.View>
      <Text style={styles.title} accessibilityRole="header">
        One word.{`\n`}Every day.
      </Text>
      <Text style={styles.body}>
        A single word arrives each day. Then keep scrolling through a fresh, random mix whenever
        you want to discover more.
      </Text>
    </View>
  );
}

function KeyPage() {
  return (
    <View style={styles.center}>
      <Text style={styles.title} accessibilityRole="header">
        Every word has an origin
      </Text>
      <Text style={styles.body}>
        A small icon always tells you where a word came from.
      </Text>
      <View style={styles.sourceList}>
        {SOURCE_CARDS.map((source) => (
          <View
            key={source.type}
            style={[
              styles.sourceCard,
              { backgroundColor: source.tint, borderColor: `${source.accent}35` },
            ]}
          >
            <View style={[styles.sourceIcon, { borderColor: `${source.accent}55` }]}>
              <WordTypeIcon wordType={source.type} size={26} color={source.accent} />
            </View>
            <View style={styles.sourceCopy}>
              <Text style={[styles.sourceTitle, { color: source.accent }]}>{source.title}</Text>
              <Text style={styles.sourceBody}>{source.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function DrawnPage({ selected, onToggle }: { selected: string[]; onToggle: (label: string) => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title} accessibilityRole="header">
        What are you drawn to?
      </Text>
      <Text style={styles.body}>Pick as many as you like. You can change this later.</Text>
      <View style={styles.optionList}>
        {DRAWN_TO.map(([label, description]) => {
          const active = selected.includes(label);
          return (
            <Pressable
              key={label}
              onPress={() => onToggle(label)}
              style={[styles.option, active && styles.optionActive]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
            >
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, active && styles.optionTextActive]}>{label}</Text>
                <Text style={[styles.optionBody, active && styles.optionTextActive]}>
                  {description}
                </Text>
              </View>
              <SystemIcon
                name={active ? 'checkmark.circle.fill' : 'circle'}
                fallback={active ? '●' : '○'}
                size={22}
                color={active ? color.paper : color.inkMuted}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ReminderPage({
  notifTime,
  setNotifTime,
}: {
  notifTime: NotifTime;
  setNotifTime: (time: NotifTime) => void;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.title} accessibilityRole="header">
        Never miss your word
      </Text>
      <Text style={styles.body}>A gentle nudge once a day. Pick when you would like it.</Text>
      <Text style={styles.timeDisplay}>{formatTime(notifTime)}</Text>
      <View style={styles.timePills}>
        {QUICK_TIMES.map((time) => {
          const label = formatTime(time);
          const active = time.hour === notifTime.hour && time.minute === notifTime.minute;
          return (
            <Pressable
              key={label}
              onPress={() => {
                selectionHaptic();
                setNotifTime(time);
              }}
              style={[styles.timePill, active && styles.timePillActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.timePillText, active && styles.timePillTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.pickerWrap}>
        <TimeControl value={notifTime} onChange={setNotifTime} />
      </View>
    </View>
  );
}

function WidgetPage() {
  const showInstructions = () => {
    selectionHaptic();
    Alert.alert(
      'Add the Emotionary widget',
      'Touch and hold your Home or Lock Screen, tap Edit or Customize, then Add Widget and choose Emotionary.',
    );
  };

  return (
    <View style={styles.center}>
      <Text style={styles.title} accessibilityRole="header">
        Add the daily widget
      </Text>
      <Text style={styles.body}>Keep today&apos;s word nearby on your Home or Lock Screen.</Text>
      <View style={styles.widgetPreview}>
        <View style={styles.homeWidget}>
          <View style={styles.widgetOrb} />
          <Text style={styles.widgetWord}>Apricity</Text>
          <Text style={styles.widgetDefinition}>The warmth of the sun on a cold day.</Text>
        </View>
        <View style={styles.lockWidget}>
          <Text style={styles.lockTime}>11:19</Text>
          <Text style={styles.lockWord}>Apricity</Text>
          <Text style={styles.lockPronunciation}>[uh-PRIS-ih-tee]</Text>
        </View>
      </View>
      <View style={styles.instructionCard}>
        <Text style={styles.instructionTitle}>Enable it in three steps</Text>
        <Text style={styles.instructionText}>
          1. Touch and hold your Home or Lock Screen.{`\n`}2. Tap Customize or +.{`\n`}3. Choose
          Emotionary.
        </Text>
      </View>
      <Pressable onPress={showInstructions} style={styles.widgetButton} accessibilityRole="button">
        <Text style={styles.widgetButtonText}>HOW TO ADD THE WIDGET</Text>
      </Pressable>
    </View>
  );
}

function AccountPage({
  mode,
  onModeChange,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  message,
  busy,
  onSubmit,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  message: string;
  busy: boolean;
  onSubmit: () => void;
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.center}>
      <Text style={styles.title} accessibilityRole="header">
        Your Emotionary account
      </Text>
      <Text style={styles.body}>Create an account to keep your saved words connected.</Text>
      <View style={styles.authModes}>
        <Pressable
          onPress={() => onModeChange('create')}
          style={[styles.authMode, mode === 'create' && styles.authModeActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'create' }}
        >
          <Text style={[styles.authModeText, mode === 'create' && styles.authModeTextActive]}>
            CREATE
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onModeChange('sign-in')}
          style={[styles.authMode, mode === 'sign-in' && styles.authModeActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'sign-in' }}
        >
          <Text style={[styles.authModeText, mode === 'sign-in' && styles.authModeTextActive]}>
            SIGN IN
          </Text>
        </Pressable>
      </View>
      <View style={styles.authForm}>
        <TextInput
          value={email}
          onChangeText={onEmailChange}
          placeholder="Email address"
          placeholderTextColor={color.inkFaint}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          style={styles.input}
          accessibilityLabel="Email address"
        />
        <View style={styles.passwordWrap}>
          <TextInput
            value={password}
            onChangeText={onPasswordChange}
            placeholder={mode === 'create' ? 'Password (8+ characters)' : 'Password'}
            placeholderTextColor={color.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            textContentType={mode === 'create' ? 'newPassword' : 'password'}
            secureTextEntry={!passwordVisible}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            editable={!busy}
            style={[styles.input, styles.passwordInput]}
            accessibilityLabel="Password"
          />
          <Pressable
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.eyeButton}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
          >
            <SystemIcon
              name={passwordVisible ? 'eye.slash' : 'eye'}
              fallback={passwordVisible ? '◉' : '○'}
              size={20}
              color={color.inkMuted}
            />
          </Pressable>
        </View>
      </View>
      {message.length > 0 && (
        <Text style={styles.authMessage} accessibilityLiveRegion="polite" selectable>
          {message}
        </Text>
      )}
    </View>
  );
}

function FirstWordPage() {
  const isSaved = useUserStore((state) => state.favorites.includes('anhedonia'));
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);

  return (
    <View style={styles.center}>
      <Text style={styles.kicker}>YOUR FIRST WORD</Text>
      <View style={styles.firstWord}>
        <View style={styles.firstType}>
          <WordTypeIcon wordType="psychology" size={15} color={color.inkMuted} />
          <Text style={styles.firstTypeText}>PSYCHOLOGY</Text>
        </View>
        <Text style={styles.firstWordTitle} accessibilityRole="header">
          Anhedonia
        </Text>
        <Text style={styles.firstPronunciation}>[an-hee-DOH-nee-ah] 🔊</Text>
        <Text style={styles.firstOrigin}>GREEK</Text>
        <Text style={styles.firstDefinition}>
          The reduced ability to feel pleasure; when activities that once brought joy feel flat,
          distant, or simply beside the point.
        </Text>
        <View style={styles.previewRule} />
        <Text style={styles.firstWisdom}>
          Numbness is not the absence of feeling. It&apos;s a feeling asking for help.
        </Text>
        <View style={styles.previewActions}>
          <Pressable
            onPress={() => {
              lightImpactHaptic();
              toggleFavorite('anhedonia');
            }}
            style={styles.previewAction}
            accessibilityRole="button"
          >
            <SystemIcon name={isSaved ? 'heart.fill' : 'heart'} fallback={isSaved ? '♥' : '♡'} size={21} color={color.ink} />
            <Text style={styles.previewActionLabel}>{isSaved ? 'SAVED' : 'SAVE'}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              selectionHaptic();
              router.push('/share/anhedonia');
            }}
            style={styles.previewAction}
            accessibilityRole="button"
          >
            <SystemIcon name="square.and.arrow.up" fallback="↑" size={21} color={color.ink} />
            <Text style={styles.previewActionLabel}>SHARE</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function BubbleMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.bubbleMark, compact && styles.bubbleMarkCompact]} accessibilityElementsHidden>
      <View style={[styles.markBubble, compact && styles.markBubbleCompact, { backgroundColor: levelPalettes[3].deep }]} />
      <View style={[styles.markBubble, compact && styles.markBubbleCompact, styles.markOverlap, compact && styles.markOverlapCompact, { backgroundColor: '#D9A629' }]} />
      <View style={[styles.markBubble, compact && styles.markBubbleCompact, styles.markOverlap, compact && styles.markOverlapCompact, { backgroundColor: '#3F73B3' }]} />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.primary, pressed && styles.pressed, busy && styles.disabled]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {busy ? <ActivityIndicator color={color.paper} /> : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.secondary} onPress={onPress} accessibilityRole="button">
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  keyboard: { flex: 1 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: color.inkMuted,
  },
  dotActive: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.ink },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space.l,
    paddingVertical: space.s,
  },
  page: { alignItems: 'center', justifyContent: 'center' },
  center: { width: '100%', maxWidth: 440, alignItems: 'center', justifyContent: 'center' },
  heroOrb: {
    width: 104,
    height: 104,
    borderRadius: 52,
    marginBottom: space.l,
    boxShadow: '0 14px 32px rgba(97, 50, 69, 0.12)',
  },
  bubbleMark: { flexDirection: 'row', marginBottom: space.l },
  bubbleMarkCompact: { marginBottom: 0 },
  markBubble: { width: 36, height: 36, borderRadius: 18, opacity: 0.88 },
  markBubbleCompact: { width: 18, height: 18, borderRadius: 9 },
  markOverlap: { marginLeft: -8 },
  markOverlapCompact: { marginLeft: -5 },
  wordmark: {
    fontFamily: font.display,
    fontSize: 42,
    lineHeight: 48,
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
  byline: { fontFamily: font.serifItalic, fontSize: type.caption, color: color.inkMuted, marginTop: 4 },
  intro: {
    fontFamily: font.serif,
    fontSize: type.small,
    lineHeight: 22,
    color: color.ink,
    marginTop: space.l,
    textAlign: 'center',
    maxWidth: 290,
  },
  bookMini: {
    width: 94,
    height: 132,
  },
  bookButton: { alignItems: 'center', marginTop: space.l },
  bookLink: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    color: color.ink,
    textDecorationLine: 'underline',
    marginTop: space.s,
  },
  notificationCard: {
    width: '100%',
    maxWidth: 330,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    padding: space.m,
    marginBottom: space.xl,
    boxShadow: '0 12px 28px rgba(67, 52, 35, 0.10)',
  },
  notificationTop: { flexDirection: 'row', alignItems: 'center' },
  notificationApp: { fontFamily: font.serifMedium, fontSize: 9, letterSpacing: 1.1, color: color.inkMuted, marginLeft: space.s },
  notificationTime: { fontFamily: font.serif, fontSize: 10, color: color.inkFaint, marginLeft: 'auto' },
  notificationTitle: { fontFamily: font.serifSemiBold, fontSize: type.small, color: color.ink, marginTop: space.s },
  notificationBody: { fontFamily: font.serif, fontSize: type.caption, lineHeight: 18, color: color.inkMuted, marginTop: 2 },
  kicker: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.badge,
    color: color.inkMuted,
    textAlign: 'center',
    marginBottom: space.s,
  },
  title: {
    fontFamily: font.display,
    fontSize: 31,
    lineHeight: 37,
    color: color.ink,
    textAlign: 'center',
  },
  body: {
    fontFamily: font.serif,
    fontSize: type.small,
    lineHeight: 22,
    color: color.inkMuted,
    textAlign: 'center',
    marginTop: space.m,
    maxWidth: 302,
  },
  sourceList: { width: '100%', gap: 10, marginTop: space.l },
  sourceCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.m,
    paddingVertical: space.s,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  sourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceCopy: { flex: 1 },
  sourceTitle: {
    fontFamily: font.serifSemiBold,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
  },
  sourceBody: { fontFamily: font.serif, fontSize: type.caption, lineHeight: 17, color: color.ink, marginTop: 3 },
  levelList: { width: '100%', gap: 9, marginTop: space.l },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    padding: space.s,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  levelDot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  levelNumber: { fontFamily: font.serifSemiBold, fontSize: type.caption, color: color.paper },
  levelCopy: { flex: 1 },
  levelTitle: {
    fontFamily: font.serifSemiBold,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.ink,
  },
  levelBody: { fontFamily: font.serif, fontSize: type.caption, color: color.inkMuted, marginTop: 2 },
  optionList: { width: '100%', gap: space.s, marginTop: space.l },
  option: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 10,
    paddingHorizontal: space.m,
  },
  optionActive: { backgroundColor: color.ink, borderColor: color.ink },
  optionCopy: { flex: 1 },
  optionTitle: { fontFamily: font.serifSemiBold, fontSize: type.small, color: color.ink },
  optionBody: { fontFamily: font.serif, fontSize: type.caption, color: color.inkMuted, marginTop: 2 },
  optionTextActive: { color: color.paper },
  timeDisplay: { fontFamily: font.display, fontSize: 40, color: color.ink, marginTop: space.l },
  timePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.s,
    marginTop: space.m,
    maxWidth: 280,
  },
  timePill: {
    minWidth: 76,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: 'rgba(255,255,255,0.62)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  timePillActive: { backgroundColor: color.ink, borderColor: color.ink },
  timePillText: { fontFamily: font.serifMedium, fontSize: type.caption, color: color.ink },
  timePillTextActive: { color: color.paper },
  pickerWrap: { alignSelf: 'stretch', marginTop: space.m },
  widgetPreview: { flexDirection: 'row', gap: space.m, marginTop: space.l },
  homeWidget: {
    width: 132,
    height: 132,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.m,
  },
  widgetOrb: { width: 28, height: 28, borderRadius: 14, backgroundColor: levelPalettes[3].deep, marginBottom: 5 },
  widgetWord: { fontFamily: font.display, fontSize: type.body, color: color.ink },
  widgetDefinition: { fontFamily: font.serif, fontSize: 8, lineHeight: 11, color: color.inkMuted, textAlign: 'center' },
  lockWidget: {
    width: 132,
    height: 132,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTime: { fontFamily: font.display, fontSize: 23, color: color.paper },
  lockWord: { fontFamily: font.serifSemiBold, fontSize: type.small, color: color.paper, marginTop: 4 },
  lockPronunciation: { fontFamily: font.serif, fontSize: 9, color: 'rgba(255,255,255,0.68)' },
  instructionCard: {
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    padding: space.m,
    marginTop: space.m,
    maxWidth: 302,
  },
  instructionTitle: { fontFamily: font.display, fontSize: type.body, color: color.ink, textAlign: 'center' },
  instructionText: {
    fontFamily: font.serif,
    fontSize: type.caption,
    lineHeight: 19,
    color: color.inkMuted,
    textAlign: 'left',
    marginTop: space.s,
  },
  widgetButton: { minHeight: 42, borderRadius: 999, backgroundColor: color.ink, justifyContent: 'center', paddingHorizontal: space.m, marginTop: space.m },
  widgetButtonText: { fontFamily: font.serifMedium, fontSize: type.badge, letterSpacing: letterSpacing.caps, color: color.paper },
  authModes: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
    marginTop: space.l,
  },
  authMode: { minWidth: 112, paddingVertical: 9, paddingHorizontal: space.m, borderRadius: 999, alignItems: 'center' },
  authModeActive: { backgroundColor: color.ink },
  authModeText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
  },
  authModeTextActive: { color: color.paper },
  authForm: { width: '100%', gap: space.s, marginTop: space.m },
  passwordWrap: { width: '100%', position: 'relative' },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: space.m,
    fontFamily: font.serif,
    fontSize: type.small,
    color: color.ink,
  },
  passwordInput: { paddingRight: 54 },
  eyeButton: { position: 'absolute', right: 4, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  authMessage: {
    fontFamily: font.serif,
    fontSize: type.caption,
    lineHeight: 18,
    color: color.inkMuted,
    textAlign: 'center',
    marginTop: space.s,
    maxWidth: 302,
  },
  firstWord: { alignItems: 'center', maxWidth: 320, width: '100%' },
  firstType: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  firstTypeText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.badge,
    color: color.inkMuted,
  },
  firstWordTitle: { fontFamily: font.display, fontSize: 44, color: color.ink, marginTop: space.m },
  firstPronunciation: { fontFamily: font.serifItalic, fontSize: type.small, color: color.inkMuted },
  firstOrigin: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkFaint,
    marginTop: 3,
  },
  firstDefinition: {
    fontFamily: font.serif,
    fontSize: type.body,
    lineHeight: 27,
    color: color.ink,
    textAlign: 'center',
    marginTop: space.l,
  },
  previewRule: { height: 1, alignSelf: 'stretch', backgroundColor: color.inkMuted, opacity: 0.28, marginTop: space.l },
  firstWisdom: {
    fontFamily: font.serifItalic,
    fontSize: type.small,
    lineHeight: 21,
    color: color.ink,
    textAlign: 'center',
    marginTop: space.m,
  },
  previewActions: { flexDirection: 'row', gap: space.xxl, marginTop: space.m },
  previewAction: { alignItems: 'center', gap: 5, minWidth: 44 },
  previewActionLabel: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
  },
  footer: {
    minHeight: 108,
    paddingHorizontal: space.l,
    paddingTop: 0,
    paddingBottom: space.s,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space.s,
    zIndex: 2,
  },
  footerDotsOnly: { minHeight: 30 },
  footerActions: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerCtas: { alignItems: 'center', minWidth: 190 },
  backFooterButton: { width: 44, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  primary: {
    minWidth: 176,
    minHeight: 46,
    backgroundColor: color.ink,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.paper,
  },
  secondary: { minHeight: 34, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.m },
  secondaryText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
    textDecorationLine: 'underline',
  },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.55 },
});
