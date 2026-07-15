import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Text } from 'react-native';

import type { WordType } from '@/content/types';

const symbols: Record<WordType, SymbolViewProps['name']> = {
  wanderword: { ios: 'globe', android: 'globe', web: 'globe' },
  hidden_english: {
    ios: 'building.columns',
    android: 'account_balance',
    web: 'account_balance',
  },
  psychology: { ios: 'brain', android: 'psychology', web: 'psychology' },
};

const fallbacks: Record<WordType, string> = {
  wanderword: '◎',
  hidden_english: '▥',
  psychology: '◌',
};

export function WordTypeIcon({
  wordType,
  size = 16,
  color,
  style,
}: {
  wordType: WordType;
  size?: number;
  color: SymbolViewProps['tintColor'];
  style?: SymbolViewProps['style'];
}) {
  return (
    <SymbolView
      name={symbols[wordType]}
      size={size}
      tintColor={color}
      weight="light"
      resizeMode="scaleAspectFit"
      style={style}
      fallback={<Text style={{ color, fontSize: size }}>{fallbacks[wordType]}</Text>}
    />
  );
}
