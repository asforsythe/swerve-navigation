---
title: "Swerve Mobile App — Native Wrapper, Design Baseline & Mobile UX Roadmap"
tags: ["mobile", "ios", "android", "capacitor", "design-language", "flighty", "mobile-redesign"]
keywords: ["flighty", "bundle-id", "pwa", "capacitor", "native-preview", "device-preview", "bottom-sheet", "telemetry-pill"]
related: ["project-handoff"]
createdAt: "2026-05-03T00:00:00Z"
updatedAt: "2026-05-03T20:05:00Z"
---

# Swerve Mobile App

## Identity
- **App name:** Swerve
- **iOS bundle ID:** `com.swerve.app`
- **Android package:** `com.swerve.app` (mirrors iOS)
- Bundle ID may still be changed up until first App Store submission. Once submitted, it is permanent.

## Native Wrapper — Capacitor 8.3.1
- **PWA → Capacitor** chosen over Cordova / Expo (codebase is React + react-scripts).
- **Config file:** `capacitor.config.ts` at repo root. `appId: com.swerve.app`, `appName: Swerve`, `webDir: build`. iOS-specific: `contentInset: 'always'`, `backgroundColor: '#000000'`, `scheme: Swerve`.
- **Live-reload during dev** is OFF by default in `capacitor.config.ts`. To enable, uncomment the `server` block (points at `http://192.168.1.53:3000`, `cleartext: true`) and run `npx cap copy ios`. **Caveat:** HTTP `server.url` makes the WebView treat the page as an HTTP origin → loses secure-context APIs (`crypto.randomUUID`, geolocation, push, mic, clipboard). Default (no `server.url`) serves bundled `build/` from `capacitor://localhost` which IS a secure context. Trade-off: secure context vs HMR speed.
- **Capacitor 8 uses Swift Package Manager**, not CocoaPods. Plugin manifests are `Package.swift`. CocoaPods (`brew install cocoapods`, v1.16.2) is installed but not used by Capacitor 8.
- **Iteration loop without live-reload:** edit code → `npm run build` → `npx cap copy ios` → re-run in Xcode. Slow but correct.

## Toolchain State (2026-05-03)
- **Xcode** full app installed at `/Applications/Xcode.app`. `xcode-select -p` points there. iOS 26.4 SDK + iOS 26.4 Simulator runtime installed.
- **CocoaPods** 1.16.2 via Homebrew (unused by Capacitor 8 but available).
- **Apple Developer account:** not yet provisioned. Free personal team will sign for Simulator + 7-day device install. Paid account ($99/yr) required for TestFlight + App Store.
- **Android Studio** NOT installed. Android wrapper deferred. When ready: `npm i @capacitor/android && npx cap add android`. Need `JAVA_HOME`, `ANDROID_HOME`.

## Design Baseline — Flighty (iOS flight-tracking app)
**Flighty is the explicit visual + interaction reference.** When making mobile UI decisions, ask "what would Flighty do?" before defaulting to generic mobile patterns.

**Borrow:**
- **Cinematic data presentation** — turn dry data into a story; numbers/status are the hero, chrome is minimal.
- **Confident typography** — large, weighted, expressive type as the primary UI element.
- **Hierarchy through scale, not borders** — drop card outlines; lean on whitespace, type weight, color.
- **Status-as-identity coloring** — Flighty's On Time / Delayed / Cancelled → Swerve's SSI bands Adventure / Safe / Caution / Danger. Every screen should make current SSI feel front-and-center.
- **Polished micro-interactions** — pull-to-refresh, sheet snap-points, haptics, loading shimmers.
- **Narrative push notifications** — human, specific, timely ("Your flight is now boarding") rather than robotic alerts.
- **Information density without clutter** — restraint in color + consistent typography rules.

**Don't copy:** Flighty has no map. Swerve's hero surface IS the live map. Treat Flighty as a typography/feel reference, not a layout template.

---

## ✅ COMPLETED (2026-05-03)

