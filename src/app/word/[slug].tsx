import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WordFull } from '@/components/WordFull';
import { findWord, useContentStore } from '@/content/store';
import { selectionHaptic } from '@/feedback/haptics';
import { useUserStore } from '@/store/userStore';
import { color, font, levelPalettes, space, type } from '@/theme/tokens';

export default function WordDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const words = useContentStore((s) => s.words);
  const sync = useContentStore((s) => s.sync);
  const markRead = useUserStore((s) => s.markRead);

  const word = slug ? findWord(words, slug) : undefined;

  useFocusEffect(
    useCallback(() => {
      if (word) markRead(word.slug);
    }, [word, markRead]),
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
          <Text style={styles.backGlyph}>←</Text>
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
  backGlyph: { fontSize: 22, color: color.ink },
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
});
