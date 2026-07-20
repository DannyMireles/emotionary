import type { ImageStyle } from 'expo-image';
import type { ColorValue, StyleProp } from 'react-native';

import { SystemIcon } from '@/components/system-icon';
import type { WordType } from '@/content/types';

const symbols: Record<WordType, string> = {
  wanderword: 'globe',
  hidden_english: 'building.columns',
  psychology: 'brain',
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
  color: ColorValue;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <SystemIcon
      name={symbols[wordType]}
      fallback={fallbacks[wordType]}
      size={size}
      color={color}
      style={style}
    />
  );
}
