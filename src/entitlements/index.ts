import type { Word } from '@/content/types';

/**
 * Monetization seam — DESIGN.md §9. V1 ships completely free, so this is
 * hardcoded open. When RevenueCat lands, hasFullAccess() swaps to check the
 * cached CustomerInfo entitlement ('full_access') — this file is the only
 * code that changes. Every surface must route through canViewWord().
 *
 * Locked product rule: today's word is ALWAYS free (freemium must never
 * break the daily loop).
 */
export function hasFullAccess(): boolean {
  return true;
}

export function canViewWord(word: Word, todaysSlug: string | null): boolean {
  return hasFullAccess() || word.is_free || word.slug === todaysSlug;
}
