import type { Word } from '@/content/types';
import {
  addDays,
  daysSinceEpoch,
  fnv1a,
  localDateString,
  monthKey,
  monthPermutation,
  rotationSet,
  seededShuffle,
  wordOfDay,
} from '@/daily/engine';

import seedJson from '../../../assets/seed/words.json';

const seedWords = (seedJson as { words: Word[] }).words;

function makeWord(slug: string, publishedAt: string): Word {
  return {
    id: `local-${slug}`,
    slug,
    word: slug,
    pronunciation: slug,
    language: 'English',
    type: 'hidden_english',
    level: 1,
    definition: `def ${slug}`,
    wisdom: `wisdom ${slug}`,
    is_free: true,
    published_at: publishedAt,
    updated_at: publishedAt,
  };
}

describe('protocol primitives (GOLDEN — changing any value requires bumping SEED_PREFIX)', () => {
  test('fnv1a matches the standard test vector and the pinned seed hash', () => {
    expect(fnv1a('abc')).toBe(440920331); // 0x1a47e90b, canonical FNV-1a vector
    expect(fnv1a('emotionary-v1:2026-07')).toBe(628389852);
  });

  test('seededShuffle is pinned', () => {
    expect(seededShuffle(['a', 'b', 'c', 'd', 'e'], 'emotionary-v1:test')).toEqual([
      'a',
      'e',
      'b',
      'c',
      'd',
    ]);
  });

  test('daysSinceEpoch is pure date-component math', () => {
    expect(daysSinceEpoch('1970-01-01')).toBe(0);
    expect(daysSinceEpoch('2026-07-03')).toBe(20637);
    expect(daysSinceEpoch('2028-02-29')).toBe(21243); // leap day
  });

  test('golden daily words for a fixed synthetic word list (content-independent)', () => {
    // Synthetic fixtures, NOT the bundled seed — content imports and the
    // local-ids → cloud-uuids migration must never break protocol pins.
    const fixture = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'].map(
      (s) => makeWord(s, '2025-12-01T00:00:00.000Z'),
    );
    // makeWord ids are `local-<slug>`; pin against `fixture-<slug>` ordering instead
    const fixtureIds = fixture.map((w) => ({ ...w, id: `fixture-${w.slug}` }));
    expect(monthPermutation(fixtureIds, '2026-07').map((w) => w.slug)).toEqual([
      'alpha',
      'foxtrot',
      'echo',
      'charlie',
      'bravo',
      'golf',
      'delta',
      'hotel',
    ]);
    expect(wordOfDay(fixtureIds, '2026-07-03')?.slug).toBe('golf');
    expect(wordOfDay(fixtureIds, '2026-07-04')?.slug).toBe('delta');
    expect(wordOfDay(fixtureIds, '2026-07-31')?.slug).toBe('foxtrot');
    expect(wordOfDay(fixtureIds, '2026-08-01')?.slug).toBe('alpha');
  });
});

describe('determinism', () => {
  test('same inputs → identical permutation on repeated computation', () => {
    const a = monthPermutation(seedWords, '2026-09').map((w) => w.slug);
    const b = monthPermutation(seedWords, '2026-09').map((w) => w.slug);
    expect(a).toEqual(b);
  });

  test('permutation is a true permutation of the rotation set', () => {
    const perm = monthPermutation(seedWords, '2026-07').map((w) => w.slug);
    const set = rotationSet(seedWords, '2026-07').map((w) => w.slug);
    expect([...perm].sort()).toEqual([...set].sort());
  });

  test('word list order does not matter (sorted by id internally)', () => {
    const reversed = [...seedWords].reverse();
    expect(wordOfDay(reversed, '2026-07-12')?.slug).toBe(
      wordOfDay(seedWords, '2026-07-12')?.slug,
    );
  });
});

describe('monthly freeze', () => {
  test('publishing a word mid-month does NOT change the current month', () => {
    const newWord = makeWord('zz-new-word', '2026-07-15T12:00:00.000Z');
    const withNew = [...seedWords, newWord];
    for (const day of ['2026-07-16', '2026-07-20', '2026-07-31']) {
      expect(wordOfDay(withNew, day)?.slug).toBe(wordOfDay(seedWords, day)?.slug);
    }
  });

  test('a mid-month publish joins the rotation at the next month boundary', () => {
    const newWord = makeWord('zz-new-word', '2026-07-15T12:00:00.000Z');
    const withNew = [...seedWords, newWord];
    expect(rotationSet(withNew, '2026-07').map((w) => w.slug)).not.toContain('zz-new-word');
    expect(rotationSet(withNew, '2026-08').map((w) => w.slug)).toContain('zz-new-word');
  });
});

describe('bootstrap fallbacks', () => {
  test('all words published in the current month → fallback uses all words (no empty rotation)', () => {
    const freshWords = ['a', 'b', 'c'].map((s) => makeWord(s, '2026-07-02T00:00:00.000Z'));
    const w = wordOfDay(freshWords, '2026-07-10');
    expect(w).not.toBeNull();
    expect(['a', 'b', 'c']).toContain(w!.slug);
  });

  test('zero words → null (never a crash)', () => {
    expect(wordOfDay([], '2026-07-10')).toBeNull();
  });

  test('invalid published_at values are excluded, not fatal', () => {
    const bad = { ...makeWord('bad', ''), published_at: 'not-a-date' };
    const w = wordOfDay([...seedWords, bad], '2026-07-10');
    expect(w).not.toBeNull();
  });
});

describe('month-boundary repeat guard', () => {
  test('no word ever repeats across any month boundary (24 months, small pool)', () => {
    // Small pools maximize collision probability; the guard must prevent all.
    for (const poolSize of [2, 3, 5]) {
      const pool = Array.from({ length: poolSize }, (_, i) =>
        makeWord(`w${i}`, '2025-01-01T00:00:00.000Z'),
      );
      let date = '2026-02-01';
      for (let i = 0; i < 730; i++) {
        const prev = addDays(date, -1);
        if (monthKey(prev) !== monthKey(date)) {
          expect(wordOfDay(pool, prev)?.slug).not.toBe(wordOfDay(pool, date)?.slug);
        }
        date = addDays(date, 1);
      }
    }
  });

  test('guard is stable when computed with a shared or fresh cache', () => {
    const cache = new Map<string, Word[]>();
    const a = wordOfDay(seedWords, '2026-08-01', cache)?.slug;
    const b = wordOfDay(seedWords, '2026-08-01')?.slug;
    expect(a).toBe(b);
  });
});

describe('date helpers', () => {
  test('addDays crosses months, years, DST transition dates as pure calendar math', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09'); // US spring-forward date
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02'); // US fall-back date
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // leap
    expect(daysSinceEpoch('2026-03-09') - daysSinceEpoch('2026-03-08')).toBe(1);
  });

  test('localDateString formats a Date in local calendar terms', () => {
    expect(localDateString(new Date(2026, 6, 3, 23, 59))).toBe('2026-07-03');
    expect(localDateString(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});
