import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { WordTypeIcon } from '@/components/word-type-icon';
import type { Word } from '@/content/types';
import { selectionHaptic } from '@/feedback/haptics';
import { color, font, levelPalettes, space, type } from '@/theme/tokens';

/** Browse list card: word + one-line preview, tinted by level (prototype). */
export function WordCard({ word }: { word: Word }) {
  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        router.push(`/word/${word.slug}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: levelPalettes[word.level].tint },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${word.word}. ${word.definition}`}
    >
      <Text style={styles.word} maxFontSizeMultiplier={1.6}>
        {word.word}
      </Text>
      <Text style={styles.preview} numberOfLines={1}>
        {word.definition}
      </Text>
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
});
