import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WordFull } from '@/components/WordFull';
import { useContentStore } from '@/content/store';
import { localDateString, wordOfDay } from '@/daily/engine';
import { useUserStore } from '@/store/userStore';
import { color, font, levelPalettes, type } from '@/theme/tokens';

export default function TodayScreen() {
  const words = useContentStore((s) => s.words);
  const recordOpen = useUserStore((s) => s.recordOpen);
  const markRead = useUserStore((s) => s.markRead);

  const today = localDateString();
  const word = useMemo(() => wordOfDay(words, today), [words, today]);

  useFocusEffect(
    useCallback(() => {
      recordOpen(today);
      if (word) markRead(word.slug);
    }, [recordOpen, markRead, today, word]),
  );

  if (!word) {
    return (
      <SafeAreaView style={styles.empty} edges={['top']}>
        <Text style={styles.emptyText}>No words yet. Check back soon.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: levelPalettes[word.level].tint }]}
      edges={['top']}
    >
      <View style={styles.container}>
        <WordFull word={word} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.paper },
  emptyText: { fontFamily: font.serif, fontSize: type.body, color: color.inkMuted },
});
