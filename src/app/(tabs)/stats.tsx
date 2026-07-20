import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientInk } from '@/components/AmbientInk';
import { StatsBurst } from '@/components/stats-burst';
import { WordCard } from '@/components/WordCard';
import { BOOK_COPY, BOOK_URL } from '@/config';
import { findWord, useContentStore } from '@/content/store';
import { lightImpactHaptic, mediumImpactHaptic, selectionHaptic } from '@/feedback/haptics';
import { STATS_OPEN_EVENT } from '@/stats/events';
import { useUserStore } from '@/store/userStore';
import { color, font, letterSpacing, levelPalettes, space, type } from '@/theme/tokens';

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

function WidgetShowcase({ onOpen }: { onOpen: () => void }) {
  return (
    <View style={styles.widgetWrap}>
      <Text style={styles.section}>WIDGETS</Text>
      <View style={styles.widgetCards}>
        <Pressable style={styles.widgetCard} onPress={onOpen} accessibilityRole="button">
          <View style={styles.homeWidgetPreview}>
            <Text style={styles.widgetWord}>Apricity</Text>
            <Text style={styles.widgetDefinition} numberOfLines={4}>
              The warmth of the sun on a cold winter&apos;s day.
            </Text>
          </View>
          <Text style={styles.widgetTitle}>Home Screen</Text>
          <Text style={styles.widgetLink}>CONFIGURE</Text>
        </Pressable>
        <Pressable style={styles.widgetCard} onPress={onOpen} accessibilityRole="button">
          <View style={styles.lockWidgetPreview}>
            <Text style={styles.lockTime}>11:19</Text>
            <Text style={styles.lockWidgetWord}>Apricity</Text>
            <Text style={styles.lockWidgetPronunciation}>[uh-PRIS-ih-tee]</Text>
          </View>
          <Text style={styles.widgetTitle}>Lock Screen</Text>
          <Text style={styles.widgetLink}>LEARN HOW</Text>
        </Pressable>
      </View>
      <View style={styles.widgetSettings}>
        <Text style={styles.widgetSettingsTitle}>Widget Settings</Text>
        <SettingsRow label="Topics" value="Mix" />
        <SettingsRow label="Theme" value="Auto" />
        <SettingsRow label="Widget Border" value="On" />
        <SettingsRow label="Refresh" value="Hourly" />
      </View>
    </View>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.widgetSettingsRow}>
      <Text style={styles.widgetSettingsLabel}>{label}</Text>
      <Text style={styles.widgetSettingsValue}>{value}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const words = useContentStore((s) => s.words);
  const streak = useUserStore((s) => s.streakState.streak);
  const readCount = useUserStore((s) => s.readSlugs.length);
  const favorites = useUserStore((s) => s.favorites);
  const sharedCount = useUserStore((s) => s.sharedCount);
  const scrollRef = useRef<ScrollView>(null);
  const lastOpenAt = useRef(0);
  const [burstKey, setBurstKey] = useState(0);

  const favoriteWords = favorites
    .map((slug) => findWord(words, slug))
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  const allZero = streak === 0 && readCount === 0 && favorites.length === 0 && sharedCount === 0;
  const openStats = useCallback(() => {
    const now = Date.now();
    if (now - lastOpenAt.current < 120) return;
    lastOpenAt.current = now;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    mediumImpactHaptic();
    setBurstKey((current) => current + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      openStats();
    }, [openStats]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(STATS_OPEN_EVENT, openStats);
    return () => sub.remove();
  }, [openStats]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AmbientInk />
      <StatsBurst burstKey={burstKey} />
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={styles.emptyFavorites}>Tap ♡ SAVE on any word to keep it here.</Text>
        ) : (
          favoriteWords.map((w) => <WordCard key={w.slug} word={w} />)
        )}

        <WidgetShowcase
          onOpen={() => {
            selectionHaptic();
            Alert.alert(
              'Add the daily widget',
              'Touch and hold the Home or Lock Screen, tap Edit or Customize, then Add Widget and choose Emotionary.',
            );
          }}
        />

        <Pressable
            style={styles.bookCard}
            onPress={() => {
              lightImpactHaptic();
              void Linking.openURL(BOOK_URL);
            }}
            accessibilityRole="link"
            accessibilityLabel="Get the book"
          >
            <Image
              source={require('../../../assets/images/book-cover.png')}
              style={styles.bookCover}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
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
  scroll: { paddingHorizontal: space.l, paddingBottom: 112 },
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
  widgetWrap: { marginTop: space.xl },
  widgetCards: {
    flexDirection: 'row',
    gap: space.s + 2,
  },
  widgetCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: 'rgba(255,255,255,0.68)',
    padding: space.m,
    alignItems: 'center',
  },
  homeWidgetPreview: {
    width: 82,
    height: 82,
    borderRadius: 16,
    backgroundColor: levelPalettes[1].deep,
    padding: space.s,
    justifyContent: 'center',
  },
  widgetWord: {
    fontFamily: font.display,
    fontSize: type.small,
    color: levelPalettes[1].onDeep,
    textAlign: 'center',
  },
  widgetDefinition: {
    fontFamily: font.serif,
    fontSize: 8,
    lineHeight: 10,
    color: levelPalettes[1].onDeep,
    textAlign: 'center',
    marginTop: 3,
  },
  lockWidgetPreview: {
    width: 82,
    height: 82,
    borderRadius: 18,
    backgroundColor: color.ink,
    padding: space.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTime: { fontFamily: font.display, fontSize: type.body, color: color.paper },
  lockWidgetWord: {
    fontFamily: font.serifSemiBold,
    fontSize: type.caption,
    color: color.paper,
    marginTop: 2,
  },
  lockWidgetPronunciation: {
    fontFamily: font.serif,
    fontSize: 7,
    color: 'rgba(255,255,255,0.68)',
  },
  widgetTitle: {
    fontFamily: font.serifSemiBold,
    fontSize: type.caption,
    color: color.ink,
    marginTop: space.s,
  },
  widgetLink: {
    fontFamily: font.serifMedium,
    fontSize: 8,
    letterSpacing: 0.6,
    color: color.inkMuted,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  widgetSettings: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: color.card,
    paddingHorizontal: space.m,
    paddingTop: space.m,
    marginTop: space.s + 2,
  },
  widgetSettingsTitle: {
    fontFamily: font.display,
    fontSize: type.body,
    color: color.ink,
    textAlign: 'center',
    marginBottom: space.s,
  },
  widgetSettingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.hairline,
    paddingVertical: space.s,
  },
  widgetSettingsLabel: { fontFamily: font.serif, fontSize: type.small, color: color.ink },
  widgetSettingsValue: { fontFamily: font.serif, fontSize: type.small, color: color.inkMuted },
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
