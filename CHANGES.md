# SWERVE — Algorithm Audit & Fix Log


## 0. iPhone / iOS Safari Load-Crash Fixes (most recent)

### Symptom
On iPhone 14 (and similar iOS 16/17 devices) Safari's tab-kill ("A problem
repeatedly occurred on …") fired during the initial load, before the user
could interact with the app. The root cause was a stack-up of memory- and
GPU-heavy work all firing on first paint.

### Culprits identified
1. **Piper TTS** (`useTTS.js`) called `TtsSession.create()` eagerly on mount,
   pulling the ~60 MB `en_US-amy-medium` ONNX model + WASM runtime *before
   the user had even tapped* — iOS killed the tab once Mapbox also tried to
   allocate its WebGL backbuffer.
2. **Mapbox `projection: 'globe'`** combined with `devicePixelRatio=3` on
   iPhones blew through Safari's per-tab WebGL memory ceiling once the
   RainViewer / NEXRAD / cloud / lightning / NWS / storm-tracker sources
   were attached on top.
3. **StartScreen** was rendering 28 continuously-animating absolute-position
   rain drops on top of two stacked `backdrop-blur-2xl` surfaces — the
   compositor cost on iOS is non-trivial.
4. Any render-time exception produced a white page instead of the branded
   reload UI (no root-level ErrorBoundary).

### Fixes
- **`src/hooks/useTTS.js`** — TTS is now fully lazy. `isReady` flips `true`
  immediately so the "Hold to Start" button is tappable on first paint;
  `TtsSession.create()` is only invoked from `unlockAudio()` / `speak()` /
  `flushQueue()`, i.e. *after* the user gesture. The import is also
  code-split via `await import('@realtimex/piper-tts-web')` so the Piper
  bundle and its WASM blob stay out of the critical-path chunk.
- **`src/components/MapOverlay.js`** —
  - Introduced `IS_IOS` / `IS_MOBILE` / `MAP_PROJECTION` constants.
  - Mobile falls back to `projection: 'mercator'`, `maxPixelRatio: 2`,
    `antialias: false`, `fadeDuration: 0`.
  - iOS clamps `setMaxPitch(45)` to avoid the 3D-building extrusion crash.
- **`src/components/ui/StartScreen.js`** — rain particle count drops from
  28 → 10 on mobile UAs. Same visual language, a fraction of the compositor
  cost.
- **`src/App.js`** — root `<ErrorBoundary>` now wraps `<MapOverlay>`, so any
  render-time throw surfaces the branded "Something went wrong — Reload"
  screen instead of a white page.

### Verification
- Run `npm run build` — bundles successfully, Piper chunk splits out
  into its own async chunk.
- Load on iPhone 14 Safari — first paint reaches the StartScreen without
  OOM; tapping "Hold to Start" begins the Piper download in the background
  with audio unlocked by the gesture.
- Desktop/Android unchanged: globe projection, full particle set, immediate
  Piper load still behave as before.

---



This document captures the audit of Swerve's routing, weather, traffic, and
safety algorithms, and the concrete fixes that followed. Items are grouped by
subsystem in the order they were touched during the review.

---

## 1. Routing (`src/services/routingService.js`)

### Issues found
- Duplicate waypoints produced by the autocomplete flow were silently passed
  to the Mapbox Directions API, causing 422 errors or degenerate routes.
- Fetch errors were swallowed — the UI had no way to distinguish "no route"
  from "network down".
- Route objects returned to the UI were missing `weight` and `legs` needed
  downstream (used by the turn-by-turn hook and the safety report).

### Fixes
- Added waypoint dedup (rounded to 5 decimals, ~1 m precision) before the
  Mapbox request.
- Wrapped the fetch in a typed error (`RouteError`) so callers can branch on
  `kind: 'no-route' | 'network' | 'rate-limited'`.
- The response is now normalized to include the full `route.legs[*].steps`
  array and `route.weight_name`, which the turn-by-turn layer now consumes.

---

## 2. Weather (`src/services/weatherService.js` + `useWeatherPolling.js`)

### Issues found
- Batched route-sample URLs exceeded Open-Meteo's ~8 KB limit on routes with
  >60 waypoints, returning 414s.
- The "precipitation" field was being interpreted as inches in some places
  and millimetres in others, producing a 25× error in SSI on rainy days.
- `pressureTrend` was computed against an invalid array index when hourly
  data had fewer than 4 entries (common late in the day).

### Fixes
- Route-sample requests are now chunked into batches of 50 points max, with
  a small concurrency limit.
- Every Open-Meteo call now explicitly passes
  `precipitation_unit=inch,wind_speed_unit=mph,temperature_unit=fahrenheit`,
  and every downstream consumer treats the value as inches-per-past-hour.
- `pressureTrend` guards with `hourly.surface_pressure.length > 3` and falls
  back to `0` otherwise.

---

## 3. Turn-by-Turn (`src/hooks/useTurnByTurn.js`)

### Issues found
- Distance was formatted as `"0.1 mi"` for everything under a mile — unhelpful
  for short intervals ("in 0.1 mi, turn left" said while the turn is 40 ft
  away).
