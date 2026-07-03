import type { Level, WordType } from '@/content/types';

/**
 * Design tokens — typography-first, "feels like opening the book".
 * Level palettes are sampled from the prototype video; final values come from
 * the book's designer (DESIGN.md §11) and only need edits here.
 */

export const color = {
  paper: '#FAF7F0',
  ink: '#211C15',
  inkMuted: '#6E675C',
  inkFaint: '#9A927F',
  hairline: '#E5DFD2',
  card: '#FFFFFF',
  overlay: 'rgba(24, 20, 14, 0.62)',
} as const;

export interface LevelPalette {
  /** subtle background tint for cards / detail screens */
  tint: string;
  /** saturated full-bleed background for share cards */
  deep: string;
  /** text color on top of `deep` */
  onDeep: string;
  /** small accents (dots, rules) */
  accent: string;
}

export const levelPalettes: Record<Level, LevelPalette> = {
  1: { tint: '#F6F1E3', deep: '#B9973E', onDeep: '#FFFBEF', accent: '#B9973E' }, // ivory / warm gold
  2: { tint: '#ECE7F5', deep: '#6F63A8', onDeep: '#F6F3FF', accent: '#6F63A8' }, // lavender
  3: { tint: '#F6E4E9', deep: '#B26B80', onDeep: '#FFF4F6', accent: '#B26B80' }, // dusty rose
  4: { tint: '#E4EDE4', deep: '#5F8464', onDeep: '#F2FAF2', accent: '#5F8464' }, // sage
  5: { tint: '#F0DEEA', deep: '#A93A78', onDeep: '#FDF0F7', accent: '#A93A78' }, // plum / magenta
};

export const typeMeta: Record<WordType, { label: string; glyph: string }> = {
  wanderword: { label: 'WANDERWORD', glyph: '⊕' },
  hidden_english: { label: 'HIDDEN ENGLISH', glyph: '⌕' },
  psychology: { label: 'PSYCHOLOGY', glyph: '✦' },
};

export const font = {
  /** the word hero + wordmark */
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_400Regular_Italic',
  /** body / definitions */
  serif: 'Literata_400Regular',
  serifItalic: 'Literata_400Regular_Italic',
  serifMedium: 'Literata_500Medium',
  serifSemiBold: 'Literata_600SemiBold',
} as const;

export const type = {
  hero: 44,
  title: 28,
  body: 17,
  small: 14,
  caption: 12,
  badge: 11,
} as const;

export const space = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Letterspaced small-caps style used for badges and origin lines. */
export const letterSpacing = {
  badge: 2.2,
  caps: 1.6,
} as const;
