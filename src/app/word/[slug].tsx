import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SystemIcon } from '@/components/system-icon';
import { WordFull } from '@/components/WordFull';
import { findWord, useContentStore } from '@/content/store';
import { localDateString, wordOfDay } from '@/daily/engine';
import { canViewWord } from '@/entitlements';
import { selectionHaptic } from '@/feedback/haptics';
import { useUserStore } from '@/store/userStore';
import { color, font, levelPalettes, space, type } from '@/theme/tokens';

export default function WordDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const words = useContentStore((s) => s.words);
  const sync = useContentStore((s) => s.sync);
  const markRead = useUserStore((s) => s.markRead);
  const hasFullAccess = useUserStore((s) => s.accessLevel === 'full');

  const word = slug ? findWord(words, slug) : undefined;
  const todaysSlug = wordOfDay(words, localDateString())?.slug ?? null;
  const locked = word ? !canViewWord(word, todaysSlug, hasFullAccess) : false;

  useFocusEffect(
    useCallback(() => {
      if (word && !locked) markRead(word.slug);
    }, [word, locked, markRead]),
  );

  // Graceful fallback (DESIGN.md §5.3): a routed slug may not resolve, e.g.
  // after a word was unpublished. Never a crash or blank screen.
  if (!word) {
    return (
      <SafeAreaView style={styles.unavailable} edges={['top']}>
        <Text style={styles.unavailableTitle}>This word is unavailable.</Text>
        <Text style={styles.unavailableBody}>It may have been removed or renamed.</Text>
        <Pressable onPress={() => void sync()} accessibilityRole="button">
          <Text style={styles.link}>Check for updates</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/')} accessibilityRole="button">
          <Text style={styles.link}>Go to today&apos;s word</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (locked) {
    return (
      <SafeAreaView
        style={[styles.locked, { backgroundColor: levelPalettes[word.level].tint }]}
        edges={['top']}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.lockedBack}
        >
          <SystemIcon name="arrow.left" fallback="←" size={20} color={color.ink} />
        </Pressable>
        <Text style={styles.lockedKicker}>FULL ACCESS</Text>
        <Text style={styles.lockedWord}>{word.word}</Text>
        <Text style={styles.lockedBody}>Unlock every word, theme, and future update.</Text>
        <Pressable
          onPress={() => router.push('/paywall' as Href)}
          style={styles.unlockButton}
          accessibilityRole="button"
        >
          <Text style={styles.unlockText}>UNLOCK EMOTIONARY</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: levelPalettes[word.level].tint }]}
      edges={['top']}
    >
      <View style={styles.backRow}>
        <Pressable
          onPress={() => {
            selectionHaptic();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/browse');
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          style={styles.backButton}
        >
          <SystemIcon name="arrow.left" fallback="←" size={20} color={color.ink} />
        </Pressable>
      </View>
      <WordFull word={word} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backRow: { paddingHorizontal: space.m, paddingTop: space.xs },
  backButton: { minWidth: 44, minHeight: 40, justifyContent: 'center' },
  unavailable: {
    flex: 1,
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.m,
    padding: space.xl,
  },
  unavailableTitle: { fontFamily: font.serifSemiBold, fontSize: type.body + 2, color: color.ink },
  unavailableBody: { fontFamily: font.serif, fontSize: type.small, color: color.inkMuted },
  link: {
    fontFamily: font.serifMedium,
    fontSize: type.small,
    color: color.ink,
    textDecorationLine: 'underline',
    padding: space.s,
  },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  lockedBack: { position: 'absolute', top: space.s, left: space.m, width: 44, height: 44, justifyContent: 'center' },
  lockedKicker: { fontFamily: font.serifMedium, fontSize: type.badge, color: color.inkMuted, letterSpacing: 2 },
  lockedWord: { fontFamily: font.display, fontSize: 48, color: color.ink, marginTop: space.m },
  lockedBody: { fontFamily: font.serif, fontSize: type.small, lineHeight: 22, color: color.inkMuted, textAlign: 'center', marginTop: space.m },
  unlockButton: { backgroundColor: color.ink, borderRadius: 999, minHeight: 50, paddingHorizontal: space.l, justifyContent: 'center', marginTop: space.xl },
  unlockText: { fontFamily: font.serifMedium, fontSize: type.badge, color: color.paper, letterSpacing: 1.4 },
});