### 1. PWA manifest + icons
- `public/manifest.json` declares 192/512 PNG + maskable variant.
- `public/index.html` — theme-color, apple-mobile-web-app-capable, viewport-fit=cover, user-scalable=no; apple-touch-icon ladder (180/167/152) + favicons (16/32).
- User-supplied logo: `public/swerve-logo.jpg` (1024×1024 neon-S on circuit board).
- Full PNG icon set at `public/icons/` generated via `sips`.
- Source `icon-1024.png` was consumed by `@capacitor/assets` to populate `ios/App/App/Assets.xcassets/AppIcon.appiconset/`.

### 2. Mobile polish — first cut (chrome only)
- `src/index.css` — added `--safe-top/bottom/left/right` CSS variables (`env(safe-area-inset-*)` with 0 fallback), `height: 100dvh` on root, `overscroll-behavior: none`, `touch-action: pan-x pan-y`.
- `src/App.js`, `src/components/MapOverlay.js` — replaced `h-screen` with `100dvh`. App.js now wraps `<MapOverlay />` in `<ErrorBoundary>` (`src/components/ui/ErrorBoundary.js`).
- `src/components/ui/ControlBar.js` — was `flex gap-2` of 11 buttons, ~520px wide. Now `flex flex-wrap justify-end gap-1.5 sm:gap-2 max-w-[calc(100vw_-_12px)]` with `--safe-top/right` insets. (Tailwind arbitrary values use `_` for spaces in calc.)
- `src/components/ui/TelemetryPanel.js` — was `top-6 left-6 w-80`. Now `w-[min(20rem,calc(100vw_-_24px))] sm:w-80` with `--safe-top/left` insets.
- `src/components/ui/RouteEnginePanel.js` — was `bottom-6 right-6 w-80`. Now `w-[min(20rem,calc(100vw_-_24px))] sm:w-80` with `--safe-bottom/right` insets.
- `src/components/MapOverlay.js` (True North button) — moved from `bottom:108px right:12px` to bottom-left with safe-area.
- `src/components/ui/IntelligenceFeed.js` (toggle pill) — was `bottom-24`, now `bottom: safe + 64px`.

### 3. iOS Safari load-crash hardening (from a parallel session — see `CHANGES.md`)
- `useTTS.js` — Piper TTS now fully lazy. `TtsSession.create()` only fires from `unlockAudio()` / first `speak()`, not on mount. Avoids ~60 MB ONNX download blocking first paint.
- `MapOverlay.js` — Mapbox `projection` switches from `globe` to `mercator` on `IS_MOBILE` UA. Avoids WebGL backbuffer overflow with `devicePixelRatio=3` on iOS.
- `StartScreen.js` — reduced animated elements to ease compositor cost.
- `App.js` — root-level `ErrorBoundary` shows branded reload UI on render-time exceptions.

### 4. Secure-context fallback for `crypto.randomUUID`
- `src/utils/uuid.js` — `uuidv4()` with fallback chain: `crypto.randomUUID` → `crypto.getRandomValues` → `Math.random`.
- `useCommunityHazards.js` and `useLiveShare.js` use it. Required for LAN HTTP preview where `crypto.randomUUID` is `undefined`.

### 5. LAN dev preview
- `package.json` script: `start:mobile` = `HOST=0.0.0.0 DANGEROUSLY_DISABLE_HOST_CHECK=true react-scripts start`.
- LAN URL on this machine: `http://192.168.1.53:3000` (changes with network).
- Express API server runs on port 3001 via `npm run server`. **Note:** if `/api/*` returns 404 in dev, the API server is stale or stopped — restart with `npm run server`. A 7-day-old PID once served outdated routes.

