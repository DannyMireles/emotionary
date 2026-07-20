import type { Word } from '@/content/types';

/**
 * Monetization seam. The beta uses a local full-access flag so both the free
 * and unlocked experiences can be tested without charging anyone in TestFlight.
 * A store-backed entitlement can replace that flag in this module later.
 *
 * Locked product rule: today's word is ALWAYS free (freemium must never
 * break the daily loop).
 */
const FREE_PREVIEW_SLUGS = new Set(['anhedonia', 'apricity', 'komorebi']);

export function canViewWord(
  word: Word,
  todaysSlug: string | null,
  hasFullAccess: boolean,
): boolean {
  return hasFullAccess || FREE_PREVIEW_SLUGS.has(word.slug) || word.slug === todaysSlug;
}
