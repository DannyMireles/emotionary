import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TypeBadge } from '@/components/TypeBadge';
import type { Word } from '@/content/types';
import { lightImpactHaptic, selectionHaptic } from '@/feedback/haptics';
import { useUserStore } from '@/store/userStore';
import { color, font, letterSpacing, levelPalettes, space, type } from '@/theme/tokens';

/**
 * The full word layout shared by Today and Word Detail (DESIGN.md §5.1/§5.3):
 * type badge → display-serif word → [pronunciation] → origin → definition,
 * with the wisdom line + SAVE/SHARE anchored at the bottom.
 */
export function WordFull({ word }: { word: Word }) {
  const isFavorite = useUserStore((s) => s.favorites.includes(word.slug));
  const toggleFavorite = useUserStore((s) => s.toggleFavorite);
  const palette = levelPalettes[word.level];

  return (
    <View style={[styles.screen, { backgroundColor: palette.tint }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <TypeBadge wordType={word.type} />
          <Text
            style={styles.word}
            maxFontSizeMultiplier={1.4}
            accessibilityRole="header"
            accessibilityLabel={`${word.word}. ${word.language}. Level ${word.level}.`}
          >
            {word.word}
          </Text>
          <Text style={styles.pronunciation} maxFontSizeMultiplier={1.6}>
            [{word.pronunciation}]
          </Text>
          <Text style={styles.origin}>{word.language.toUpperCase()}</Text>
          <Text style={styles.definition}>{word.definition}</Text>
        </View>

        <View style={styles.bottom}>
          <View style={styles.rule} />
          <Text style={styles.wisdom}>{word.wisdom}</Text>
          <Text style={styles.fromBook}>from Emotionary, the book</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                lightImpactHaptic();
                toggleFavorite(word.slug);
              }}
              style={styles.action}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Remove from saved words' : 'Save this word'}
              hitSlop={8}
            >
              <Text style={[styles.actionGlyph, isFavorite && { color: palette.deep }]}>
                {isFavorite ? '♥' : '♡'}
              </Text>
              <Text style={styles.actionLabel}>{isFavorite ? 'SAVED' : 'SAVE'}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                selectionHaptic();
                router.push(`/share/${word.slug}`);
              }}
              style={styles.action}
              accessibilityRole="button"
              accessibilityLabel="Share this word as an image card"
              hitSlop={8}
            >
              <Text style={styles.actionGlyph}>↗</Text>
              <Text style={styles.actionLabel}>SHARE</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: space.l, paddingTop: space.m, paddingBottom: space.l },
  top: { flexGrow: 1, alignItems: 'center' },
  word: {
    fontFamily: font.display,
    fontSize: type.hero,
    color: color.ink,
    textAlign: 'center',
    marginTop: space.l,
  },
  pronunciation: {
    fontFamily: font.serifItalic,
    fontSize: type.small,
    color: color.inkMuted,
    marginTop: space.s,
    textAlign: 'center',
  },
  origin: {
    fontFamily: font.serifMedium,
    fontSize: type.caption,
    letterSpacing: letterSpacing.caps,
    color: color.inkFaint,
    marginTop: space.xs,
    textAlign: 'center',
  },
  definition: {
    fontFamily: font.serif,
    fontSize: type.body,
    lineHeight: type.body * 1.65,
    color: color.ink,
    marginTop: space.xl,
    alignSelf: 'stretch',
  },
  bottom: { alignItems: 'center', marginTop: space.xxl },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: color.hairline, alignSelf: 'stretch' },
  wisdom: {
    fontFamily: font.serifItalic,
    fontSize: type.body,
    lineHeight: type.body * 1.5,
    color: color.ink,
    textAlign: 'center',
    marginTop: space.l,
    paddingHorizontal: space.m,
  },
  fromBook: {
    fontFamily: font.serif,
    fontSize: type.caption,
    color: color.inkFaint,
    marginTop: space.s,
  },
  actions: {
    flexDirection: 'row',
    gap: space.xxl,
    marginTop: space.l,
  },
  action: { alignItems: 'center', gap: 4, minWidth: 44, minHeight: 44, justifyContent: 'center' },
  actionGlyph: { fontSize: 22, color: color.ink },
  actionLabel: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
  },
});