### 6. Capacitor iOS scaffold
- Installed: `@capacitor/core@8.3.1`, `@capacitor/cli@8.3.1`, `@capacitor/ios@8.3.1`, `@capacitor/assets` (devDep).
- `npx cap init Swerve com.swerve.app --web-dir=build` → `capacitor.config.ts` written.
- `npx cap add ios` → `ios/` directory generated with `App.xcodeproj`, SPM `Package.swift`, web assets copied to `ios/App/App/public`.
- `npx capacitor-assets generate --ios` populated the AppIcon.appiconset from `assets/icon-only.png`.
- **First successful Simulator run on iPhone 17 Pro / iOS 26.4** — map renders, telemetry shows live weather, RouteEnginePanel functional. Screenshot evidence: 2026-05-03 19:13.

### 7. Console-error triage on first Simulator run
Most errors are iOS Simulator system noise (UIScene deprecation, RTIInputSystemClient, WebPrivacy, RBSServiceErrorDomain, GPU process timing). The real signals:
- ✅ `[Swerve] Map loaded successfully` — app reached main screen.
- 🟡 Mapbox CSS warning — false positive; CSS IS imported in `MapOverlay.js`.
- 🔴 `[error] - {}` empty error — Capacitor's bridge serialized an Error to `{}`. Diagnose via Safari Web Inspector (Develop menu → Simulator → app).
- 🟡 `env.wasm.numThreads = 8 / multi-threading not supported` — Piper TTS wants SharedArrayBuffer (needs COOP/COEP). Capacitor WKWebView doesn't set those headers; falls back to single-threaded WASM. TTS still works, just slower init.
- 🟡 WEBP decode error -50 — single image (probably an OWM radar tile) failed; non-fatal.

---

## 🔴 ACTIVE WORK — Option A: Mobile UX Redesign (Flighty-elevated)

**Design bar (raised by user feedback 2026-05-03 19:50):** "Make it so Flighty looks mediocre next to it." Don't settle for "functional + organized." Push for: world-class typography hierarchy, single-accent color discipline that flows through entire surfaces (status-driven), no card-borders for sub-sections (typography rhythm + whitespace instead), confident hero numerals, real iOS sheet physics (rubber-band, snap points, drag handle that responds to velocity).

### ✅ A1. TelemetryPanel → pill + slide-down sheet — DONE (commit pending)
- Mobile: `<motion.button>` pill at `top: safe + 10px`, full-width minus 12px gutters, ~58px tall. Mini SSI ring (44px) + temp (26pt) + condition + status badge + chevron.
- Tap → `<motion.div>` sheet slides down from top with full body via `renderBody(forceExpanded=true)`, framer-motion spring (damping 32, stiffness 320). Backdrop tap dismisses.
- Desktop (`sm:` and up): unchanged — same 320px top-left glass card.
- Body JSX extracted into `renderBody(forceExpanded)` so desktop respects original isExpanded toggle while mobile sheet always shows full detail.
- File: `src/components/ui/TelemetryPanel.js`. Build verified clean (`npm run build` exit 0, parse OK).

### 🟡 A1+ POLISH (deferred until after A2 to land coherently)
On Simulator (iPhone 17 Pro), A1 works mechanically but doesn't yet match the elevated design bar. Known gaps:
- **Color discipline.** Pill currently mixes SSI ring color + green Optimal badge + theme-tinted condition word. Should pick ONE status color (driven by SSI band: Adventure=amber, Safe=emerald, Caution=amber, Danger=red) and thread it through ring/border-glow/subtitle/badge/chevron at varying opacities. One signal, not three.
- **Hero typography.** SSI number inside the mini ring is ~11pt, unreadable at arm's length. The 100 deserves the same prominence as the temp — both should feel hero-sized. Sheet's center "100 SAFETY INDEX" ring works but could go MUCH larger (~half screen) with the status word ("All Clear" / "Caution" / "🔥 Adventure") below in expressive type instead of a small badge.
- **Drop bordered cards in the sheet.** Road Temp / Traction / Precip / Wind / Visibility currently each live in `bg-white/[0.03] rounded-xl border` containers. Flighty doesn't card-up data. Replace with section dividers (1px line) + typography rhythm + bigger label/value contrast.
- **Sheet drag-down dismissal not wired.** Currently only backdrop-tap dismisses. Add `dragConstraints` + `onDragEnd` velocity check.