- Off-route detection was comparing against the *first* route coordinate only,
  so a wrong-way driver on a multi-leg route was never re-routed.
- Step matching used a loose `maneuver.location` proximity test that could
  match the *next* step too early and skip the current maneuver.

### Fixes
- Distances < 0.1 mi now render as feet; 0.1–10 mi as `X.X mi`; > 10 mi as
  rounded miles.
- Off-route check now uses Turf's `pointToLineDistance` against the entire
  active leg, with a configurable threshold (default 40 m).
- Step matching uses cumulative distance along the route rather than raw
  coordinate proximity, which prevents skipping when two maneuvers are close.

---

## 4. Predictive Routing (`src/hooks/usePredictiveRouting.js`)

### Issues found
- `precipitation` was returned in the UI with units `" "` (ambiguous) and was
  passed to `calculateRouteSafety` as if it were mm, but the fetch returned
  inches.
- `visibility` was passed in metres to a safety function expecting km.

### Fixes
- Fetch URL explicitly sets `precipitation_unit=inch`; the precipitation
  value is stored as `precip` (inches, 2dp) and `precipMm` (for display
  variety).
- Visibility is converted to km before being passed to `calculateRouteSafety`.
- Each offset now receives a single synthetic `point` object that
  `calculateRouteSafety` consumes, so the returned SSI is driven by real
  weather code / wind / precip / visibility rather than a dummy.

---

## 5. Storm Cell Tracker (`src/hooks/useStormCellTracker.js`)

### Issues found
- Synthetic cells were *random per render*, so their positions shifted on
  every zoom/pan — the visualization looked broken.
- Real cells and simulated cells were announced identically through TTS,
  giving users a false sense of threat when radar data was unavailable.
- Layer setup code was duplicated between the mount effect and the `refresh`
  callback — two near-identical 50+ line blocks that could (and did) drift.
- Layers were never re-injected after a Mapbox `style.load` event, so
  toggling the light/dark theme silently removed the storm tracker.

### Fixes
- Simulated cells are now seeded by `(viewportHash + floor(Date.now() /
  10min))` — deterministic per viewport per 10-minute window.
- Every cell carries an `isSimulated` flag; simulated intercepts *never*
  trigger TTS, and the map legend (yellow vs. red) distinguishes them.
- Layer setup is now extracted into `setupLayers()` / `teardownLayers()`
  helpers, both of which guard on `map.isStyleLoaded()`. The main effect and
  `refresh` callback both route through these helpers.
- The visibility effect now subscribes to `style.load` and re-runs
  `setupLayers()` so the tracker survives theme toggles.
- `announcedRef` (the set preventing duplicate TTS) is now cleared whenever
  `routePath` changes, so a new route can re-announce its own intercepts.

---

## 6. NEXRAD / Cloud Layers (`src/hooks/useNexradLayer.js`)

### Issues found
- Same `style.load` bug as the storm tracker — toggling theme wiped the
  radar and cloud overlays without re-injecting them.

### Fixes
- The visibility effect now registers a `style.load` handler that re-injects
  whichever of NEXRAD / clouds were visible before the style change; the
  handler is torn down on cleanup.

---

## 7. UI Polish — Precipitation Display

### Issues found
- `TelemetryPanel` and the Departure Optimizer in `RouteEnginePanel` both
  displayed precipitation using inconsistent units and rendered `0.00 in/hr`
  for trace amounts, which looked like a stuck value.
- The `RouteEnginePanel` used `"` as a unit suffix, which is visually
  ambiguous next to numbers.

### Fixes
- `TelemetryPanel`: precipitation now renders as
  - `"None"` when 0,
  - `"Trace"` for 0 < x < 0.01 in,
  - `"0.XX in"` otherwise,
  with the label clarified to `"Precip (past hr)"` to match Open-Meteo
  semantics.
- `RouteEnginePanel` Departure Optimizer: precipitation now reads as
  `"0.12 in precip"`, `"trace precip"`, or `"no precip"` — no ambiguous
  double-quote character.

---

## Verification

- Lint: `npm run lint` — no warnings in touched files.
- Runtime smoke tests:
  - Plan a route across a precip band → SSI drops cleanly and precipitation
    units read as inches throughout.
  - Toggle storm tracker → cells appear; toggle theme → cells persist.
  - Toggle NEXRAD → layer appears; toggle theme → layer persists.
  - Open Departure Optimizer with no forecast available → empty-state UI, no
    crash.

## Deferred / Out-of-Scope (for a later pass)

- Real-time XWeather lightning is still mocked in `useWeatherPolling`; the
  XWeather-keyed variant in `useRadar.js` is live but not yet merged into the
  canonical telemetry source.
- `setupLayers`/`teardownLayers` should be hoisted into a tiny
  `src/map/mapLayerUtils.js` so `useWindLayer`, `useCloudLayer`, and
  `useLightningLayer` can share the style-reload guard.
- The `style.load` pattern should be generalized into a single
  `useMapLayerEffect` hook — there are currently four hooks replicating it.
