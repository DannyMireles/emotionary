import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WordTypeIcon } from '@/components/word-type-icon';
import type { Word } from '@/content/types';
import { selectionHaptic } from '@/feedback/haptics';
import { color, font, levelPalettes, space, type } from '@/theme/tokens';

/** Browse list card: word + one-line preview, tinted by level (prototype). */
export function WordCard({ word, locked = false }: { word: Word; locked?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        router.push((locked ? '/paywall' : `/word/${word.slug}`) as Href);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: levelPalettes[word.level].tint },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${word.word}. Locked word.` : `${word.word}. ${word.definition}`}
    >
      <Text style={styles.word} maxFontSizeMultiplier={1.6}>
        {word.word}
      </Text>
      {locked ? (
        <View style={styles.lockedRow}>
          <Text style={styles.preview}>Unlock full access to read this word</Text>
          <Text style={styles.lock}>LOCKED</Text>
        </View>
      ) : (
        <Text style={styles.preview} numberOfLines={1}>{word.definition}</Text>
      )}
      <WordTypeIcon
        wordType={word.type}
        size={15}
        color={color.inkFaint}
        style={styles.glyph}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    paddingVertical: space.m,
    paddingHorizontal: space.m,
    marginBottom: space.s + 2,
  },
  pressed: { opacity: 0.75 },
  word: {
    fontFamily: font.serifSemiBold,
    fontSize: type.body + 1,
    color: color.ink,
  },
  preview: {
    fontFamily: font.serif,
    fontSize: type.small - 1,
    color: color.inkMuted,
    marginTop: 3,
    paddingRight: space.l,
  },
  glyph: {
    position: 'absolute',
    right: space.m,
    top: space.m + 2,
  },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingRight: space.l },
  lock: {
    fontFamily: font.serifMedium,
    fontSize: 8,
    letterSpacing: 0.8,
    color: color.inkMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.inkMuted,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
});
