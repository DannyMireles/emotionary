import type { Word } from '@/content/types';

/**
 * Daily-word engine — DESIGN.md §7.
 *
 * PROTOCOL WARNING: everything in this file is a cross-device, cross-version
 * protocol. Every client (and the notification scheduler) must compute
 * byte-identical permutations forever. Changing ANY algorithm here requires
 * bumping SEED_PREFIX to 'emotionary-v2:' (deliberately re-rolling everyone).
 * Golden fixtures in __tests__ pin exact outputs.
 */

export const SEED_PREFIX = 'emotionary-v1:';

/** No daily words are defined for months before the first content existed. */
export const EPOCH_MONTH = '2026-01';

/** FNV-1a 32-bit hash of a string. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG over a 32-bit seed. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher–Yates shuffle driven by mulberry32(fnv1a(seed)). */
export function seededShuffle<T>(items: readonly T[], seedStr: string): T[] {
  const out = items.slice();
  const rand = mulberry32(fnv1a(seedStr));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Whole days since the Unix epoch for a local calendar date string.
 * Pure integer math on the date components — NEVER a live timestamp, so
 * timezones and DST cannot shift a "day" (DESIGN.md §7).
 */
export function daysSinceEpoch(localDate: string): number {
  const [y, m, d] = localDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** 'YYYY-MM-DD' in the device's local calendar. */
export function localDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthKey(localDate: string): string {
  return localDate.slice(0, 7);
}

/** Inverse of daysSinceEpoch. */
export function dateStringFromEpochDays(days: number): string {
  const d = new Date(days * 86_400_000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Add n calendar days to a 'YYYY-MM-DD' date string. */
export function addDays(localDate: string, n: number): string {
  return dateStringFromEpochDays(daysSinceEpoch(localDate) + n);
}

function monthStartUtcMs(mKey: string): number {
  const [y, m] = mKey.split('-').map(Number);
  return Date.UTC(y, m - 1, 1);
}

function prevMonthKey(mKey: string): string {
  const [y, m] = mKey.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lastDateOfMonth(mKey: string): string {
  const [y, m] = mKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${mKey}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Rotation set for a month: words published strictly before the month began
 * (the monthly freeze — publishing mid-month never disturbs the current month).
 * Fallback for bootstrap/misconfiguration: if empty, all words qualify.
 * Sorted by id so the input order to the shuffle is stable everywhere.
 */
export function rotationSet(words: readonly Word[], mKey: string): Word[] {
  const start = monthStartUtcMs(mKey);
  const eligible = words.filter((w) => {
    const t = Date.parse(w.published_at);
    return Number.isFinite(t) && t < start;
  });
  const pool = eligible.length > 0 ? eligible : words.slice();
  return pool.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function rawPermutation(words: readonly Word[], mKey: string): Word[] {
  return seededShuffle(rotationSet(words, mKey), SEED_PREFIX + mKey);
}

/**
 * The month's permutation with the month-boundary repeat guard applied:
 * if day 1 of this month would repeat the last word of the previous month,
 * swap it with the next slot (DESIGN.md §7). The guard recurses backward
 * (bounded by EPOCH_MONTH) because "the previous month's word" is itself
 * guard-adjusted; memoize per (words, month) via the cache argument.
 */
export function monthPermutation(
  words: readonly Word[],
  mKey: string,
  cache: Map<string, Word[]> = new Map(),
): Word[] {
  const cached = cache.get(mKey);
  if (cached) return cached;

  const perm = rawPermutation(words, mKey);
  if (perm.length < 2 || mKey <= EPOCH_MONTH) {
    cache.set(mKey, perm);
    return perm;
  }

  const prevKey = prevMonthKey(mKey);
  const prevPerm = monthPermutation(words, prevKey, cache);
  if (prevPerm.length > 0) {
    const prevLast = lastDateOfMonth(prevKey);
    const prevWord = prevPerm[daysSinceEpoch(prevLast) % prevPerm.length];
    const i1 = daysSinceEpoch(`${mKey}-01`) % perm.length;
    if (perm[i1].id === prevWord.id) {
      const i2 = (i1 + 1) % perm.length;
      [perm[i1], perm[i2]] = [perm[i2], perm[i1]];
    }
  }
  cache.set(mKey, perm);
  return perm;
}

/**
 * The word of the day for a local calendar date — deterministic on any device
 * from the same word list. Returns null only when there are no words at all.
 * (V1.5 adds daily_overrides precedence here: `override ?? perm[dayIndex]`.)
 */
export function wordOfDay(
  words: readonly Word[],
  localDate: string,
  cache?: Map<string, Word[]>,
): Word | null {
  const perm = monthPermutation(words, monthKey(localDate), cache);
  if (perm.length === 0) return null;
  return perm[daysSinceEpoch(localDate) % perm.length];
}
