import { StyleSheet, Text, View } from 'react-native';

import { WordTypeIcon } from '@/components/word-type-icon';
import type { WordType } from '@/content/types';
import { color, font, letterSpacing, type, typeMeta } from '@/theme/tokens';

export function TypeBadge({ wordType, muted = false }: { wordType: WordType; muted?: boolean }) {
  const meta = typeMeta[wordType];
  return (
    <View style={styles.row} accessibilityElementsHidden>
      <WordTypeIcon
        wordType={wordType}
        size={type.badge + 3}
        color={muted ? color.inkFaint : color.inkMuted}
      />
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
