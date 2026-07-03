/**
 * Content importer — DESIGN.md §6.4.2.
 *
 * Upserts word entries into Supabase KEYED BY SLUG — re-runs must never
 * delete+insert (that would reset published_at and disturb the daily
 * rotation). Accepts the JSON master (content/words.json) or a CSV with the
 * same columns (slug,word,pronunciation,language,type,level,definition,wisdom
 * [,is_free]) for the one-time manuscript conversion.
 *
 * Initial imports are published with a BACKDATED published_at (before the
 * launch month) so the monthly-frozen rotation is populated from day one
 * (§6.1). Existing rows keep their published_at.
 *
 * Requires: SUPABASE_URL and SUPABASE_SECRET_KEY env (secret key — run
 * locally or in CI only, NEVER shipped in the app).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run import-manuscript
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run import-manuscript -- content/words.csv
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const BACKDATED_PUBLISHED_AT = '2026-01-01T00:00:00.000Z';

interface MasterWord {
  slug: string;
  word: string;
  pronunciation: string;
  language: string;
  type: string;
  level: number;
  definition: string;
  wisdom: string;
  is_free?: boolean;
}

/** Minimal RFC-4180 CSV parser (quoted fields, embedded commas/newlines). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.length > 0)) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.length > 0)) rows.push(row);
  return rows;
}

function loadWords(path: string): MasterWord[] {
  const text = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) {
    const parsed = JSON.parse(text) as { words: MasterWord[] };
    return parsed.words;
  }
  const [header, ...rows] = parseCsv(text);
  const idx = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1 && name !== 'is_free') throw new Error(`CSV missing required column: ${name}`);
    return i;
  };
  return rows.map((r) => ({
    slug: r[idx('slug')].trim(),
    word: r[idx('word')].trim(),
    pronunciation: r[idx('pronunciation')].trim(),
    language: r[idx('language')].trim(),
    type: r[idx('type')].trim(),
    level: Number(r[idx('level')]),
    definition: r[idx('definition')].trim(),
    wisdom: r[idx('wisdom')].trim(),
    is_free: idx('is_free') === -1 ? true : r[idx('is_free')].trim() !== 'false',
  }));
}

const VALID_TYPES = new Set(['wanderword', 'hidden_english', 'psychology']);

function validate(words: MasterWord[]): void {
  const seen = new Set<string>();
  for (const w of words) {
    if (!w.slug || !w.word || !w.definition || !w.wisdom) {
      throw new Error(`Entry missing required fields: ${JSON.stringify(w.slug || w.word)}`);
    }
    if (seen.has(w.slug)) throw new Error(`Duplicate slug: ${w.slug}`);
    seen.add(w.slug);
    if (!VALID_TYPES.has(w.type)) throw new Error(`Invalid type '${w.type}' on ${w.slug}`);
    if (!Number.isInteger(w.level) || w.level < 1 || w.level > 5) {
      throw new Error(`Invalid level '${w.level}' on ${w.slug}`);
    }
  }
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error('✗ Set SUPABASE_URL and SUPABASE_SECRET_KEY (secret key, server-side only).');
    process.exit(1);
  }

  const input = process.argv[2] ?? join(ROOT, 'content', 'words.json');
  const words = loadWords(input);
  validate(words);
  console.log(`Importing ${words.length} words from ${input} …`);

  // Backdating published_at is ONLY for the initial bootstrap import (empty
  // table) — it pre-populates the monthly-frozen rotation (DESIGN.md §6.1).
  // On later imports, new rows arrive as unpublished drafts so publishing
  // (and the published_at = now() trigger) stays in the founder's hands and
  // new words join the rotation at the next month boundary, never mid-month.
  const probe = await fetch(`${url}/rest/v1/words?select=id&limit=1`, {
    headers: { apikey: key, Prefer: 'count=exact' },
  });
  if (!probe.ok) {
    console.error(`✗ Could not check table state: HTTP ${probe.status}`);
    process.exit(1);
  }
  const existing = Number((probe.headers.get('content-range') ?? '').split('/')[1]);
  const isBootstrap = existing === 0;
  console.log(
    isBootstrap
      ? '  Empty table — bootstrap import: publishing all with backdated published_at.'
      : `  Table has ${existing} rows — new entries import as unpublished drafts.`,
  );

  // Upsert by slug via PostgREST: on_conflict=slug + resolution=merge-duplicates.
  const payload = words.map((w) => ({
    slug: w.slug,
    word: w.word,
    pronunciation: w.pronunciation,
    language: w.language,
    type: w.type,
    level: w.level,
    definition: w.definition,
    wisdom: w.wisdom,
    is_free: w.is_free ?? true,
    ...(isBootstrap ? { published: true, published_at: BACKDATED_PUBLISHED_AT } : {}),
  }));

  const res = await fetch(`${url}/rest/v1/words?on_conflict=slug`, {
    method: 'POST',
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error(`✗ Import failed: HTTP ${res.status} — ${await res.text()}`);
    process.exit(1);
  }
  console.log('✓ Import complete. Verify in Supabase Studio, then run: npm run pull-content');
}

main().catch((err) => {
  console.error('✗ import-manuscript failed:', err);
  process.exit(1);
});