### 🔴 A2. RouteEnginePanel → bottom sheet (elevated) — NEXT UP
**Current:** `bottom-6 right-6 w-80` glass card, ~60% of mobile screen height, all 6+ sections always expanded (Header, Inputs, Safe/Adventure toggle, Plan button, Departure Optimizer, Live Conditions, Intelligence Feed link).

**Target — bottom sheet with 3 snap points:**
- **Peek (~88px above safe-area):** drag handle + single-line "Where to?" pill that, when tapped, expands sheet to half. Map fully visible.
- **Half (~50% screen, snap):** drag handle + ROUTE ENGINE header + 2 inputs (Starting Point, Destination) + Safe/Adventure toggle + full-width Plan button. Nothing else. Half-state is the working surface.
- **Full (~90%):** drag handle + everything in Half + Departure Optimizer + Live Conditions + Intelligence Feed link.
- Spring physics: drag handle responds to velocity, snaps to nearest point on release. Use framer-motion `drag="y"` + `dragConstraints` + `onDragEnd` deciding snap target by `info.velocity.y` and current position.

**Visual elevation (this is where the Flighty bar lands):**
- **No card borders on sub-sections** — Departure Optimizer, Live Conditions, Mode toggle each just have a 1px hairline divider above and a 16pt section label. Whitespace separates.
- **Status accent threading:** when a route is planned, the drag handle, the divider lines, and the "Plan Safest Route" button all pick up the SSI color. When idle (no route), neutral white/30.
- **Plan button — confident hero treatment:** full-width, ~52px tall, font-bold 17pt, single accent (rose/red while pre-route, emerald when SSI≥80, amber when 70-80, red when <70). Subtle gradient + drop-shadow glow tied to status color.
- **Inputs — borderless, larger:** drop the bordered `<input>` look. Use a bottom-1px hairline + bigger placeholder (15pt) + travelling shimmer on focus (already implemented). Embed location pin icon at left.
- **Mode toggle — single segmented control** (not two side-by-side buttons). Pill background + sliding indicator (framer-motion `layoutId`).
- **Departure Optimizer / Live Conditions** — collapse-by-default in Full state, tap label to expand. Save vertical space.

**Files:** `src/components/ui/RouteEnginePanel.js`. Likely 70%+ rewrite. Current 570 lines → probably ~700 with the snap-point logic + segmented control.

### 🟡 BUGS to fix during A2 pass (visible in 2026-05-03 19:35 Simulator screenshot)
- **"Unknown" weather description.** TelemetryPill subtitle shows "Unknown" because `getWeatherTheme(0).description` returns "Unknown" for code 0 (clear sky default in Open-Meteo). Fix: in `src/components/weather/WeatherIcon.js` (or wherever `getWeatherTheme` lives), make code 0 → "Clear" and add fallbacks for any unmapped code.
- **Pressure shows "30 hPa".** Real atmospheric pressure is ~1013 hPa. The 30 is an inHg value (30.0 inHg ≈ 1013 hPa) being labeled as hPa. Bug is in either the data source (`useWeatherPolling.js`) returning inHg, or the `PressureGauge` component label. Investigate `current.pressure` source — Open-Meteo returns `surface_pressure` in hPa, so likely a different source overrode it with inHg. Fix the source, not the display.

