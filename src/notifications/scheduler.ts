import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Word } from '@/content/types';
import { addDays, localDateString, monthKey, wordOfDay } from '@/daily/engine';
import type { NotifTime } from '@/store/userStore';

/**
 * Notification queue — DESIGN.md §8.
 * Pre-scheduled individual DATE triggers (repeating triggers can't carry
 * per-day words; iOS keeps only the 64 soonest). Worded content only through
 * the end of the current month (its permutation is frozen against publishes),
 * then generic sentinels filling to 38 slots. Rebuilt from scratch on every
 * foreground / settings change — one code path self-heals everything.
 */

export const CHANNEL_ID = 'daily-word';
const MAX_SLOTS = 38;

export function configureNotificationHandler(): void {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily word',
    importance: Notifications.AndroidImportance.DEFAULT,
    // No exact-alarm permissions by design — delivery is "around" the chosen
    // time (Android 14+ denies SCHEDULE_EXACT_ALARM to this app category).
  });
}

export async function getPermissionGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted;
}

/** Contextual ask (onboarding / settings). Full permission, not provisional. */
export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

/** First clause of the definition, ≤ ~100 chars, for the notification body. */
export function notificationBody(definition: string): string {
  const clause = definition.split(/\s+[—–]\s+|;\s+|\. /)[0].trim();
  const body = clause.length > 100 ? `${clause.slice(0, 97)}…` : clause;
  return body.endsWith('.') || body.endsWith('…') ? body : `${body}.`;
}

function fireDate(localDate: string, time: NotifTime): Date {
  const [y, m, d] = localDate.split('-').map(Number);
  return new Date(y, m - 1, d, time.hour, time.minute, 0, 0);
}

interface RebuildArgs {
  words: readonly Word[];
  time: NotifTime;
  enabled: boolean;
}

async function doRebuild({ words, time, enabled }: RebuildArgs): Promise<void> {
  if (Platform.OS === 'web') return;
  const granted = await getPermissionGranted();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled || !granted || words.length === 0) return;

  await ensureChannel();

  const now = new Date();
  const today = localDateString(now);
  // Start-day rule (DESIGN.md §8): if today's delivery time has already
  // passed, start tomorrow — never create a past-dated trigger that fires
  // instantly as a duplicate right after a notification tap.
  const startOffset = fireDate(today, time).getTime() > now.getTime() ? 0 : 1;

  const cache = new Map<string, Word[]>();
  for (let i = 0; i < MAX_SLOTS; i++) {
    const date = addDays(today, startOffset + i);
    const worded = monthKey(date) === monthKey(today);
    const word = worded ? wordOfDay(words, date, cache) : null;
    await Notifications.scheduleNotificationAsync({
      content: word
        ? {
            title: `Today's word: ${word.word}`,
            body: notificationBody(word.definition),
            data: { url: '/', slug: word.slug },
          }
        : {
            title: 'Your word of the day is waiting ✳',
            body: 'Open Emotionary to reveal it.',
            data: { url: '/' },
          },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate(date, time),
        channelId: CHANNEL_ID,
      },
    });
  }
}

let inFlight: Promise<void> | null = null;
let pending: RebuildArgs | null = null;

/**
 * Single-flight rebuild (DESIGN.md §8): concurrent calls (foreground handler,
 * notification tap, settings change) collapse into one execution; the latest
 * args win via one trailing re-run.
 */
export function rebuildQueue(args: RebuildArgs): Promise<void> {
  if (inFlight) {
    pending = args;
    return inFlight;
  }
  inFlight = doRebuild(args)
    .catch(() => {
      // scheduling is best-effort; next foreground retries
    })
    .finally(() => {
      inFlight = null;
      if (pending) {
        const next = pending;
        pending = null;
        void rebuildQueue(next);
      }
    });
  return inFlight;
}
