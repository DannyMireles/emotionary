# Emotionary — Project Design

*Companion app to **The Emotional Dictionary** (working product name: **Emotionary**, per the prototype).*
*Version 1.1 — 2026-07-03. Sources: written app brief, founder walkthrough video of the HTML prototype, current-web research (July 2026) on every load-bearing tech assumption, plus an adversarial design review (findings archived in `docs/research/`).*

---

## 1. What we're building (one paragraph)

A calm, typography-first iOS + Android app (single Expo/React Native codebase) that ships with all 127 words from the book, works fully offline, syncs new words from Supabase when online, shows one deterministic "word of the day," delivers it as a local notification at a user-chosen time, lets users browse/search/filter and favorite words, tracks lightweight local stats (streak, words read, favorited, shared), and exports every word as a stunning Instagram/Pinterest-ready share card that markets the app and the book. Free at launch; architected so RevenueCat freemium can be switched on later without a refactor.

---

## 2. Assumption check — contradictions found and resolved

### Between your message and the brief

| # | Conflict | Resolution |
|---|---|---|
| 1 | You: Supabase backend with CRUD APIs. Brief: "Local JSON file… no server, no database, no auth." | **Supabase wins — because of the brief itself.** The feature list says "All 127 entries **+ add more over time**," which a local JSON file can't do without an app-store release per word. Supabase is the content source of truth; the app stays **offline-first** (bundled seed + snapshot sync) so the brief's "beautiful local app" feel is fully preserved. |
| 2 | You: "we would make simple APIs." | **You don't have to make any.** Supabase auto-generates REST endpoints (PostgREST) from tables. V1 needs **zero** custom endpoints and zero edge functions. Your instinct that "the backend wouldn't really be a backend" is exactly right. |
| 3 | You: RevenueCat "once, or if it expands to that point." | Consistent with the brief's "decide later / launch free." One thing must exist **now**: an `is_free` column on words + a client-side gating seam (§9). Everything else about RevenueCat is genuinely add-later. |

### Inside the brief itself

| # | Conflict | Resolution |
|---|---|---|
| 4 | Platform line says **Flutter**; tech-stack table says **React Native + Expo**. | **Expo.** Research confirmed there is no capability in this app where Flutter is materially better, and one (V2 widgets) where Expo is now *ahead* — official `expo-widgets` (stable since SDK 56, May 2026) lets us write iOS widgets as React components, while Flutter's `home_widget` still requires hand-written SwiftUI/Kotlin. The prototype is HTML, so nothing is invested in Flutter. |
| 5 | "The 4 Screens" section lists **3** screens; the Summary says 4 including **Stats**; stats/favorites are listed under "Additions." | **The video settles it: Stats is a V1 tab** (the prototype has Today / Browse / Stats bottom nav with streak, words read, favorited, shared, favorited-words list, book CTA). **Favorites are V1** too — SAVE is on every prototype screen and FAVORITED is a stat. |
| 6 | "Daily word delivered at a time the user sets" — but no screen owns that setting. | Gap. Added: an **onboarding step** (time picker + contextual notification permission ask) and a **Settings sheet** (reached from the Stats profile icon, as in the prototype). |
| 7 | Intro says "search by mood or keyword"; no screen defines search. | **Keyword search: V1** — a search field on Browse; trivial because data is local. **Mood finder: V2**, as the brief itself says. |

### Between the brief and the video prototype (prototype = ground truth for product/look)

| # | Conflict | Resolution |
|---|---|---|
| 8 | Brief: third category is "🧠 Clinical / From the Clinic." Prototype + your narration: **PSYCHOLOGY**. | **Psychology.** |
| 9 | Brief: "The Emotional Dictionary." Prototype: **EMOTIONARY** + emotionarybook.com. | **Recommend Emotionary** for the store listing (shorter, brandable, matches the domain on the share card), subtitle "The Emotional Dictionary." ⚠️ **Your call** — and do an App Store / trademark name search before committing (see Risks). |
| 10 | Brief: Browse filters by **Level 1–5 colored tabs**. Prototype: **type chips only** (All / Wanderword / Hidden English / Psychology), with level-tinted cards. | **Both, prototype-first:** type chips as the primary filter row (as built in the prototype) plus a compact row of 5 level color-dots beneath. Cards keep their level tint, so levels stay visible even unfiltered. |
| 11 | Widgets: brief says "Additions"; prototype's Stats screen has a whole widget-config section. | **V2** (honest estimate: ~2–3 weeks for both platforms — see §12). V1 Stats omits the widgets section entirely rather than showing "coming soon." |
| 12 | Audio pronunciation: speaker icon appears in the prototype next to the pronunciation; brief lists audio under "Additions." | **V1.5.** The schema reserves `audio_url` now so no migration later. |