### A3. ControlBar → vertical strip + overflow sheet (after A2)
- Vertical strip on right edge, 4-5 essential buttons stacked: Voice, Hazard Report, Swerve Score, Live Share, **More** chevron.
- Tap More → bottom-sheet (reusing A2's snap component) with the rest (Mute, Theme, Trip History, Challenges, Weather Layers, Weather Detail, Weather Replay, Notifications).
- Buttons: 44×44 (iOS HIG min tap target), single-accent glow per button.

### A4. Map as hero — composition cleanup (final pass)
- Idle composition on mobile: TelemetryPill (top), RouteSheet at peek (bottom), ControlBar primary strip (right edge). Map fills ~85% of screen.
- Move True North compass + IntelligenceFeed pill INTO the RouteSheet header bar (left of drag handle).
- Files: `src/components/MapOverlay.js` (composition only — remove True North as a separate `<button>`, embed in RouteSheet).

**Acceptance criteria (overall Option A):**
- iPhone 17 Pro Simulator at idle: map ≥ 80% of screen; no two panels visually overlap.
- All sheets dismiss on swipe-down (velocity > threshold) or backdrop tap.
- Status-driven accent color flows through pill + sheet + Plan button cohesively.
- Existing functionality preserved (every action still works).
- Desktop (sm+) layout unchanged.
- Side-by-side with a Flighty screenshot, our typography + density holds up. Self-test: would a designer say "this looks like a 2025 native iOS app" or "this looks like a desktop website ported to a phone"? Must be the first.

**What NOT to do in this pass:**
- Don't rewrite `useRoutePlanning`, `useWeatherPolling`, or any hook. Presentational only.
- Don't change SSI math, routing logic, or hazard data flow.
- Don't redesign secondary panels (HazardReportModal, SwerveScorePanel, etc.) — they're full-screen modals on mobile already.

### Iteration loop on Simulator
After each Ax change:
```
npm run build && npx cap copy ios
```
Then in Xcode: Cmd+R to reload the app. ~10-15s round trip.

---

## 🟡 STILL DEFERRED (after Option A)
- **WeatherDetailPanel** (`WeatherDetailPanel.js:236`) hardcodes `left-[340px]` — won't fit on a 390px iPhone. Make responsive when audited.
- Modals using `vh`-based heights (HazardReportModal, InsuranceReportModal, SwerveScorePanel, ChallengesPanel, SavedRoutesModal, WeatherReplayPanel, SafetyReportPanel) — minor URL-bar shift on iOS Safari, not breaking.
- Storm intercept banner (`MapOverlay.js`) at `top-16 left-1/2` may collide with TelemetryPill on tall headers.
- LiveSharePanel, WeatherLayersPanel — not yet audited for mobile.
- Push notifications on iOS — Web Push API works in iOS 16.4+ Safari but only when added to home screen; in Capacitor we should switch to `@capacitor/push-notifications` plugin (APNs-based) for full reliability.

## 🟡 OPEN QUESTIONS / HOUSEKEEPING
- **Domain ownership** — bundle ID assumes we either own `swerve.app` or accept generic `com.swerve.app`. Revisit before App Store submission.
- **Apple Developer account** — not provisioned. Required for TestFlight and physical-device deployment beyond 7-day free-tier limit.
- **Android scaffold** — single command (`npm i @capacitor/android && npx cap add android`) once Android Studio is installed.
- **iOS asset catalog** — only generated AppIcon at present. Splash screen still default Capacitor white. Generate from `assets/splash.png` (2732×2732, dark variant for dark mode).
- **`ios/` in git** — committed to track. The `.gitignore` Capacitor scaffolds excludes Pods/, build/, DerivedData/. Verify before pushing.

## How to pick this up if a new agent steps in
1. Read this file + `.brv/context-tree/project-handoff/context.md` + `CHANGES.md` + memory files (`MEMORY.md`, `project_swerve_state.md`, `project_swerve_mobile.md`).
2. Run `git log --oneline -10` to see what's been committed.
3. Open `ios/App/App.xcodeproj` in Xcode, pick iPhone 17 Pro simulator, ▶ Run. Should boot to map + overlapping panels. That's the starting state for Option A.
4. Begin with **A1** (TelemetryPill). Smallest scope, biggest visual win, tests the pill+sheet pattern that A2 and A3 will reuse.
5. After each Ax step: `npm run build && npx cap copy ios && Cmd+R in Xcode` to verify on simulator before moving on.
