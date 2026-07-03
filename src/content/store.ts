import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, syncEnabled } from '@/config';
import type { ContentSnapshot, ContentStamp, Word } from '@/content/types';

import seedJson from '../../assets/seed/words.json';

/**
 * Content layer — DESIGN.md §6.3: bundled seed for instant offline boot,
 * then a tiny freshness probe on every foreground and a full snapshot
 * replace only when the probe says content changed. No cursors, no
 * tombstones, no merge logic.
 */

const STORAGE_KEY = 'emotionary.content.v1';
const bundledSeed = seedJson as unknown as ContentSnapshot;

const WORD_COLUMNS =
  'id,slug,word,pronunciation,language,type,level,definition,wisdom,is_free,published_at,updated_at';

interface ContentState {
  words: Word[];
  stamp: ContentStamp;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  sync: () => Promise<void>;
}

function restHeaders(): Record<string, string> {
  // Publishable keys go in the apikey header ONLY (not Authorization).
  return { apikey: SUPABASE_PUBLISHABLE_KEY };
}

async function fetchStamp(): Promise<ContentStamp | null> {
  const url =
    `${SUPABASE_URL}/rest/v1/words?select=updated_at&order=updated_at.desc&limit=1`;
  const res = await fetch(url, { headers: { ...restHeaders(), Prefer: 'count=exact' } });
  if (!res.ok) return null;
  const contentRange = res.headers.get('content-range') ?? '';
  const count = Number(contentRange.split('/')[1]);
  if (!Number.isFinite(count)) return null;
  const rows = (await res.json()) as { updated_at: string }[];
  return { maxUpdatedAt: rows[0]?.updated_at ?? null, count };
}

async function fetchSnapshot(stamp: ContentStamp): Promise<ContentSnapshot | null> {
  const url = `${SUPABASE_URL}/rest/v1/words?select=${WORD_COLUMNS}&order=slug.asc`;
  const res = await fetch(url, { headers: restHeaders() });
  if (!res.ok) return null;
  const words = (await res.json()) as Word[];
  // Guard: never replace the store with an empty result — a misconfigured
  // RLS policy must not be able to wipe every device (DESIGN.md §6.3).
  if (!Array.isArray(words) || words.length === 0) return null;
  return { words, stamp };
}

let syncInFlight: Promise<void> | null = null;

export const useContentStore = create<ContentState>()((set, get) => ({
  words: bundledSeed.words,
  stamp: bundledSeed.stamp,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as ContentSnapshot;
        if (Array.isArray(cached.words) && cached.words.length > 0) {
          set({ words: cached.words, stamp: cached.stamp });
        }
      }
    } catch {
      // fall through to the bundled seed already in state
    } finally {
      set({ hydrated: true });
    }
  },

  sync: async () => {
    if (!syncEnabled) return;
    if (syncInFlight) return syncInFlight;
    syncInFlight = (async () => {
      try {
        const remote = await fetchStamp();
        if (!remote) return;
        const local = get().stamp;
        if (remote.maxUpdatedAt === local.maxUpdatedAt && remote.count === local.count) return;
        const snapshot = await fetchSnapshot(remote);
        if (!snapshot) return;
        set({ words: snapshot.words, stamp: snapshot.stamp });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // offline or transient failure — the cached/bundled content stands
      } finally {
        syncInFlight = null;
      }
    })();
    return syncInFlight;
  },
}));

export function findWord(words: readonly Word[], slug: string): Word | undefined {
  return words.find((w) => w.slug === slug);
}
