import type { Word } from '@/content/types';
import { seededShuffle, wordOfDay } from '@/daily/engine';

const FEED_SEED_PREFIX = 'emotionary-feed-v1:';

/**
 * Keeps the daily word first, then gives the rest of Today a stable,
 * random-looking order for the local day. The order only changes at midnight,
 * so content never jumps while someone is reading.
 */
export function dailyFeed(words: readonly Word[], localDate: string): Word[] {
  const today = wordOfDay(words, localDate);
  if (!today) return [];

  const rest = words.filter((word) => word.id !== today.id);
  return [today, ...seededShuffle(rest, FEED_SEED_PREFIX + localDate)];
}
