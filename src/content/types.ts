export type WordType = 'wanderword' | 'hidden_english' | 'psychology';

export type Level = 1 | 2 | 3 | 4 | 5;

/** A published word as delivered by Supabase (and mirrored in the bundled seed). */
export interface Word {
  id: string;
  slug: string;
  word: string;
  pronunciation: string;
  language: string;
  type: WordType;
  level: Level;
  definition: string;
  wisdom: string;
  is_free: boolean;
  published_at: string; // ISO timestamp; drives the monthly rotation freeze
  updated_at: string;
}

/** Freshness stamp used by the probe-then-snapshot sync (DESIGN.md §6.3). */
export interface ContentStamp {
  maxUpdatedAt: string | null;
  count: number;
}

export interface ContentSnapshot {
  words: Word[];
  stamp: ContentStamp;
}
