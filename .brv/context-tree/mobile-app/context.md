---
title: "Swerve Mobile App — Native Wrapper, Design Baseline & Mobile UX Roadmap"
tags: ["mobile", "ios", "android", "capacitor", "design-language", "flighty", "mobile-redesign"]
keywords: ["flighty", "bundle-id", "pwa", "capacitor", "native-preview", "device-preview", "bottom-sheet", "telemetry-pill"]
related: ["project-handoff"]
createdAt: "2026-05-03T00:00:00Z"
updatedAt: "2026-05-03T19:30:00Z"
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

## 🔴 ACTIVE WORK — Option A: Mobile UX Redesign (Flighty-style)

**Why:** First Simulator run revealed both `TelemetryPanel` (top-left, 320px) and `RouteEnginePanel` (bottom-right, ~60% of screen height) compete for vertical space and overlap on a 6.1" iPhone. Both panels were designed for a wide desktop canvas. Conservative shrink/safe-area pass got them visible but they still overlap.

**Roadmap (the four big moves):**

### A1. TelemetryPanel → compact pill, expandable
**Current:** `w-[min(20rem,calc(100vw_-_24px))]` glass card at top-left, 280-320px tall, always expanded.
**Target:** ~64-72px tall pill at top showing only: SSI ring + temperature + weather icon + condition word. Tap → slide-down sheet revealing the current full TelemetryPanel content. Sheet dismisses on swipe-down or tap outside.
**Files:** `src/components/ui/TelemetryPanel.js` (split into `TelemetryPill` + `TelemetrySheet`).
**Flighty parallel:** Flighty's compact flight pill at the top of the home screen.

### A2. RouteEnginePanel → bottom sheet with snap points
**Current:** `bottom-6 right-6 w-80` glass card, fully expanded by default, contains 6+ sections.
**Target:** Bottom sheet docked to the bottom edge, full-width on mobile. Three snap points:
- **Peek (~88px)** — single line: "Where to?" (focuses destination input on tap)
- **Half (~48vh)** — destination input expanded + Plan button + mode toggle (Safe/Adventure)
- **Full (~88vh)** — all current panel content (Departure Optimizer, Live Conditions, Intelligence Feed link)
Drag handle at top of sheet, snaps with framer-motion spring physics.
**Files:** `src/components/ui/RouteEnginePanel.js` (will rename / split into `RouteSheet` orchestrator + `RouteSheetCompact` / `RouteSheetExpanded`).
**Flighty parallel:** Flighty's bottom sheet for flight details (peek with summary, drag for full).

### A3. ControlBar → vertical strip with overflow sheet
**Current:** 11 horizontal buttons that wrap at top-right.
**Target:** Vertical strip on right edge, 4-5 essential buttons stacked: Voice, Hazard Report, Swerve Score, Live Share, **More**. Tap More → bottom sheet with the rest (Mute, Theme, Trip History, Challenges, Weather Layers, Weather Detail, Weather Replay, Notifications).
**Files:** `src/components/ui/ControlBar.js` (split into `ControlBarPrimary` vertical strip + `ControlOverflowSheet`).

### A4. Map as hero, remove blocking chrome at idle
**Current:** Top-left telemetry + bottom-right route engine + right-edge controls + bottom-left True North + bottom-center IntelligenceFeed pill all visible simultaneously, ~60% screen blocked.
**Target:** At idle, only the TelemetryPill (top), the RouteSheet at peek height, and the ControlBar primary strip (right edge). True North compass and Intelligence Feed pill move into the RouteSheet header bar. Map fills 80%+ of the screen.
**Files:** `src/components/MapOverlay.js` (re-orchestrate composition; remove True North as a separate floating button, embed in RouteSheet).

**Acceptance criteria:**
- App on iPhone 17 Pro Simulator: at idle, the map is the dominant surface; no two panels visually overlap; "Where to?" pill is reachable for thumb input; SSI is glanceable.
- Telemetry sheet, RouteSheet, and ControlOverflowSheet all dismiss on swipe-down or backdrop tap.
- Existing functionality preserved — every action that worked before still works after redesign.
- Desktop layout (`sm:` breakpoint and up) still looks like the original — redesign is mobile-only.

**What NOT to do in this pass:**
- Don't rewrite `useRoutePlanning`, `useWeatherPolling`, or any hook. The redesign is presentational.
- Don't change SSI math, routing logic, or hazard data flow.
- Don't redesign secondary panels (HazardReportModal, SwerveScorePanel, etc.) — they appear as full-screen modals on mobile already; they'll get their own pass later.

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
