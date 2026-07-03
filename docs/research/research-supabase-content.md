# Supabase as a Read-Mostly Content Backend for Emotionary — Research Brief (verified July 2026)

## 1. Anonymous read access + API key system

**The key system changed — your "anon key" assumption needs updating.** Supabase replaced legacy JWT-based `anon`/`service_role` keys with **publishable keys** (`sb_publishable_...`) and **secret keys** (`sb_secret_...`).

- Timeline: new keys launched mid-2025; **since Nov 1, 2025 new projects no longer get legacy `anon`/`service_role` keys at all**; legacy keys are slated for full deletion "late 2026 (TBC)". A project created today gets only publishable + secret keys ([changelog](https://supabase.com/changelog/29260-upcoming-changes-to-supabase-api-keys), [migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)).
- Publishable key is explicitly "safe to expose online: web page, mobile or desktop app… source code." Secret key bypasses RLS — server-side only, never in the app ([API keys doc](https://supabase.com/docs/guides/getting-started/api-keys)).
- **Header gotcha:** publishable/secret keys go in the **`apikey` header ONLY**. Putting them in `Authorization: Bearer` fails with "Invalid JWT" (legacy keys used both headers). supabase-js handles this; matters if you do raw fetch ([migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)).
- Unauthenticated requests with the publishable key hit Postgres as the **`anon` role** — that part of your assumption still holds. Recommended setup for the `words` table:

```sql
alter table public.words enable row level security;
create policy "public read published words"
  on public.words for select
  to anon, authenticated
  using (published = true);
-- no INSERT/UPDATE/DELETE policies => default-deny for writes
```

Naming the role with `TO anon` is documented best practice (policies without it evaluate for every role) ([RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security), [Securing your API](https://supabase.com/docs/guides/api/securing-your-api)). A `published boolean` column is worth adding so the founder can draft entries without shipping them.

## 2. supabase-js in Expo / React Native

- Current version: **@supabase/supabase-js 2.110.0** (June 2026; still the v2 line; 2.110.0 dropped Node 20 support — irrelevant to RN runtime, relevant to CI) ([npm](https://www.npmjs.com/package/@supabase/supabase-js), [releases](https://github.com/supabase/supabase-js/releases)).
- The **official Expo quickstart changed**: it now installs `@supabase/supabase-js react-native-url-polyfill expo-sqlite` and uses `import 'expo-sqlite/localStorage/install'` for auth session storage — **not AsyncStorage** (AsyncStorage still works but is no longer what the docs show). `react-native-url-polyfill/auto` is still required (RN lacks full URL/URLSearchParams) ([Expo quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)).
- **For Emotionary specifically: all auth storage config is irrelevant** — no accounts, no sessions. If you use supabase-js, pass `auth: { persistSession: false }` and skip the storage adapter entirely.
- **Plain `fetch` to PostgREST is a perfectly reasonable, lighter alternative** for a read-only anonymous client, and I'd recommend it here:

```
GET https://<ref>.supabase.co/rest/v1/words?select=*&updated_at=gt.<cursor>&order=updated_at.asc
apikey: sb_publishable_xxx
```

One endpoint, one header, no SDK, no URL polyfill, smaller bundle, nothing to keep in sync with supabase-js releases. Trade-off: you lose the typed query builder and would add supabase-js later if V2 brings auth/realtime. Either choice is defensible; document the raw-REST option as the V1 default with supabase-js as the drop-in upgrade path.

## 3. Offline-first sync pattern

Your plan (bundled seed JSON + `updated_at` delta cursor) is exactly the established **pull-only sync** pattern — it's the "pull" half of WatermelonDB's documented sync protocol ([Supabase + WatermelonDB blog](https://supabase.com/blog/react-native-offline-first-watermelon-db)). Full sync engines (WatermelonDB, PowerSync, supastash) exist for **read-write** offline sync and are overkill for 127 read-only rows.

Implementation notes from prior art ([conflict-safe SQLite sync writeup](https://dev.to/sathish_daggula/react-native-offline-first-conflict-safe-sqlite-sync-549a)):
- **`updated_at` needs a trigger** — Postgres doesn't auto-update it. Enable the `moddatetime` extension and add a `BEFORE UPDATE` trigger, or the delta query silently misses edits.
- **Use the server's `max(updated_at)` from the response as the next cursor**, never the device clock (clock skew). Overlap with `gte` + upsert-by-id makes re-delivery harmless (sync is idempotent).
- **Deletes don't show up in a `updated_at > cursor` query.** Use soft delete: `deleted_at` / `published=false` and have the client tombstone locally. For this app, "unpublish" is the delete.
- **Storage: AsyncStorage (or a single JSON file) is the right call at this scale.** 127 entries is ~100–200 KB of JSON — read it once at launch into memory. expo-sqlite is warranted only if the corpus grows to thousands of entries or needs indexed search; Android AsyncStorage's ~2 MB-per-entry / 6 MB default ceiling is nowhere near a concern. Store `{ words: [...], cursor: "<max updated_at>" }` as one key; bundled seed JSON is the fallback when the key is absent.

## 4. Free tier & pricing (verified against supabase.com/pricing, July 2026)

| | Free | Pro |
|---|---|---|
| Price | $0 | **$25/mo** + usage; includes $10/mo compute credit (covers one Micro instance) |
| Database | 500 MB (shared CPU, 500 MB RAM) | 8 GB disk included, then $0.125/GB |
| File storage | 1 GB | 100 GB tier |
| Egress | **5 GB** (+5 GB cached) | 250 GB, then $0.09/GB |
| API requests | Unlimited | Unlimited |
| Projects | 2 active | Unlimited (compute billed per project) |
| Pausing | **Paused after 1 week of inactivity** | Never paused |

([pricing](https://supabase.com/pricing), [project pausing doc](https://supabase.com/docs/guides/platform/free-project-pausing))

Gotchas for a low-traffic production app:
- **Pausing is the big one**: no sufficient DB activity for 7 days → project pauses → API returns errors until **manually** restored from Studio; 90-day restore window (data retained; after 90 days you must download a backup). "A few user requests per day" keeps it alive — real daily-word users will do this, but the pre-launch/low-traffic window is at risk. Your offline-first design is the safety net: app degrades to cached/bundled words, never breaks. Mitigation options: a scheduled keep-alive ping (e.g. GitHub Actions cron hitting the REST endpoint — community prior art: [supabase-pause-prevention](https://github.com/travisvn/supabase-pause-prevention)) or just upgrade to Pro at launch.
- Rows: no row-count limit — the limit is the 500 MB database; 127 (or 10,000) text rows is nothing.
- Egress: full 127-word sync ≈ 100–200 KB; delta sync makes typical traffic bytes. Even 10k users doing a full sync monthly ≈ 2 GB — fine, and the offline-first design means most launches hit zero network.
- Free tier includes no daily backups and community-only support; exceeding free limits triggers the Fair Use policy (service can stop serving until upgrade/reset).

**Recommendation:** launch on Free (offline-first absorbs a pause), budget $25/mo Pro as the "app has real users" switch — it also removes the pausing risk entirely.

## 5. Founder content workflow

**Recommend: Supabase Studio Table Editor, nothing custom.**
- The Table Editor is a spreadsheet-like UI: inline cell editing, row insert, sort/filter — genuinely usable by a non-developer ([Tables and Data](https://supabase.com/docs/guides/database/tables)).
- Bulk import: **CSV/TSV/XLSX upload or direct paste-from-spreadsheet works on EXISTING tables** via Insert → "Import Data from CSV" (100 MB dashboard limit — irrelevant here). Good path for the initial 127-word load from the book manuscript ([import data doc](https://supabase.com/docs/guides/database/import-data)).
- Guardrails to add in the schema since the Table Editor has no app-level validation: `CHECK (level BETWEEN 1 AND 5)`, an enum/check for word type (`wanderword | hidden_english | psychology`), `NOT NULL` on word/definition, `UNIQUE (word)`, `published` default `false` so new rows are drafts until flipped.
- Invite the founder to the Supabase org as a dashboard member (note: fine-grained dashboard roles are Team-plan+; on Free/Pro members get broad access — acceptable for a two-person team, worth a one-line risk note in the doc).
- A custom admin panel, Airtable sync, or CSV pipelines are all overkill for one editor and ~weekly edits; revisit only if editing volume or contributor count grows.

## Corrections to your assumptions
1. **"anon key" is legacy.** A new 2026 project uses `sb_publishable_...` / `sb_secret_...`; legacy JWT keys don't exist on new projects and die entirely late 2026. Design doc should say "publishable key," and note the `apikey`-header-only rule for raw REST.
2. **AsyncStorage for supabase-js auth is outdated guidance** — the official Expo quickstart now uses `expo-sqlite/localStorage`. Moot for this app (no auth), but don't cite AsyncStorage as "the Supabase RN setup" in the doc. AsyncStorage remains fine as the app's own content cache.
3. "Rows" is not a billed dimension — database size (500 MB free) is. Everything else in your assumptions checked out.

Sources: [API keys](https://supabase.com/docs/guides/getting-started/api-keys) · [Key migration](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys) · [Key changelog](https://supabase.com/changelog/29260-upcoming-changes-to-supabase-api-keys) · [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Securing your API](https://supabase.com/docs/guides/api/securing-your-api) · [Expo quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) · [supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) · [supabase-js releases](https://github.com/supabase/supabase-js/releases) · [Pricing](https://supabase.com/pricing) · [Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing) · [Import data](https://supabase.com/docs/guides/database/import-data) · [WatermelonDB offline-first blog](https://supabase.com/blog/react-native-offline-first-watermelon-db) · [PowerSync on Supabase offline](https://powersync.com/blog/bringing-offline-first-to-supabase) · [pause-prevention](https://github.com/travisvn/supabase-pause-prevention)