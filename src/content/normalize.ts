interface WordCopy {
  definition: string;
  wisdom: string;
}

const SPACED_DASH = /\s+[—–]\s+/g;
const MULTIPLE_SPACES = /[ \t]{2,}/g;

export function normalizeCopy(text: string): string {
  return text.replace(SPACED_DASH, '; ').replace(MULTIPLE_SPACES, ' ').trim();
}

export function normalizeWordCopy<T extends WordCopy>(word: T): T {
  return {
    ...word,
    definition: normalizeCopy(word.definition),
    wisdom: normalizeCopy(word.wisdom),
  };
}

export function normalizeWordList<T extends WordCopy>(words: readonly T[]): T[] {
  return words.map(normalizeWordCopy);
}
