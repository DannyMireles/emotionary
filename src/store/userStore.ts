import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { nextStreak, type StreakState } from '@/store/streak';

export interface NotifTime {
  hour: number;
  minute: number;
}

interface UserState {
  onboarded: boolean;
  favorites: string[]; // slugs, insertion order
  readSlugs: string[]; // unique slugs ever read
  sharedCount: number;
  lastSharedBySlug: Record<string, string>; // slug -> last local date shared
  streakState: StreakState;
  notifTime: NotifTime;
  notifEnabled: boolean;

  completeOnboarding: () => void;
  toggleFavorite: (slug: string) => void;
  markRead: (slug: string) => void;
  recordOpen: (localDate: string) => void;
  /** Returns true if the share was counted (at most once per word per local date). */
  recordShare: (slug: string, localDate: string) => boolean;
  setNotifTime: (time: NotifTime) => void;
  setNotifEnabled: (enabled: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      favorites: [],
      readSlugs: [],
      sharedCount: 0,
      lastSharedBySlug: {},
      streakState: { lastOpenDate: null, streak: 0 },
      notifTime: { hour: 9, minute: 0 },
      notifEnabled: false,

      completeOnboarding: () => set({ onboarded: true }),

      toggleFavorite: (slug) =>
        set((s) => ({
          favorites: s.favorites.includes(slug)
            ? s.favorites.filter((f) => f !== slug)
            : [...s.favorites, slug],
        })),

      markRead: (slug) =>
        set((s) => (s.readSlugs.includes(slug) ? s : { readSlugs: [...s.readSlugs, slug] })),

      recordOpen: (localDate) => set((s) => ({ streakState: nextStreak(s.streakState, localDate) })),

      recordShare: (slug, localDate) => {
        if (get().lastSharedBySlug[slug] === localDate) return false;
        set((s) => ({
          sharedCount: s.sharedCount + 1,
          lastSharedBySlug: { ...s.lastSharedBySlug, [slug]: localDate },
        }));
        return true;
      },

      setNotifTime: (notifTime) => set({ notifTime }),
      setNotifEnabled: (notifEnabled) => set({ notifEnabled }),
    }),
    {
      name: 'emotionary.user.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
