import { StyleSheet, Text, View } from 'react-native';

import type { WordType } from '@/content/types';
import { color, font, letterSpacing, type, typeMeta } from '@/theme/tokens';

export function TypeBadge({ wordType, muted = false }: { wordType: WordType; muted?: boolean }) {
  const meta = typeMeta[wordType];
  return (
    <View style={styles.row} accessibilityElementsHidden>
      <Text style={[styles.glyph, muted && styles.muted]}>{meta.glyph}</Text>
      <Text style={[styles.label, muted && styles.muted]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  glyph: {
    fontSize: type.badge + 1,
    color: color.inkMuted,
  },
  label: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.badge,
    color: color.inkMuted,
  },
  muted: {
    color: color.inkFaint,
  },
});
