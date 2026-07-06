import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WordCard } from '@/components/WordCard';
import { BOOK_COPY, BOOK_THUMBNAIL_URL, BOOK_URL } from '@/config';
import { findWord, useContentStore } from '@/content/store';
import { lightImpactHaptic, selectionHaptic } from '@/feedback/haptics';
import { useUserStore } from '@/store/userStore';
import { color, font, letterSpacing, space, type } from '@/theme/tokens';

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.tile} accessibilityLabel={`${value} ${label.toLowerCase()}`}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function SettingsMark() {
  return (
    <View style={styles.settingsMark}>
      <View style={styles.settingsLine}>
        <View style={[styles.settingsKnob, { left: 5 }]} />
      </View>
      <View style={styles.settingsLine}>
        <View style={[styles.settingsKnob, { right: 6 }]} />
      </View>
      <View style={styles.settingsLine}>
        <View style={[styles.settingsKnob, { left: 13 }]} />
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const words = useContentStore((s) => s.words);
  const streak = useUserStore((s) => s.streakState.streak);
  const readCount = useUserStore((s) => s.readSlugs.length);
  const favorites = useUserStore((s) => s.favorites);
  const sharedCount = useUserStore((s) => s.sharedCount);

  const favoriteWords = favorites
    .map((slug) => findWord(words, slug))
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  const allZero = streak === 0 && readCount === 0 && favorites.length === 0 && sharedCount === 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title} accessibilityRole="header">
            Your Stats
          </Text>
          <Pressable
            onPress={() => {
              selectionHaptic();
              router.push('/settings');
            }}
            style={styles.settingsButton}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={8}
          >
            <SettingsMark />
          </Pressable>
        </View>

        {allZero && (
          <Text style={styles.zeroCopy}>Your streak starts today. Read your first word.</Text>
        )}

        <View style={styles.grid}>
          <StatTile value={streak} label="DAY STREAK" />
          <StatTile value={readCount} label="WORDS READ" />
          <StatTile value={favorites.length} label="FAVORITED" />
          <StatTile value={sharedCount} label="SHARED" />
        </View>

        <Text style={styles.section}>FAVORITED WORDS</Text>
        {favoriteWords.length === 0 ? (
          <Text style={styles.emptyFavorites}>
            Tap ♡ SAVE on any word to keep it here.
          </Text>
        ) : (
          favoriteWords.map((w) => <WordCard key={w.slug} word={w} />)
        )}

        <Pressable
          style={styles.bookCard}
          onPress={() => {
            lightImpactHaptic();
            void Linking.openURL(BOOK_URL);
          }}
          accessibilityRole="link"
          accessibilityLabel="Get the book"
        >
          {BOOK_THUMBNAIL_URL.length > 0 && (
            <Image
              source={{ uri: BOOK_THUMBNAIL_URL }}
              style={styles.bookCover}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          )}
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle}>The book</Text>
            {BOOK_COPY.length > 0 && <Text style={styles.bookBlurb}>{BOOK_COPY}</Text>}
            <Text style={styles.bookCta}>GET THE BOOK →</Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  scroll: { paddingHorizontal: space.l, paddingBottom: space.xl },
  headerRow: { marginTop: space.s },
  title: {
    fontFamily: font.display,
    fontSize: type.title,
    color: color.ink,
    textAlign: 'center',
  },
  settingsButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 44,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  settingsMark: { width: 24, gap: 5 },
  settingsLine: {
    height: 1,
    backgroundColor: color.inkMuted,
  },
  settingsKnob: {
    position: 'absolute',
    top: -3,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: color.inkMuted,
    backgroundColor: color.paper,
  },
  zeroCopy: {
    fontFamily: font.serifItalic,
    fontSize: type.small,
    color: color.inkMuted,
    textAlign: 'center',
    marginTop: space.m,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s + 2,
    marginTop: space.l,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: color.card,
    borderColor: color.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: space.l,
  },
  tileValue: { fontFamily: font.display, fontSize: 34, color: color.ink },
  tileLabel: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkFaint,
    marginTop: 4,
  },
  section: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
    marginTop: space.xl,
    marginBottom: space.m,
  },
  emptyFavorites: {
    fontFamily: font.serif,
    fontSize: type.small,
    color: color.inkFaint,
  },
  bookCard: {
    flexDirection: 'row',
    gap: space.m,
    backgroundColor: color.card,
    borderColor: color.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: space.m,
    marginTop: space.xl,
    alignItems: 'center',
  },
  bookCover: {
    width: 64,
    height: 88,
    borderRadius: 4,
    backgroundColor: color.hairline,
  },
  bookInfo: { flex: 1 },
  bookTitle: { fontFamily: font.serifSemiBold, fontSize: type.body, color: color.ink },
  bookBlurb: {
    fontFamily: font.serif,
    fontSize: type.small - 1,
    color: color.inkMuted,
    marginTop: 2,
  },
  bookCta: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.ink,
    marginTop: space.s,
    textDecorationLine: 'underline',
  },
});
