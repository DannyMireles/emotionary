import type { Word } from '@/content/types';
import { wordOfDay } from '@/daily/engine';
import { dailyFeed } from '@/daily/feed';

import seedJson from '../../../assets/seed/words.json';

const seedWords = (seedJson as { words: Word[] }).words;

describe('dailyFeed', () => {
  test('starts with the word of the day and includes every word exactly once', () => {
    const date = '2026-07-15';
    const feed = dailyFeed(seedWords, date);

    expect(feed[0]?.slug).toBe(wordOfDay(seedWords, date)?.slug);
    expect(feed).toHaveLength(seedWords.length);
    expect(new Set(feed.map((word) => word.id)).size).toBe(seedWords.length);
  });

  test('is stable for a day and changes order the next day', () => {
    const today = dailyFeed(seedWords, '2026-07-15').map((word) => word.slug);
    const repeated = dailyFeed(seedWords, '2026-07-15').map((word) => word.slug);
    const tomorrow = dailyFeed(seedWords, '2026-07-16').map((word) => word.slug);

    expect(repeated).toEqual(today);
    expect(tomorrow).not.toEqual(today);
  });

  test('returns an empty feed for an empty corpus', () => {
    expect(dailyFeed([], '2026-07-15')).toEqual([]);
  });
});
