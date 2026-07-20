import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import { WordFull } from '@/components/WordFull';
import { StreakCalendar } from '@/components/StreakCalendar';
import type { Word } from '@/content/types';
import { useContentStore } from '@/content/store';
import { localDateString } from '@/daily/engine';
import { dailyFeed } from '@/daily/feed';
import { useUserStore } from '@/store/userStore';
import { color, font, levelPalettes, type } from '@/theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 70,
  minimumViewTime: 450,
} as const;

export default function TodayScreen() {
  const words = useContentStore((s) => s.words);
  const recordOpen = useUserStore((s) => s.recordOpen);
  const markRead = useUserStore((s) => s.markRead);
  const streak = useUserStore((s) => s.streakState.streak);
  const hasFullAccess = useUserStore((s) => s.accessLevel === 'full');
  const [feedHeight, setFeedHeight] = useState(0);
  const [visibleLevel, setVisibleLevel] = useState<Word['level']>(1);

  const today = localDateString();
  const feed = useMemo(() => {
    const all = dailyFeed(words, today);
    return hasFullAccess ? all : all.slice(0, 1);
  }, [words, today, hasFullAccess]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setFeedHeight((current) => (current === nextHeight ? current : nextHeight));
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Word>[] }) => {
      const visibleWord = viewableItems.find((token) => token.isViewable)?.item;
      if (visibleWord) {
        markRead(visibleWord.slug);
        setVisibleLevel(visibleWord.level);
      }
    },
    [markRead],
  );

  useFocusEffect(
    useCallback(() => {
      recordOpen(today);
      if (feed[0]) markRead(feed[0].slug);
    }, [recordOpen, markRead, today, feed]),
  );

  if (feed.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No words yet. Check back soon.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: levelPalettes[visibleLevel].tint }]}
      edges={['top']}
    >
      <StreakCalendar streak={Math.max(streak, 1)} />
      <View style={styles.container} onLayout={onLayout}>
        <FlatList
          data={feed}
          keyExtractor={(word) => word.slug}
          renderItem={({ item }) => (
            <View style={feedHeight > 0 ? { height: feedHeight } : styles.page}>
              <WordFull word={item} feedPage insideSafeArea />
            </View>
          )}
          pagingEnabled={feedHeight > 0}
          decelerationRate="fast"
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          viewabilityConfig={VIEWABILITY_CONFIG}
          onViewableItemsChanged={onViewableItemsChanged}
          getItemLayout={
            feedHeight > 0
              ? (_, index) => ({ length: feedHeight, offset: feedHeight * index, index })
              : undefined
          }
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={3}
          accessibilityLabel="Daily word feed"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  container: { flex: 1 },
  page: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.paper },
  emptyText: { fontFamily: font.serif, fontSize: type.body, color: color.inkMuted },
});
