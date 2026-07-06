/**
 * Bundled-seed builder — DESIGN.md §6.4.3.
 *
 * With Supabase configured (SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY env),
 * fetches all published words THROUGH THE ANONYMOUS REST ENDPOINT with the
 * publishable key, so the bundle is byte-equivalent to what a fresh device
 * would sync (a secret-key export could leak drafts).
 *
 * Without Supabase configured (pre-cloud development), builds the seed from
 * the local content master (content/words.json) with a backdated
 * published_at — the same convention the real seed import uses (§6.1).
 *
 * Fails loudly (exit 1) if the result is empty — wired as a build gate so a
 * stale or empty seed can never ship silently.
 *
 * Usage: npm run pull-content
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { normalizeWordList } from '../src/content/normalize';

const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'assets', 'seed', 'words.json');

// Matches DESIGN.md §6.1: seed content must predate the launch month so the
// monthly-frozen daily rotation is never empty.
const BACKDATED_PUBLISHED_AT = '2026-01-01T00:00:00.000Z';
const LOCAL_UPDATED_AT = '2026-07-01T00:00:00.000Z';

const WORD_COLUMNS =
  'id,slug,word,pronunciation,language,type,level,definition,wisdom,is_free,published_at,updated_at';

interface SeedWord {
  id: string;
  slug: string;
  word: string;
  pronunciation: string;
  language: string;
  type: string;
  level: number;
  definition: string;
  wisdom: string;
  is_free: boolean;
  published_at: string;
  updated_at: string;
}

async function fromSupabase(url: string, key: string) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const probe = await fetch(
    `${url}/rest/v1/words?select=updated_at&order=updated_at.desc&limit=1`,
    { headers: { ...headers, Prefer: 'count=exact' } },
  );
  if (!probe.ok) throw new Error(`probe failed: HTTP ${probe.status}`);
  const count = Number((probe.headers.get('content-range') ?? '').split('/')[1]);
  const rows = (await probe.json()) as { updated_at: string }[];
  const stamp = { maxUpdatedAt: rows[0]?.updated_at ?? null, count };

  const res = await fetch(`${url}/rest/v1/words?select=${WORD_COLUMNS}&order=slug.asc`, {
    headers,
  });
  if (!res.ok) throw new Error(`snapshot failed: HTTP ${res.status}`);
  const words = normalizeWordList((await res.json()) as SeedWord[]);
  return { words, stamp };
}

function fromLocalMaster() {
  const master = JSON.parse(readFileSync(join(ROOT, 'content', 'words.json'), 'utf8')) as {
    words: (Omit<SeedWord, 'id' | 'published_at' | 'updated_at' | 'is_free'> & {
      source?: string;
      is_free?: boolean;
    })[];
  };
  const words: SeedWord[] = normalizeWordList(master.words)
    .map(({ source: _source, ...w }) => ({
      ...w,
      is_free: w.is_free ?? true,
      // Local-only pseudo-ids; replaced by real uuids when the cloud project
      // is linked and this script re-runs against it (rotation re-rolls once,
      // pre-launch — harmless).
      id: `local-${w.slug}`,
      published_at: BACKDATED_PUBLISHED_AT,
      updated_at: LOCAL_UPDATED_AT,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  return {
    words,
    stamp: { maxUpdatedAt: LOCAL_UPDATED_AT, count: words.length },
  };
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

  const snapshot = url && key ? await fromSupabase(url, key) : fromLocalMaster();
  if (!url || !key) {
    console.warn('! SUPABASE_URL not set — built seed from content/words.json (local master).');
  }

  if (snapshot.words.length === 0) {
    console.error('✗ Seed is empty — refusing to write. A release must never bundle no words.');
    process.exit(1);
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(snapshot, null, 2));
  console.log(`✓ Wrote ${snapshot.words.length} words to assets/seed/words.json`);
  console.log(`  stamp: ${snapshot.stamp.maxUpdatedAt} / count ${snapshot.stamp.count}`);
}

main().catch((err) => {
  console.error('✗ pull-content failed:', err);
  process.exit(1);
});
