import { daysSinceEpoch } from '@/daily/engine';

export interface StreakState {
  lastOpenDate: string | null;
  streak: number;
}

/**
 * Streak rule — DESIGN.md §7. Three explicit cases on
 * diff = localDate − lastOpenDate (calendar days):
 *   diff <= 0 → no-op (clock set back / date-line travel must not
 *               double-count or farm streaks; keep the later date)
 *   diff == 1 → streak + 1
 *   diff  > 1 → streak = 1
 */
export function nextStreak(prev: StreakState, localDate: string): StreakState {
  if (!prev.lastOpenDate || prev.streak < 1) {
    return { lastOpenDate: localDate, streak: 1 };
  }
  const diff = daysSinceEpoch(localDate) - daysSinceEpoch(prev.lastOpenDate);
  if (diff <= 0) return prev;
  if (diff === 1) return { lastOpenDate: localDate, streak: prev.streak + 1 };
  return { lastOpenDate: localDate, streak: 1 };
}
