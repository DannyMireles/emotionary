# Emotionary

Companion app to **The Emotional Dictionary** — a calm, typography-first iOS + Android app that delivers one word for a feeling every day. Built with Expo (React Native + TypeScript) and Supabase.

**Read [DESIGN.md](DESIGN.md) first** — it is the project contract: every product and architecture decision, with rationale. Research briefs backing the tech choices live in [docs/research/](docs/research/).

## How it works (one minute)

- All words ship **bundled** in the app (`assets/seed/words.json`) — the app is fully offline-first.
- On every foreground it makes one tiny **probe** request to Supabase; only when content changed does it download the full word list (~50 KB) and replace its cache. No accounts, no custom backend — Supabase's auto-generated REST API with a read-only publishable key.
- The **word of the day** is computed on-device by a deterministic engine (`src/daily/engine.ts`) — same word for everyone on the same calendar date, even offline. Golden unit tests pin the algorithm; **never change it without bumping `SEED_PREFIX`**.
- Daily notifications are **pre-scheduled local notifications** (no push server): worded through the end of the month, generic after, rebuilt on every app open.
- Favorites, streaks, and settings live on-device (`zustand` + AsyncStorage). No PII, no analytics.

## Getting started

```bash
npm install
npm test              # unit tests (daily engine golden fixtures, streak, sync)
npm run typecheck
npx expo start        # dev server; press w for web preview
```

Native features (notifications, share cards, time picker) need a **development build**, not Expo Go:

```bash
npx eas build --profile development --platform ios   # or android
```

## Supabase setup (one-time, ~5 minutes)

The app runs offline-only until this is done — nothing breaks without it.

```bash
supabase login
supabase projects create emotionary        # or create in the dashboard
supabase link --project-ref <PROJECT_REF>
supabase db push                            # applies supabase/migrations/
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SECRET_KEY=sb_secret_... \
  npm run import-manuscript                 # seeds words from content/words.json
```

Then copy `.env.example` → `.env`, fill in the project URL + **publishable** key (also add them to `eas.json` build profiles), and run `npm run pull-content` to regenerate the bundled seed from the live database.

## Content operations (no app release needed)

- **Add a word:** Supabase Studio → Table Editor → `words` → insert (drafts start `published = false`) → flip `published`. Live in every app on next open; joins the daily rotation next month.
- **Edit a word:** edit the row — propagates automatically.
- **Retire a word:** set `published = false` (prefer month-end; see DESIGN.md §6.4.7). Don't hard-delete.
- **Before each release:** `npm run pull-content` refreshes the bundled seed (wire it as an EAS build hook).

⚠️ `content/words.json` currently holds **44 development entries** — 11 carry real copy from the founder's prototype; the rest are placeholders written in the book's voice. Replace with the manuscript's 127 entries (same JSON shape, or a CSV with the same columns) and re-run `npm run import-manuscript`.

## Project layout

```
src/app/            expo-router screens (Today / Browse / Stats tabs, word, share, settings, onboarding)
src/daily/          word-of-the-day engine — PROTOCOL CODE, golden-tested
src/content/        bundled seed + probe/snapshot sync
src/notifications/  local notification queue
src/share/          1080×1920 share-card renderer + capture
src/entitlements/   monetization seam (hardcoded free in V1 — see DESIGN.md §9)
src/store/          on-device user data (favorites, stats, settings)
src/theme/          design tokens (level palettes, type scale, fonts)
supabase/           migrations (schema + RLS)
content/            word content master
scripts/            import-manuscript, pull-content
```
