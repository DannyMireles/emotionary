/**
 * Supabase connection config. Both values are safe to ship in the app
 * (the publishable key is designed for client embedding; RLS enforces
 * read-only access to published words through RLS — DESIGN.md §6.2).
 *
 * When unset (e.g. before the cloud project is linked), the app runs in
 * offline-only mode from the bundled seed — by design, nothing breaks.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const syncEnabled = SUPABASE_URL.length > 0 && SUPABASE_PUBLISHABLE_KEY.length > 0;

/** Book / marketing CTA destination. */
export const BOOK_URL = 'https://emotionarybook.com';
export const BOOK_URL_LABEL = 'emotionarybook.com';
export const BOOK_COPY = 'This app is a companion to the original collection.';
export const BOOK_THUMBNAIL_URL = '';
