# Adversarial design-review findings (2026-07-03) — all confirmed items applied in DESIGN.md v1.1

## Critic A: fidelity & internal consistency

[blocker] §§7 Daily-word engine (vs §6.4 content pipeline)
  ISSUE: The rotation set is 'published words with published_at < first instant of monthKey'. published_at is set by trigger to now() when Daniel flips published. At launch, all 127 words will be published during the launch month, so for every user in that month rotationSet is EMPTY: perm.length = 0, dayIndex = n mod 0 is a crash/NaN, and wordOfDay is undefined. The doc never defines bootstrap behavior.
  FIX: Two-part fix: (a) seed import must explicitly set published_at to a date before the launch month (e.g. '2026-01-01') instead of relying on the trigger, and §6.4 must state this convention; (b) add an engine fallback rule anyway: if rotationSet is empty, use all locally-known published words (same sort/seed) — and add this case to the unit-test fixture list.

[major] §§7 monthly freeze vs §6.2 tombstones
  ISSUE: §7 claims 'every client that has synced any time this month agrees' — but that only holds for additions. The rotation set is defined as *currently published* words, so an unpublish (the doc's mandated deletion mechanism) mutates rotationSet mid-month on clients that sync the tombstone: perm.length changes, the seeded shuffle produces a completely different permutation, and the remainder of the month's daily words silently diverge between synced and unsynced clients — directly contradicting the determinism goal and the 'global same word' claim in §3.5.
  FIX: Change the rotation-set definition to depend only on the immutable field: rotationSet = words with published_at < monthStart, regardless of current published flag (tombstoned words stay in rotation until month end using the client's cached copy; they disappear from Browse immediately). Document that unpublish takes rotation effect at the next month boundary. Add a fixture: unpublish mid-month → daily sequence unchanged.

[major] §§7 override precedence vs §6.1/§6.2 daily_overrides
  ISSUE: daily_overrides RLS is using(true) and the FK only requires the word row to exist — an override can reference a never-published draft (invisible to clients via the words RLS) or a word the device hasn't synced yet. wordOfDay(localDate) = override ?? perm[dayIndex] has no rule for 'override word_id not present in local store', so Today renders nothing on exactly the high-visibility marketing dates overrides exist for.
  FIX: Specify in §7: if the override's word_id doesn't resolve to a locally-known published word, fall back to perm[dayIndex] (add to the unit-test fixtures). Additionally state the ops convention in §6.4: overrides may only point at already-published words (optionally enforce with a trigger checking words.published).

[major] §§6.3 sync rules vs daily_overrides
  ISSUE: Sync rules say 'upsert by id (idempotent)' — but daily_overrides has no updated_at/tombstone mechanism, so if Daniel deletes or re-points an override row, upsert semantics leave the stale override on every device forever, and it wins over the rotation (§7). The one feature built for 'everyone must see X on launch day' is the one the sync design can silently get wrong.
  FIX: Give daily_overrides its own sync rule: the client fetches the [today-1, today+45] window and REPLACES all locally-stored overrides in that range with the response (deletion propagates naturally). State it explicitly in §6.3; upsert-by-id applies to words only.

[major] §§5.3 Word Detail / §8 / §10 (deep links)
  ISSUE: §5.3 says Word Detail is 'reached from … a share deep link', but nothing provides one: the share card (§10) carries only the plain text 'emotionarybook.com', §8 defines only the notification link emotionary://today, no universal-link/app-link setup appears anywhere, and 'share deep link' is absent from the §4 V1/V1.5/V2 table. As written it's an entry point with no producer.
  FIX: Either delete 'share deep link' from §5.3 (Detail reached from Browse, Stats, notification tap), or define it: universal/app links on emotionarybook.com/w/{slug}, printed or embedded on the card, added as a row in the §4 table (V1.5 is the honest slot since it needs web-domain configuration).

[major] §§7 seededShuffle
  ISSUE: The PRNG is specified as 'e.g. mulberry32 over a string hash' — an example, not a decision. But the permutation is a cross-device, cross-app-version protocol: the whole 'same word for every user' guarantee (§3.5) depends on every client, every future refactor, and the notification scheduler computing byte-identical shuffles. An 'e.g.' invites a later swap that silently forks daily words between app versions.
  FIX: Lock the algorithm as a protocol constant: Fisher–Yates + mulberry32 seeded by a named string hash (e.g. FNV-1a 32-bit) over 'emotionary-v1:' + monthKey, and state that changing any of it requires bumping the seed prefix to 'emotionary-v2:' (which intentionally re-rolls everyone at once). Golden fixtures pin the exact output.

[minor] §§5.2 / §5.4 / §7 (unresolved 'or' options)
  ISSUE: A doc whose §3 header says 'locked for V1' still contains open options outside the sanctioned §14 list: §5.2 search field 'appears on scroll-down or persistent — designer's call'; §5.4 favorites removal 'swipe or heart-toggle'; §7 Shared counter 'incremented on share-sheet completion callback (or on DOWNLOAD success)'; §6.4 'words.csv (or JSON)' and 'seed.sql (or a small TS script)'.
  FIX: Pick defaults now and move any genuinely open item into §14: persistent search field (simplest, discoverable); heart-toggle to remove (swipe-to-delete is undiscoverable and conflicts with list scroll); Shared increments on EITHER share-completion OR download-success but at most once per word per day (state it as a rule, not an 'or'); words.csv + seed via the TS import script (CSV import as fallback).

[minor] §§5.7 Share modal
  ISSUE: §5.7 claims the modal is 'matching the prototype', but the prototype modal shows explicit Messages/Instagram/Facebook target buttons; V1 replaces them with a single SHARE → native sheet (correctly deferred in §4/§10). The screen spec itself never acknowledges the omission, so §5.7 contradicts the prototype it cites as ground truth.
  FIX: Add one sentence to §5.7: 'The prototype's explicit Messages/Instagram/Facebook target row is replaced by the OS share sheet in V1; direct targets return with the V1.5 Instagram-Stories integration.'

[minor] §§5.1 Today / §5.3 Word Detail
  ISSUE: §5.1 opens with 'Exactly the prototype layout', but the prototype shows a speaker icon next to the pronunciation and audio is deferred to V1.5 (§2 row 12). The screen spec silently drops a visible prototype element while claiming exactness.
  FIX: Note in §5.1: 'The prototype's speaker icon is omitted until V1.5 audio ships (no dead/disabled control in V1)' — mirroring how §5.4 explicitly handles the omitted widget section.


## Critic B: over/under-engineering & correctness

[blocker] §§7 Daily-word engine
  ISSUE: Empty rotation set: rotationSet = published words with published_at < first instant of the current month. Every word seeded/published in the current month is excluded, so on a fresh project (M1 seed happens in week 1) every device computes perm.length = 0 and dayIndex = N mod 0 = NaN — Today crashes or renders blank for the entire seeding month. Same failure recurs any time content is re-imported in a way that resets published_at (e.g. Studio delete + CSV re-import gives all rows a new published_at).
  FIX: Add an explicit fallback to the spec: if rotationSet is empty, use all published words sorted by id (seeded with the same monthKey). Add a unit-test fixture for 'all words published mid-month' and 'zero words'. Also note in §6.4 that re-imports must preserve published_at (upsert by slug, never delete+insert).

[blocker] §§7 + §8 (unpublish vs monthly freeze)
  ISSUE: Unpublishing a word mid-month silently reshuffles the entire month. rotationSet filters on published, so removing one word changes the array fed to seededShuffle — a completely different permutation for every remaining day. Synced clients jump to new words mid-month; unsynced clients keep the old sequence, breaking the 'every client agrees' guarantee the design explicitly claims. It also invalidates all 31 already-scheduled notification bodies at once, and a user can tap a notification saying 'Today's word: X' while the app shows Y and word/[slug] for X 404s (X is now a tombstone).
  FIX: Freeze membership on published_at only: rotationSet = words with published_at < month start, ignoring the current published flag. At resolve time, if perm[dayIndex] is unpublished, deterministically advance to the next published entry ((dayIndex+1) mod n, ...). Removal then affects only the removed word's day(s), synced clients still agree, and the rest of the month is untouched. Give word/[slug] a graceful 'word unavailable' fallback (attempt sync, then route to Today) instead of assuming the slug resolves.

[major] §§8 Notifications (rebuild race / duplicate fire)
  ISSUE: Two concrete rebuild bugs: (1) Rescheduling 'days 1–31 at the user's chosen time' right after that time has passed (exactly the state after tapping the 9:00 notification, or opening at 9:05) creates a DATE trigger in the past for day 1, which fires immediately — user taps a notification and instantly receives a duplicate. (2) A cold start from a notification tap runs the rebuild twice concurrently (app-foreground listener + tap deep-link handler); interleaved cancelAll/schedule can produce doubled or zero pending notifications.
  FIX: Spec the rebuild as: startDay = (user's chosen time already passed locally, or today's notification already presented) ? tomorrow : today. Wrap the rebuild in a single-flight guard (in-flight promise reuse / mutex) so foreground + tap + settings-change collapse to one execution. Add 'reboot persistence of scheduled notifications on Android' to the M3 device test matrix — it is a historically flaky area of expo-notifications.

[major] §§8 Notifications (cross-month scheduling)
  ISSUE: Days 1–31 with 'real content' inevitably cross a month boundary. Next month's perm depends on every word published before the 1st — so any single publish this month rewrites next month's sequence, meaning already-scheduled next-month notifications name the wrong word (notification: 'Today's word: X', app: Y) for any user who doesn't foreground between the publish and the fire date. The design's 'acceptable skew' framing covers edits, but here one routine content-ops action (publishing a word — the whole point of Supabase) invalidates a whole tail of the queue.
  FIX: Schedule real-content notifications only through the last day of the current month (whose perm is frozen and immune to publishes), then generic sentinels for the remaining slots up to 38. Same slot math, same code path, and the only remaining in-month skew sources are overrides/unpublish, which are rare and already documented.

[major] §§7 Streak rule
  ISSUE: The two-branch rule ('increments when localDate ≠ lastOpenDate; resets if localDate − lastOpenDate > 1') mishandles negative diffs. Set the clock back a day (or fly west across the date line): localDate ≠ lastOpenDate → streak increments AND lastOpenDate moves backwards, so the next real day increments again — one day of travel or one clock change double-counts, and deliberate clock-stepping farms unlimited streak.
  FIX: Spec three explicit cases on diff = localDate − lastOpenDate (in calendar days): diff <= 0 → no-op (keep max(lastOpenDate, localDate)); diff == 1 → streak+1; diff > 1 → streak = 1. Add negative-diff and same-day-repeat fixtures to the unit tests.

[major] §§6.2 / §6.3 Delta sync (over-engineering)
  ISSUE: Cursor-based delta sync + tombstone-exposing RLS + 'hard deletes forbidden by convention' is over-built for a corpus of 127 (design ceiling ~1,000) rows. It creates the exact edge cases the design then has to defend: cursor provenance in the bundled seed, gt. vs equal timestamps, tombstone visibility, a convention Daniel can violate with one click in Studio. All of it exists to avoid re-downloading ~40 KB per foreground.
  FIX: Replace with full-snapshot sync: on foreground, GET all published words (RLS policy becomes simply `using (published)`), atomically replace the local store on 200. Unpublish, hard delete, and is_free flips all propagate automatically; no cursor, no tombstones, no seed-cursor provenance; the §11 test matrix loses 'delta merge, tombstones, cursor' entirely. Keep the bundled seed for first-launch offline. At 1,000 words this is ~300 KB fire-and-forget — still fine; add If-None-Match/ETag if it ever matters.

[major] §§6.3 Sync rules (if delta sync is kept)
  ISSUE: `updated_at=gt.{cursor}` loses rows in two real cases: (1) bulk updates (e.g. `UPDATE words SET is_free=false WHERE level>3` for the freemium flip) stamp many rows with the identical transaction now(); (2) a Studio transaction that begins before a client's read but commits after has updated_at <= cursor and is skipped forever — updated_at is transaction-start time, not commit time. With one writer this is low-probability but permanent when it hits, and the freemium flip in §9 is precisely a bulk update.
  FIX: Use `updated_at=gte.{cursor minus 2s}` (overlap window) — the upsert-by-id merge is already idempotent so re-receiving rows is free. One-line change, closes both holes. (Moot if snapshot sync is adopted.)

[major] §§6.4 Content pipeline (release-time seed consistency)
  ISSUE: Two gaps in the bundled-seed step: (1) 'Run pull-content before every release build' is a human convention — a forgotten run ships a stale or (on the first release) empty/dev-state words.json, and nothing detects it. (2) If pull-content runs with the secret key it bypasses RLS and can bundle never-published drafts or compute a cursor over rows the app can never see; the seed must be captured through exactly the app's visibility.
  FIX: Make pull-content an EAS build lifecycle hook (eas-build-pre-install) or a CI gate that fails the build if assets/seed/words.json is missing, empty, or older than N days. Hard-code the script to the publishable key + anon REST endpoint so the bundle is byte-equivalent to what a fresh device would sync.

[major] §§5.3 / §10 Share deep links
  ISSUE: Word Detail is 'reached from … a share deep link', but nothing on the V1 share card carries a link an OS can open into the app (the card says emotionarybook.com), and the design never specs universal links / Android App Links (AASA + assetlinks.json hosted on emotionarybook.com, domain entitlements) — real, fiddly work that isn't in any milestone. As written it's a dangling feature: mentioned, unscheduled, unbuildable.
  FIX: Cut share deep links from V1 explicitly (card keeps the plain emotionarybook.com URL; the custom scheme emotionary://today stays for notification taps only, which needs no domain setup). Move universal links to V1.5 alongside the Instagram share target. Keep the word/[slug] not-found fallback from the unpublish finding regardless.

[minor] §§8 Background top-up (over-engineering)
  ISSUE: expo-background-task exists solely to help users who go 31–38+ days without opening the app but whose OS still runs the task — a sliver of a sliver (iOS won't run it after force-quit; OEM Androids kill WorkManager, as the design itself notes). Cost: another native module in the dev build, another code path on the M3/M5 device matrix, for users who have effectively churned.
  FIX: Cut it from V1. Foreground rebuild + 31 real days + 7 sentinels already covers everyone who opens the app monthly; V2 server push is the real fix for dark users. Deleting one bullet removes a dependency and a test axis.

[minor] §§3.5 / §6.1 daily_overrides (over-engineering)
  ISSUE: The override table drags a second API call, a sync window, precedence logic, and notification-body skew into V1 for a marketing lever with no committed use — and its headline promise is false anyway: offline devices and already-scheduled notifications will show/announce the permuted word, so 'everyone must see X on launch day' is not guaranteed, only 'online users who foreground that day'. It also lacks a spec detail: the client must replace the whole fetched date window (not merge) or a deleted override lingers forever.
  FIX: Defer the table and all override plumbing to V1.5 (purely additive later: create table, add the second GET, add the `?? perm[dayIndex]` fallback line). If kept in V1, add one spec line: 'client replaces all locally stored overrides in [today−1, today+45] with the response, including deletions', and require override word_ids to reference published words.

[minor] §§7 daysSinceEpoch definition
  ISSUE: daysSinceEpoch(localDate) is load-bearing but unspecified. The obvious-but-wrong implementation, Math.floor(Date.now()/86400000), counts UTC days: a user at UTC−8 at 5 p.m. local is already on the next UTC day, so the word (and the notification body scheduled for that date) flips at 4 p.m. local, not midnight — contradicting the 'user's local calendar date' contract and the DST-immunity claim.
  FIX: Pin it in the spec: daysSinceEpoch('YYYY-MM-DD') = Date.UTC(y, m−1, d) / 86_400_000 — pure integer math on the date string components, never on a live timestamp. Add a fixture asserting the 4 p.m.-UTC−8 case and a DST-transition date.

[minor] §§6.2 Hard-delete convention
  ISSUE: 'Hard deletes are forbidden by convention' is unenforced where it matters: Daniel operates via Supabase Studio as service role, which bypasses RLS, and Table Editor row-delete is one click. One accidental delete becomes a permanent ghost word on every device (invisible to delta sync forever).
  FIX: Enforce it in the schema: a BEFORE DELETE trigger on public.words that raises an exception (drop/disable the trigger in a migration on the rare day a delete is truly intended). Five lines of SQL next to the existing triggers. (Downgrades to belt-and-suspenders if snapshot sync is adopted, but still protects published_at history.)

[minor] §§7 Repeat claims at month boundaries
  ISSUE: 'No repeats within a cycle' is only true inside one month: the perm reshuffles on the 1st, so July 31's word can recur on August 1 (probability ~1/127 every boundary — likely to happen within the first year and noticeable in a product whose whole loop is 'a new word every day'). Longer-term, independent monthly shuffles + a global mod index mean some words repeat across nearby months while others go unseen for long stretches.
  FIX: Cheap deterministic guard: after computing month M's perm, if the word for day 1 equals the word for the last day of month M−1 (computable on any device from the same pure functions), swap perm positions dayIndex(day1) and (dayIndex(day1)+1) mod n. Two lines plus one fixture; leaves everything else untouched.

[minor] §§10 Share capture on Android
  ISSUE: Off-screen capture is the flakiest variant of react-native-view-shot on Android: views not laid out in the window hierarchy throw ('trying to snapshot a view with no size'), Android may collapse the wrapper view unless collapsable={false} is set, and capturing before onLayout/font-load completes yields blank or fallback-font cards on slow devices. The design already marks this verify-at-build but specs the risky architecture (a separate off-screen tree).
  FIX: Capture the share modal's visible preview instead: the modal already renders the exact card; give the preview a fixed aspect wrapper, set collapsable={false}, await onLayout + Font.loadAsync before enabling the buttons, and pass explicit {width:1080, height:1920} to captureRef so output resolution is device-independent. Deletes the off-screen tree entirely and turns the M3 risk into a one-device smoke test.

