# Research Brief: Widgets in Expo (V2) + Flutter-vs-Expo Sanity Check
*Researched 2026-07-03. All claims cited.*

---

## A) Home / Lock Screen Widgets ("Word of the Day") in an Expo App

### A1. iOS (WidgetKit) — the landscape changed in our favor in May 2026

**There is now official, first-party Expo widget support: `expo-widgets`.** It shipped as alpha in SDK 55, and was **promoted to stable in Expo SDK 56 (released May 21, 2026)**. Per the SDK 56 changelog: *"After introducing an alpha version of Expo Widgets for iOS in SDK 55, we gathered feedback and made many fixes and improvements, and the library is now stable."* In SDK 56, widgets and Live Activities "have full access to the environment and no longer need to be pre-rendered." SDK 57 (current) is a small release focused on React Native 0.86 with no widget regressions noted. ([SDK 56 changelog](https://expo.dev/changelog/sdk-56), [SDK 55 changelog](https://expo.dev/changelog/sdk-55), [SDK 57 changelog](https://expo.dev/changelog/sdk-57), [stability announcement blog](https://expo.dev/blog/ios-widgets-and-live-activities-in-expo))

Key facts from the [official `expo-widgets` docs](https://docs.expo.dev/versions/latest/sdk/widgets/):
- Widgets are written **as React components using Expo UI (SwiftUI-backed) — no Swift required**. Components carry a `'widget'` directive; APIs are `createWidget()`, `createLiveActivity()`, `updateTimeline()`, `updateSnapshot()`.
- **Lock Screen widgets are supported**: `supportedFamilies` in app.json accepts `accessoryCircular`, `accessoryRectangular`, `accessoryInline` (plus home-screen families). This directly covers the prototype's "Lock Screen widget" item.
- Data sharing via **App Groups**: config takes a `groupIdentifier`, defaulting to `group.<bundle identifier>`.
- **Timeline model**: `updateTimeline()` accepts an array of `{date, props}` entries; iOS renders the right entry at the right time with the app closed. The widget extension **cannot fetch its own data** — the app must run to extend the timeline.
- Requires a **development build** (not Expo Go); works with CNG/config plugins, i.e., normal **EAS Build** flow. Docs are written against SDK 57; some props are iOS 16+, one (`levelOfDetail`) is iOS 26+.

**Alternatives (still relevant):**
- **`@bacons/expo-apple-targets` (Evan Bacon)** — config plugin generating real Xcode targets (widgets, App Clips, share extensions) where you write **native SwiftUI**. Mature, powers production apps (Pillar Valley); **EAS Build handles the extension code-signing/entitlements**. This is the escape hatch if we ever need native `TimelineProvider` behavior expo-widgets can't do — e.g., a widget that *self-refreshes* by computing/fetching entries in the extension process. ([repo](https://github.com/EvanBacon/expo-apple-targets), [Expo docs: iOS app extensions](https://docs.expo.dev/build-reference/app-extensions/), [Expo blog: How to implement iOS widgets in Expo apps](https://expo.dev/blog/how-to-implement-ios-widgets-in-expo-apps))
- **`@bittingz/expo-widgets`** — community module (iOS + Android), 1 maintainer, last release **July 7, 2025**. Effectively superseded on iOS by official `expo-widgets`; not recommended for new work. ([npm](https://www.npmjs.com/package/@bittingz/expo-widgets))

**Recommendation:** official `expo-widgets` for iOS; keep `expo-apple-targets` in the back pocket.

### A2. Android — no official Expo solution yet; one clear community winner

The SDK 56/57 changelogs contain **no Android widget support**, and `expo-widgets` is explicitly `platforms: ['ios']`. The de-facto standard is **`react-native-android-widget`** (sAleksovski): **v0.20.3, released May 2, 2026 — actively maintained** (43 releases, ~900 stars). ([repo](https://github.com/sAleksovski/react-native-android-widget), [docs](https://saleksovski.github.io/react-native-android-widget/))
- You write widget UI in **JSX primitives that render to RemoteViews** (not Glance — but declarative from the JS side, no Kotlin needed for typical widgets).
- Ships an **Expo config plugin** (`app.plugin.ts`) — works with CNG/EAS Build.
- Updates run through a **headless-JS `widgetTaskHandler`** that receives `WIDGET_UPDATE` events; scheduled via `android:updatePeriodMillis` (**system minimum: one update per 30 minutes** — irrelevant for a daily word) or on demand via `requestWidgetUpdate()`. ([Update Widget docs](https://saleksovski.github.io/react-native-android-widget/docs/update-widget), [requestWidgetUpdate API](https://saleksovski.github.io/react-native-android-widget/docs/api/request-widget-update))

### A3. Data flow & "can it rotate daily without the app opening?"

- **iOS:** App ↔ widget via **App Groups + shared UserDefaults** (expo-widgets abstracts this behind `groupIdentifier`). Daily rotation: since our daily word is a **deterministic client-side rotation over a locally cached word list**, the app can call `updateTimeline()` with **weeks or months of pre-computed entries** in one shot — the widget then flips at midnight every day with the app closed. **Caveat:** the timeline is finite; if the user never opens the app, it eventually goes stale. Mitigations: (a) schedule 60–90 days of entries per app launch (trivial with 127 bundled words), (b) our daily local notification drives regular opens anyway, (c) last-resort: rebuild the widget with expo-apple-targets so the extension computes entries natively.
- **Android:** shared storage (SharedPreferences / files) between app and widget, but better: the **headless `widgetTaskHandler` runs JS in the background without the app being opened**, so the widget can literally compute "today's word" itself on every `WIDGET_UPDATE`. Android is the *easier* platform for staying fresh indefinitely.

### A4. Honest effort estimate (small team)

**Neither a week nor a month: budget ~2–3 calendar weeks for both platforms**, shippable behind that estimate because our widget is static text (no images, lists, or interactivity):
- iOS via `expo-widgets`: 3–5 dev days (widget UI in 2–3 sizes + lock-screen family, App Group config, timeline generator, dev-build/EAS config).
- Android via `react-native-android-widget`: 3–5 dev days (JSX widget in 1–2 sizes, task handler, config plugin).
- Cross-cutting: 3–5 days for QA across devices/OS versions, timezone/midnight-boundary testing, design polish per level palette, App Store/Play review quirks.

**Risks:** (1) `expo-widgets` is only ~6 weeks stable (May 2026) — expect minor API churn between SDK releases; pin the SDK. (2) iOS timeline-exhaustion edge case above. (3) Two entirely different codepaths for iOS vs Android widgets — no shared widget UI code. (4) Both require dev builds (we already need those for notifications/RevenueCat, so no new cost). (5) Widget typography is constrained — the book-serif look must be approximated within SwiftUI/RemoteViews font capabilities; custom fonts in widgets need extra font-registration setup on both platforms.

---

## B) Flutter vs Expo sanity check

There is **no capability in this app where Flutter is materially better, and one where it's now materially worse**. Point by point: typography-first UI and custom fonts are commodity in both (Expo: `expo-font`; Flutter's Skia/Impeller text rendering is excellent but buys nothing a static dictionary app needs); share-card image export is solved in both (RN: `react-native-view-shot`/`@shopify/react-native-skia` + `expo-sharing`; Flutter: `RepaintBoundary`); daily local notifications are first-class in both (`expo-notifications` daily triggers vs `flutter_local_notifications`); Supabase ships official first-class SDKs for both (`supabase-js` + React Native docs vs `supabase_flutter`); RevenueCat has **dedicated Expo installation docs and a CNG-compatible config plugin** for `react-native-purchases` ([RevenueCat Expo docs](https://www.revenuecat.com/docs/getting-started/installation/expo), [Expo IAP guide](https://docs.expo.dev/guides/in-app-purchases/)). On widgets — the one V2 feature where platform choice matters — **Expo is now ahead**: official `expo-widgets` (stable, SDK 56) lets us write iOS widgets as React components, while Flutter's `home_widget` package only bridges data and **still requires hand-writing the widget UI natively in SwiftUI (iOS) and Kotlin/Glance or XML (Android)** ([home_widget on pub.dev](https://pub.dev/packages/home_widget), [Google's Flutter home-screen-widget codelab](https://codelabs.developers.google.com/flutter-home-screen-widgets)). The brief's "built with Flutter" line is safely treated as a leftover contradiction — its own tech-stack section says Expo, the team leans Expo, and **Expo (SDK 56/57, React Native 0.86) is a safe, arguably optimal call for this app in 2026**.

**Sources:** [Expo Widgets docs](https://docs.expo.dev/versions/latest/sdk/widgets/) · [Expo SDK 56 changelog](https://expo.dev/changelog/sdk-56) · [Expo SDK 55 changelog](https://expo.dev/changelog/sdk-55) · [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57) · [Expo blog: iOS widgets & Live Activities stable](https://expo.dev/blog/ios-widgets-and-live-activities-in-expo) · [Expo blog: How to implement iOS widgets](https://expo.dev/blog/how-to-implement-ios-widgets-in-expo-apps) · [expo-apple-targets](https://github.com/EvanBacon/expo-apple-targets) · [Expo iOS app extensions / EAS](https://docs.expo.dev/build-reference/app-extensions/) · [react-native-android-widget](https://github.com/sAleksovski/react-native-android-widget) · [Update Widget docs](https://saleksovski.github.io/react-native-android-widget/docs/update-widget) · [requestWidgetUpdate](https://saleksovski.github.io/react-native-android-widget/docs/api/request-widget-update) · [@bittingz/expo-widgets](https://www.npmjs.com/package/@bittingz/expo-widgets) · [home_widget (Flutter)](https://pub.dev/packages/home_widget) · [Flutter home-screen widgets codelab](https://codelabs.developers.google.com/flutter-home-screen-widgets) · [RevenueCat Expo docs](https://www.revenuecat.com/docs/getting-started/installation/expo) · [Expo in-app purchases guide](https://docs.expo.dev/guides/in-app-purchases/)