import { Platform } from 'react-native';

import type { Word } from '@/content/types';
import { addDays, localDateString, wordOfDay } from '@/daily/engine';
import { color, levelPalettes } from '@/theme/tokens';
import DailyWordWidget, { type DailyWordWidgetProps } from '@/widgets/DailyWordWidget';

function propsForWord(word: Word): DailyWordWidgetProps {
  const palette = levelPalettes[word.level];
  return {
    word: word.word,
    pronunciation: word.pronunciation,
    definition: word.definition,
    tint: palette.tint,
    ink: color.ink,
    slug: word.slug,
  };
}

export function refreshDailyWordWidget(words: readonly Word[]): void {
  if (Platform.OS !== 'ios' || words.length === 0) return;

  const start = localDateString();
  const entries = Array.from({ length: 90 }, (_, offset) => {
    const dateString = addDays(start, offset);
    const word = wordOfDay(words, dateString);
    const date = new Date(`${dateString}T00:01:00`);
    return word ? { date, props: propsForWord(word) } : null;
  }).filter((entry): entry is { date: Date; props: DailyWordWidgetProps } => entry !== null);

  if (entries.length > 0) DailyWordWidget.updateTimeline(entries);
}
