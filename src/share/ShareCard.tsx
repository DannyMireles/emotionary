import { StyleSheet, Text, View } from 'react-native';

import { BOOK_URL_LABEL } from '@/config';
import type { Word } from '@/content/types';
import { font, letterSpacing, levelPalettes } from '@/theme/tokens';

/**
 * The share card — DESIGN.md §10. Designed on a 1080×1920 canvas (Instagram /
 * Facebook Stories) and rendered at any width via a scale factor; capture
 * resizes to exactly 1080×1920. Level-color full-bleed background; the card
 * is the hook, with pronunciation included for a complete word reference.
 */
export const CARD_BASE_WIDTH = 1080;
export const CARD_BASE_HEIGHT = 1920;

export function ShareCard({ word, width }: { word: Word; width: number }) {
  const s = width / CARD_BASE_WIDTH;
  const palette = levelPalettes[word.level];

  return (
    <View
      style={[
        styles.card,
        {
          width,
          height: CARD_BASE_HEIGHT * s,
          backgroundColor: palette.deep,
          paddingHorizontal: 110 * s,
          paddingVertical: 160 * s,
        },
      ]}
    >
      <View style={styles.center}>
        <Text
          style={{
            fontFamily: font.display,
            fontSize: 128 * s,
            color: palette.onDeep,
            textAlign: 'center',
          }}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {word.word}
        </Text>
        <Text
          style={{
            fontFamily: font.serif,
            fontSize: 34 * s,
            color: palette.onDeep,
            opacity: 0.86,
            textAlign: 'center',
            marginTop: 22 * s,
          }}
        >
          [{word.pronunciation}]
        </Text>
        <View
          style={{
            width: 120 * s,
            height: 3 * s,
            backgroundColor: palette.onDeep,
            opacity: 0.5,
            marginTop: 72 * s,
          }}
        />
        <Text
          style={{
            fontFamily: font.serif,
            fontSize: 50 * s,
            lineHeight: 76 * s,
            color: palette.onDeep,
            textAlign: 'center',
            marginTop: 72 * s,
          }}
          numberOfLines={7}
        >
          {word.definition}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text
          style={{
            fontFamily: font.serifSemiBold,
            fontSize: 36 * s,
            letterSpacing: letterSpacing.badge * 2.4 * s,
            color: palette.onDeep,
            textAlign: 'center',
          }}
        >
          EMOTIONARY
        </Text>
        <Text
          style={{
            fontFamily: font.serif,
            fontSize: 30 * s,
            color: palette.onDeep,
            opacity: 0.85,
            textAlign: 'center',
            marginTop: 18 * s,
          }}
        >
          Get the app + book{`\n`}→ {BOOK_URL_LABEL}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { alignItems: 'center' },
});