### Corrections from research (things we'd have gotten wrong)

- **Supabase "anon key" no longer exists for new projects** (since Nov 2025). New projects use `sb_publishable_...` / `sb_secret_...` keys. The publishable key is designed to ship in the app; requests still hit Postgres as the `anon` role, so RLS works as expected. Raw REST callers must send it in the `apikey` header only.
- **A repeating daily notification cannot carry a different word each day.** Per-day content requires pre-scheduling individual dated notifications — and iOS silently keeps only the **64 soonest** pending ones. This forces the scheduler architecture in §8 (it's a solved pattern, but it must be designed, not improvised).
- **Don't chase exact alarms on Android.** `SCHEDULE_EXACT_ALARM` is denied by default on Android 14+ and Play policy restricts `USE_EXACT_ALARM` to alarm/clock apps. Inexact delivery ("around 9:00") is fine for a daily word; the copy should say "around."
- **Google Play's photo/video-permissions policy (enforced May 2025)** removes apps that carry `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` without broad-access core functionality. Saving a share card needs **no read permission** — §10 strips those permissions from the manifest and uses the write-only save path.
- **Supabase free tier pauses projects after 7 days of inactivity.** Offline-first absorbs this (app never breaks), and a keep-alive ping or the $25/mo Pro plan removes it at launch.

---

## 3. Product decisions (locked for V1)

1. **Stack:** Expo SDK 57 (React Native 0.86, TypeScript), Expo Router, EAS Build/Submit/Update. Development builds (not Expo Go) from day one — notifications and later RevenueCat require them anyway.
2. **Backend:** one Supabase project. Postgres + PostgREST only. No auth, no edge functions, no custom server. Anonymous read-only access via RLS.
3. **Single entry point:** one repo containing the Expo app **and** the `supabase/` directory (migrations, seed, content scripts). Every client and backend change lands in this repo.
4. **No accounts in V1.** Favorites, stats, and settings live on-device. (Consequence, accepted: uninstalling loses them; a future purchase restores via the store, not via us.)
5. **Daily word is deterministic and global** (same word for every user on the same local calendar date), computed on-device — no push infrastructure. A `daily_overrides` table (pin a word to a date for launches/holidays) is fully spec'd but **deferred to V1.5** to keep V1 sync to a single call (§6.6).
6. **Launch free.** Gating seam built in but hardcoded open (§9).

---

## 4. V1 / V1.5 / V2 — every feature from the brief and video, placed

| Feature | Where | Notes |
|---|---|---|
| Daily word (Today tab) | **V1** | deterministic global rotation |
| Daily notification at user-set time | **V1** | local scheduled, §8 |
| Browse all words, alphabetical | **V1** | |
| Filter by type (Wanderword / Hidden English / Psychology) | **V1** | chips, as prototype |
| Filter by level 1–5 | **V1** | color-dot row under chips |
| Keyword search | **V1** | client-side, on Browse |
| Word Detail | **V1** | same layout as Today |
| Share as image card (Story 1080×1920) | **V1** | §10 |
| Favorites (SAVE) | **V1** | local |
| Stats: streak, words read, favorited, shared + favorited list | **V1** | local |
| Book CTA ("Get the book →") | **V1** | on Stats + share card |
| Settings: notification time, restore-purchases slot, about | **V1** | sheet from Stats |
| Onboarding (welcome → time picker + permission) | **V1** | 2–3 steps |
| Square 1080×1080 share card (feed/Pinterest) | **V1.5** | Story size first |
| Audio pronunciation | **V1.5** | `audio_url` column reserved; Supabase Storage bucket |
| Word history (past daily words) | **V1.5** | engine already supports computing past dates |
| Daily-word date override (marketing pin) | **V1.5** | spec'd in §6.6, purely additive |
| Direct-to-Instagram-Stories share target | **V1.5** | verified alive in 2026; needs Meta app ID (§10) |
| Universal links (shared words open in app) | **V1.5** | needs AASA/assetlinks on emotionarybook.com |
| Analytics (privacy-light) | **V1.5** | decide then; V1 ships none |
| Home/Lock-screen widgets | **V2** | expo-widgets (iOS) + react-native-android-widget; ~2–3 wks |
| "How are you feeling?" mood finder | **V2** | per brief |
| Themed packs, themes, add-your-own-words, favorite-based interests | **V2** | per brief |
| Server push notifications | **V2** | only if "dark >31 days" users matter (§8) |
| Monetization (RevenueCat) | **when traction says so** | §9 |
| Accounts + cross-device sync | **V2+, only if needed** | additive tables |

---

## 5. Screens (V1 spec)

Bottom tab bar, minimal chrome: **✦ Today · ≡ Browse · ◈ Stats** (matches prototype).

### 5.1 Today
Exactly the prototype layout, top to bottom: small letterspaced type badge (`🔍 HIDDEN ENGLISH`), the word in large display serif, `[pronunciation]` in italic brackets, origin line in small caps (`ENGLISH (COINED)`), the definition paragraph, then anchored near the bottom: the italic wisdom line + "from Emotionary, the book," and **SAVE** (heart) / **SHARE** buttons. Background: paper-white with a *subtle* level tint. One word, full screen, no clutter. *(One deliberate prototype deviation: the speaker icon next to the pronunciation is omitted until V1.5 audio ships — no dead controls in V1.)*
- Opening after N days away shows **today's** word only (history is V1.5).
- Viewing Today marks the word as read and feeds the streak (§7).
- Edge: first launch ever, offline → bundled seed makes this identical to the online experience.

### 5.2 Browse
Title, **persistent search field**, type chips (`ALL TYPES / 🌐 WANDERWORD / 🔍 HIDDEN ENGLISH / ⚡ PSYCHOLOGY`), a compact level filter row (5 color dots + "All"), then the alphabetical card list: word + one-line definition preview + type glyph, card tinted by level. Tap → Word Detail.
- Search: case/diacritic-insensitive substring over word + definition; results replace the list live.
- Empty states: "No words match" with a one-tap clear-filters link.

### 5.3 Word Detail
Same layout as Today (per brief and prototype), with SAVE/SHARE, back arrow, level-tint background. Reached from Browse, Stats favorites, or a notification tap. If a routed slug doesn't resolve locally (e.g. the word was unpublished), show a graceful "This word is unavailable" state, attempt a sync, and offer Today — never a crash or blank screen.

### 5.4 Stats ("Your Stats")
Four counters (DAY STREAK / WORDS READ / FAVORITED / SHARED), FAVORITED WORDS list (tap → detail, **heart-toggle to remove** — swipe-to-delete is undiscoverable and fights list scroll), "The book" CTA card → emotionarybook.com (later: retailer link), and a profile/gear icon top-right → **Settings sheet**. The prototype's widget-config section is omitted until V2.
- Zero state: friendly copy ("Your streak starts today — read your first word").

### 5.5 Settings (sheet)
Daily word time picker (default **9:00 local**) with live "Delivered around 9:00 each morning" copy; notification status row (if OS-denied: "Enable in system settings" → deep link); About (book blurb + link, app version); **reserved row slot for "Restore Purchases"** (hidden in V1, required by Apple the day IAP ships).

### 5.6 Onboarding (first launch only)
1. Brand moment: wordmark + "127 words for feelings you've felt but never named."
2. "One word, every day": time picker (pre-set 9:00) → **contextual** notification permission request (research-backed: ask in context, never at cold launch; full permission, not provisional — a quiet notification defeats a streak product). Skippable ("Maybe later").
3. Straight into Today. No account, no paywall, no email.

### 5.7 Share modal
Full-bleed preview of the card (§10) over a dimmed background, DOWNLOAD (saves to camera roll) and SHARE (native sheet) buttons. "Sized for Instagram / Facebook Stories" caption. *(Deliberate prototype deviation: the explicit Messages/Instagram/Facebook target row is replaced by the OS share sheet in V1; direct targets return with the V1.5 Instagram-Stories integration.)*

### Accessibility (V1, non-negotiable basics)
Dynamic type with `maxFontSizeMultiplier` guards on the display word; VoiceOver labels ("Sonder. Hidden English. Level three. sow-DAH-day. <definition>"); 44pt touch targets; contrast-checked level tints; reduced-motion-safe transitions.

---

## 6. Data & backend (Supabase)

### 6.1 Schema (initial migration)

```sql
create extension if not exists moddatetime schema extensions;

create type word_type as enum ('wanderword', 'hidden_english', 'psychology');

create table public.words (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,          -- 'saudade'
  word          text not null,                 -- 'Saudade'
  pronunciation text not null,                 -- 'sow-DAH-day'
  language      text not null,                 -- 'Portuguese' / 'English (coined)' / 'Greek'
  type          word_type not null,
  level         smallint not null check (level between 1 and 5),
  definition    text not null,
  wisdom        text not null,
  is_free       boolean not null default true, -- future freemium switch (never remove)
  published     boolean not null default false,-- founder drafts until flipped
  published_at  timestamptz,                   -- set on first publish; drives rotation set
  audio_url     text,                          -- V1.5 (Supabase Storage)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger words_updated_at before update on public.words
  for each row execute procedure extensions.moddatetime(updated_at);

-- set published_at the first time a row is published
create or replace function public.set_published_at() returns trigger as $$
begin
  if new.published and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$ language plpgsql;
create trigger words_published_at before insert or update on public.words
  for each row execute procedure public.set_published_at();

create index words_updated_at_idx on public.words (updated_at);
```

**Launch-critical convention:** the initial seed **explicitly sets `published_at` to a date before the launch month** (e.g. `2026-01-01`) rather than relying on the trigger. The daily rotation only draws from words published before the current month (§7) — without backdating, the rotation set would be empty for the entire launch month. (The engine also has a fallback for this case, but the data should be right regardless.)

### 6.2 RLS — anonymous read-only

```sql
alter table public.words enable row level security;

create policy "public read published words" on public.words
  for select to anon, authenticated
  using (published);
-- no insert/update/delete policies => default-deny for writes
```

Drafts and unpublished words are invisible to clients. Prefer **unpublish over hard delete** (preserves `published_at` history and the row for republishing), but either propagates correctly under snapshot sync below.

The app ships the **publishable key** (`sb_publishable_...`) — safe to embed by design. Writes happen only through Supabase Studio (Daniel) or migrations/seed scripts (secret key, never in the app).

### 6.3 Sync — freshness probe + full snapshot (deliberately not delta sync)

At this corpus size (127 rows now, ~1,000 design ceiling ≈ 300 KB), cursor-based delta sync buys nothing and costs real edge cases (tombstone visibility, cursor provenance, equal-timestamp misses on bulk updates like the future freemium flip). Instead:

**Probe** (every app foreground, fire-and-forget, ~300 bytes):
```
GET {SUPABASE_URL}/rest/v1/words?select=updated_at&order=updated_at.desc&limit=1
    apikey: {publishable key}
    Prefer: count=exact
```
→ yields `(max_updated_at, total_count)` (count from the `Content-Range` header). Compare with the locally stored stamp; **if unchanged, done.**

**Snapshot** (only when the stamp changed):
```
GET {SUPABASE_URL}/rest/v1/words?select=id,slug,word,pronunciation,language,type,level,
    definition,wisdom,is_free,published_at,updated_at&order=slug.asc
```
→ **atomically replace** the local store (single AsyncStorage key `{ words, stamp }`) on HTTP 200 with a non-empty array. *Guard: never replace with an empty result — a misconfigured RLS policy must not be able to wipe every device.*

Why this detects everything: an edit or publish bumps `max_updated_at`; an unpublish or delete changes `count`; simultaneous publish+unpublish still bumps `max_updated_at`. No tombstones, no cursors, no merge logic — the test surface is "replace store, guard empties."

### 6.4 Content pipeline (manuscript → phones)

1. **Author once:** convert the manuscript's 127 entries into `content/words.csv` in the repo — the durable master for the initial load. Columns = schema fields. (This conversion is its own small task: AI-assisted extraction + a human review pass for `level` and `wisdom` fidelity.)
2. **Seed:** `scripts/import-manuscript.ts` (secret key, run locally/CI — never in the app) upserts the CSV into Supabase **keyed by `slug`** (re-runs must never delete+insert, which would reset `published_at` and disturb the rotation), with `published_at` backdated per §6.1.
3. **Bundle:** `scripts/pull-content.ts` fetches all published words + the `(max_updated_at, count)` stamp **through the anonymous REST endpoint with the publishable key** — so the bundle is byte-equivalent to what a fresh device would sync (a secret-key export could leak drafts). Writes `assets/seed/words.json`. Wired as an **EAS build lifecycle hook** (`eas-build-pre-install`) that fails the build if the output is missing, empty, or stale — bundling fresh content is enforced, not remembered.
4. **Runtime:** first launch loads the bundled seed instantly (offline-perfect), then probe/snapshot forever after.
5. **Daniel adds a word later:** Supabase Studio → Table Editor → insert row (drafts default `published=false`) → flip `published` → every app picks it up on next foreground. **No app release.** New words enter the daily rotation at the next month boundary (§7).
6. **Daniel edits a word:** same flow; propagates on next probe.
7. **Ops convention:** avoid mid-month **unpublishes** when possible — they re-roll the remainder of that month's daily-word sequence for synced clients (§7). End-of-month is the clean moment to retire a word.

### 6.5 Environments

**One Supabase project.** The `published` flag is the content staging mechanism; schema changes are developed against `supabase start` (local Docker) and applied with `supabase db push` / migrations. A second project adds real overhead for a 1–2 person team and V1 has no user data to protect. Revisit only when there's user-generated data (V2 accounts).

### 6.6 V1.5: `daily_overrides` (spec'd now, built later)

Pin a word to a date (book launch, Valentine's → *Limerence*). Deferred from V1: it adds a second API call and replace-window sync semantics for a lever with no committed use yet, and it can't bind offline devices or already-scheduled notification bodies anyway (it guarantees "online users who open that day," not "everyone").

```sql
create table public.daily_overrides (
  date    date primary key,
  word_id uuid not null references public.words(id)
);
-- RLS: select-only for anon; convention (or trigger): word must be published
```
Client rules when built: fetch window `[today−1, today+45]`; **replace** all locally stored overrides in that window with the response (so deleting an override propagates — upsert semantics would leave it stuck forever); `wordOfDay` precedence `override ?? perm[dayIndex]`, falling back to `perm[dayIndex]` whenever the override's `word_id` doesn't resolve to a locally-known published word.

---

## 7. Daily-word engine (exact spec — this gets unit-tested hardest)

**Goal:** same word for every user on the same local calendar date; works offline; tolerates words being added over time; no repeats within a cycle.

```
localDate   = device-local calendar date, 'YYYY-MM-DD'      // "day" is the user's day
monthKey    = localDate.slice(0, 7)                          // '2026-07'
rotationSet = local words with published_at < first instant of monthKey (UTC),
              sorted by id
              — fallback: if empty (bootstrap/misconfig), ALL local words sorted by id
perm        = seededShuffle(rotationSet, seed = 'emotionary-v1:' + monthKey)
dayIndex    = daysSinceEpoch(localDate) mod perm.length
wordOfDay(localDate) = perm[dayIndex]                        // V1.5 adds: override ?? perm[dayIndex]
```

**Pinned definitions (these are protocol, not implementation details):**
- `daysSinceEpoch('YYYY-MM-DD')` = `Date.UTC(y, m−1, d) / 86_400_000` — pure integer math on the **date-string components**, never a live timestamp. (The obvious-but-wrong `Date.now()/86400000` counts UTC days: a user at UTC−8 would flip words at 4 p.m. local.)
- `seededShuffle` = **Fisher–Yates driven by mulberry32, seeded with FNV-1a (32-bit) of the seed string**. This exact algorithm chain is a cross-device, cross-version protocol: every client and the notification scheduler must compute byte-identical permutations forever. Changing *any* part of it requires bumping the seed prefix to `emotionary-v2:` (deliberately re-rolling everyone at once). Golden fixtures pin exact outputs.
- **Month-boundary repeat guard:** after computing month M's perm, if day 1's word equals the last day of month M−1's word (computable on any device from the same pure functions), swap perm positions `dayIndex(day1)` and `(dayIndex(day1)+1) mod n`. Without this, ~1/127 month boundaries would serve the same word two days running.

**Properties:** deterministic on any device at any time (also powers V1.5 history); the **monthly freeze** (`published_at < monthKey`) means newly published words join at the next month boundary — so publishing words, the routine content operation, *never* disturbs the current month, and all synced clients agree. Two documented soft spots, both accepted: a client offline for weeks diverges until its next sync (invisible — no cross-user surface in V1), and a **mid-month unpublish** shrinks the rotation set and re-rolls the remainder of the month for synced clients (rare by ops convention §6.4.7; Browse/Detail hide the word immediately either way).

**Unit-test fixtures (minimum):** golden perm for a known seed; month-boundary transition + repeat guard; new word published mid-month (no effect until next month); unpublish mid-month (documented re-roll, no crash); empty rotation set → fallback; zero words at all; the 4 p.m.-UTC−8 case; DST spring/fall dates; leap day.

**Streak rule (Stats):** on viewing Today, with `diff = localDate − lastOpenDate` in calendar days: `diff <= 0` → no-op (keep `max(lastOpenDate, localDate)` — clock set back or date-line travel must not double-count or farm streaks); `diff == 1` → streak+1; `diff > 1` → streak = 1; unset → streak = 1. Stored: `{ lastOpenDate, streak }`.
**Words read:** unique slugs whose Today/Detail view was seen ≥ 2 s.
**Shared:** increments **at most once per word per local date**, on share-sheet completion or download success.

---

## 8. Notifications (research-verified design)

**Constraint chain that dictates the design:** per-day word in the notification body → repeating triggers can't do that → pre-schedule individual `DATE`-trigger notifications → iOS keeps only the 64 soonest → maintain a rolling queue.

- **Rebuild-from-scratch idiom:** on every app foreground and on any settings change: `cancelAllScheduledNotificationsAsync()`, then schedule dated notifications at the user's chosen time — **worded content only through the last day of the current month** (its permutation is frozen; §7 makes it immune to publishes), then **generic sentinels** ("Your word of the day is waiting ✳") filling the remaining slots to **38 total**. Worded: title `Today's word: Apricity`, body = first clause of the definition (≤ ~100 chars). One code path self-heals timezone moves, time changes, and content changes. 38 slots leaves iOS headroom. *(Why not worded 31 days regardless of month boundary: next month's permutation legitimately changes whenever a word is published this month — cross-boundary worded bodies would name wrong words for anyone who doesn't reopen in between.)*
- **Start-day rule:** if the chosen time has already passed today, or today's notification was already presented, scheduling starts **tomorrow** — otherwise the rebuild right after a 9:00 notification tap would create a past-dated trigger that fires instantly as a duplicate.
- **Single-flight guard:** foreground handler, notification-tap handler, and settings changes can race on cold start — the rebuild function must be wrapped so concurrent calls collapse into one execution (in-flight promise reuse).
- **No background top-up in V1** (deliberate cut): `expo-background-task` would only serve users dark for 31+ days, and the OS kills it exactly when needed (iOS force-quit, Android OEM battery managers). Foreground rebuild + the sentinel tail covers everyone who opens monthly; if a user goes fully dark, notifications stop after the sentinel week until the next open — accepted V1 limitation; **V2 server push** is the real fix and nothing here blocks it.
- **Android:** dedicated `daily-word` channel (created before any scheduling, required Android 13+); `POST_NOTIFICATIONS` runtime permission via `requestPermissionsAsync()`; **no exact-alarm permissions** — inexact delivery, copy says "around 9:00." Reboot persistence of scheduled notifications goes on the M3 device test matrix (historically flaky area).
- **iOS:** full permission via the contextual onboarding ask (not provisional — quiet delivery defeats a streak product). Denied → Settings row deep-links to system settings.
- **Tap → deep link** to Today (`emotionary://today` — custom scheme only in V1; universal links are V1.5), which triggers the rebuild + probe.

---

## 9. Monetization seam (build now, activate later)

- **Now (V1):** `is_free` on every word (all `true`); `src/entitlements/` exposing `hasFullAccess(): boolean` (returns `true`) and `canViewWord(word)` = `hasFullAccess() || word.is_free || isTodaysWord(word)`; every surface (Browse, Detail, share, notification deep link) routes through it. Settings reserves the Restore Purchases row. **Rule locked now: today's word is always free** — freemium must never break the daily core loop.
- **Later (flip freemium on):** `npx expo install react-native-purchases` (no config plugin; EAS Build supported; Expo Go falls back to a mock "Preview API mode"), one entitlement `full_access`, attach a non-consumable "lifetime unlock" product (a subscription can be added to the same entitlement later without code changes — offerings are dashboard-remote). Swap `hasFullAccess()` to check RevenueCat's cached `CustomerInfo` (works offline). Set the free/premium split with a Postgres `UPDATE words SET is_free = ...` — **no app release** (snapshot sync propagates bulk updates correctly by design). Anonymous app-user IDs mean no login; restores are per-store-account and **per-platform** (an iOS purchase can't restore on Android — accepted at this price point; accounts would fix it in V2+). RevenueCat costs $0 until >$2.5k/mo tracked revenue.
- Client-side gating is honest-user gating (the read API is public); server-enforced gating would need accounts + a webhook-fed entitlement check — explicitly out of scope, additive later.

---

## 10. Share cards (verified July 2026)

- **Rendering & capture:** the share modal's **visible preview is the capture target** — no separate off-screen tree (off-screen capture is the flakiest view-shot mode on Android: unlaid-out views throw, collapsed views capture blank). The preview card sits in a fixed 9:16 wrapper with `collapsable={false}`; DOWNLOAD/SHARE stay disabled until fonts (`Font.loadAsync`) and the card's `onLayout` have completed. Capture via **react-native-view-shot** (`~5.1.0`, pinned by Expo SDK 57; plain autolinked module, no config plugin): `captureRef(ref, { width: 1080 / PixelRatio.get(), height: 1920 / PixelRatio.get(), format: 'png', quality: 1 })` — **the width/height options are logical points, so divide the pixel target by `PixelRatio.get()`** (per the official Expo captureRef docs) to emit exactly 1080×1920 on every device. Skia confirmed unnecessary for typographic cards (its snapshots are screen-scale-bound and weaker for this).
- **Card layout (Story 1080×1920):** level-color full-bleed background (the prototype's magenta Anhedonia card is the reference); centered: type badge → word (display serif, white/ink per palette contrast) → definition (max ~6 lines) → thin rule → `EMOTIONARY` wordmark → "Get the app + the book → emotionarybook.com" (plain text — tappable universal links are V1.5). Wisdom line and pronunciation stay off the card (breathing room; the card is a hook, the app has the depth). Square 1080×1080 variant: V1.5.
- **Save (DOWNLOAD):** `expo-media-library` **new class-based API** (`Asset.create(uri)` — `saveToLibraryAsync`/`createAssetAsync` are legacy as of SDK 57). iOS: add-only permission (`savePhotosPermission` plugin option + `writeOnly: true` request). **Android: strip `READ_MEDIA_*` from the manifest** (set the plugin's `granularPermissions` to the minimum / use `android.blockedPermissions`) — saving your own file needs no read permission on modern Android, and Google Play's photo-permissions policy (enforced May 2025) removes apps carrying `READ_MEDIA_IMAGES` without justification. Verify the write-only save path on an API 33+ device in M3.
- **Share:** `expo-sharing` `shareAsync(tmpfileUri, { mimeType: 'image/png' })` — native sheet, reaches Instagram/FB/Messages everywhere, no permissions.
- **V1.5 — direct Instagram Stories target:** verified still alive in 2026 (Meta's pasteboard/intent mechanism is app-to-app, untouched by the Graph API deprecations); requires a **Meta App ID** (mandatory since 2023) and `react-native-share` (~12.3.1, ships an Expo config plugin for the iOS query schemes + Android `<queries>`). Static images are the reliable path (known quirks are video-only).
- Share cards double as **App Store screenshots and launch marketing assets** — a dev-only screen can batch-export cards for any word.

---

## 11. Client architecture

```
emotionary/
├── app/                          # expo-router
│   ├── (tabs)/
│   │   ├── index.tsx             # Today
│   │   ├── browse.tsx
│   │   └── stats.tsx
│   ├── word/[slug].tsx           # Word Detail (with not-found fallback, §5.3)
│   ├── share/[slug].tsx          # Share modal (transparent modal route)
│   ├── settings.tsx              # sheet
│   └── onboarding.tsx
├── src/
│   ├── content/                  # words store: bundled seed load, probe + snapshot sync
│   ├── daily/                    # wordOfDay engine (pure functions — heaviest unit tests)
│   ├── notifications/            # queue rebuild (single-flight), permissions
│   ├── share/                    # card component, capture, save/share
│   ├── entitlements/             # gating seam (hardcoded open in V1)
│   ├── store/                    # zustand + AsyncStorage persist: favorites, stats, settings
│   ├── theme/                    # tokens: level palettes, type scale, fonts, spacing
│   └── components/
├── assets/fonts/  assets/seed/words.json
├── supabase/                     # config.toml, migrations/, seed/
├── content/words.csv             # manuscript master
├── scripts/pull-content.ts  scripts/import-manuscript.ts
└── eas.json
```

- **State:** `zustand` with AsyncStorage persistence for user data; the content module holds the word list in memory (127–1,000 entries ≈ trivial; research confirmed AsyncStorage over SQLite at this scale — one key: `{ words, stamp }`). No TanStack Query — there is exactly one probe + one snapshot call; a library would outweigh it.
- **Styling:** plain `StyleSheet` + a `theme/tokens.ts` (level palettes L1–L5, type scale, spacing). No NativeWind — a typography-first app with ~6 screens wants hand-set type, not utility classes.
- **Fonts (proposal, designer to confirm against the book):** display serif **Fraunces** (word hero, wordmark), text serif **Literata** (definitions, wisdom italic), letterspaced caps of Literata for badges/origin lines. Both are Google Fonts (free to embed).
- **Level palettes:** placeholder tokens sampled from the prototype — L1 ivory, L2 lavender, L3 dusty rose, L4 sage, L5 plum/magenta — each with a paired ink + on-color for share-card contrast. **Final palettes come from the book's designer** (brief: "to be defined with designer").
- **Testing:** Jest unit tests on `daily/` (the full fixture list in §7), `content/` (snapshot replace, empty-response guard, probe stamp comparison, seed bootstrap), streak logic; manual device matrix (old Android + iPhone) for notifications (incl. Android reboot persistence) and share capture; Maestro E2E optional at M5.
- **Config:** `SUPABASE_URL` + publishable key via `app.config.ts` `extra`/env per EAS profile (`development` / `preview` / `production`); EAS Update enabled for JS-only OTA fixes.

---

## 12. Delivery plan (~6 weeks, one developer + AI)

| Milestone | Scope | Exit criteria | Riskiest bit |
|---|---|---|---|
| **M0** (wk 0) | Apple Dev + Play Console enrollment (start **day 1** — Play new-account review can take days; Apple $99/yr, Play $25 once); repo scaffold, Supabase project, EAS profiles, fonts licensed/loaded | Dev build runs on both platforms | account/enrollment lag |
| **M1** (wk 1) | Manuscript → `words.csv` → seed (backdated `published_at`!) → Supabase; bundled seed + probe/snapshot sync; daily engine + full fixture suite | App boots offline with all 127 words; a Studio edit round-trips; golden perm fixtures green | manuscript conversion fidelity |
| **M2** (wk 2–3) | Today, Browse (chips + level dots + search), Word Detail; theming/tokens; favorites | Navigable dictionary matching prototype feel | typography polish absorbing time |
| **M3** (wk 3–4) | Notification queue + onboarding permission flow; share-card renderer + save/share | Daily notification E2E on both platforms incl. reboot; 1080×1920 card in camera roll on API 33+ with no READ_MEDIA_* in manifest | Android OEM notification quirks |
| **M4** (wk 4–5) | Stats + streak, Settings sheet, deep links, empty states | Feature-complete V1 | streak edge cases |
| **M5** (wk 5–6) | Accessibility pass, perf, beta via TestFlight + Play internal track; fix cycle | 10+ external testers, crash-free week | review feedback churn |
| **M6** (wk 6) | Store listings (share-card-derived screenshots), privacy questionnaires, submit | Approved & live | Apple review (notification permission UX must be clean) |

**Privacy posture (makes review easy):** no accounts, no PII, no analytics in V1, no tracking — "Data Not Collected" on the App Store label, all user data on-device.

**Running costs:** Apple $99/yr + Play $25 + Supabase $0 (→ $25/mo Pro at traction or for zero pause-risk) + EAS free tier (paid tier ~$19/mo only if build queues bite) + RevenueCat $0 pre-revenue ⇒ **≈ $124 to launch**, ≈ $0–45/mo after.

**Content ops after launch:** Daniel edits in Supabase Studio (spreadsheet-like; guardrails are in the schema — level check, enum type, unique word/slug, drafts default unpublished). New word → publish → in all apps on next open, in rotation next month. Unpublishes ideally at month boundaries (§6.4.7). App release needed only for native/UI changes; JS fixes ship OTA via EAS Update.

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| iOS notification queue exhaustion (user dark past the sentinel tail) | worded-through-month-end + sentinel fill + rebuild on open/tap; V2 server push erases it |
| Android OEM battery managers killing scheduled notifications | inexact-alarm design, channel setup, "around 9:00" copy, reboot test in M3; dontkillmyapp is industry-wide unsolved |
| Google Play photo-permissions policy (May 2025) | write-only save path, `READ_MEDIA_*` stripped from manifest, verified in M3 |
| Supabase free-tier pause (7 days inactivity) | offline-first means the app never breaks; keep-alive cron or Pro plan at launch |
| **App name collision/trademark ("Emotionary")** | search App Store/Play + USPTO **before** M0 branding; fallback name: "The Emotional Dictionary" |
| Manuscript → JSON conversion errors (wrong level, mangled wisdom lines) | conversion script + human review pass; `published=false` drafts until checked |
| Word-content licensing vs the book's publisher | confirm app rights to reuse definitions verbatim (contract check — cheap now, painful later) |
| Stale/empty bundled seed shipped in a release | `pull-content` runs as an EAS build hook that fails the build if the seed is missing, empty, or stale |
| expo-widgets API churn (V2) | pinned SDK; widgets deliberately deferred to V2 |
| Scope creep from the V2 list | this document's V1 table is the contract; V2 starts only after launch |
| One-developer bus factor | this doc + tested pure-function core + boring stack = anyone can pick it up |

---

## 14. Decisions needed from Daniel (nothing else blocks starting)

1. **App name:** Emotionary (recommended) vs The Emotional Dictionary — plus a quick store/trademark search.
2. **Level palettes + fonts:** confirm the five colors and the Fraunces/Literata proposal against the book's design (placeholders unblock all development meanwhile).
3. **Default notification time:** 9:00 local proposed.
4. **Book CTA destination:** emotionarybook.com vs retailer link (string constant — changeable anytime, also OTA).
5. **Freemium ground rule** (pre-commitment, no code impact now): confirm "today's word is always free."
