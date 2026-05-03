---
title: "Swerve Project Handoff — Complete State"
tags: ["handoff", "phase-status", "architecture", "roadmap"]
keywords: ["phase1", "phase2", "phase3", "phase4", "phase5", "backend", "continuation", "state"]
related: ["safety-engine", "bug-fixes", "backend"]
createdAt: "2026-04-24T00:00:00Z"
updatedAt: "2026-04-25T00:00:00Z"
---

# Swerve Project Handoff

## What Is Swerve
A weather-intelligence navigation PWA (mobile-first, desktop-capable) built with React 18 + Mapbox GL JS. Goal: "feels like launching a spaceship, not a GPS app." Virality through shareable safety scores, cinematic UI, gamification, and deep weather research features.

## How To Run
```
Terminal 1: npm start          # React dev server on port 3000
Terminal 2: npm run server     # Express API server on port 3001
```
The React dev proxy (`setupProxy.js`) routes `/api/*` → port 3001.

## Git State (as of 2026-04-25)
- Branch: `main`
- Remote: `https://github.com/asforsythe/swerve-navigation.git`
- Last commit pushed: Phase 2 Shareable Intelligence (f64ab92)
- **UNCOMMITTED CHANGES**: Phase 5 brainstorm batch (see below) — all staged, not yet pushed

---

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, Mapbox GL JS v2.15, TailwindCSS v3, Framer Motion v12 |
| State | Zustand v4 with persist middleware (localStorage, key: `swerve-storage-v5`) |
| Maps | Mapbox GL JS — dark-v11 / light-v11 styles, Directions API, Static Images API |
| Weather | Open-Meteo (free, no key) — current + forecast + archive |
| Radar | OWM precipitation tiles (`REACT_APP_OWM_KEY`) |
| Cameras | Road511 (`REACT_APP_ROAD511_TOKEN`) |
| TTS | @realtimex/piper-tts-web (Amy voice, 1.15x speed) |
| Voice | Web Speech API (webkitSpeechRecognition) |
| Routing | Mapbox Directions API |
| Backend | Express 4 on port 3001, node-canvas via @napi-rs/canvas, web-push for VAPID |
| Build | react-scripts (CRA), custom webpack.config.js |

## API Keys (in .env — never commit)
- `REACT_APP_MAPBOX_TOKEN` — Mapbox GL + Directions + Static Images API
- `REACT_APP_OWM_KEY` — OpenWeatherMap precipitation radar tiles
- `REACT_APP_ROAD511_TOKEN` — Road511 highway cameras
- `REACT_APP_XWEATHER_CLIENT_ID` / `REACT_APP_XWEATHER_CLIENT_SECRET` — XWeather (configured, not yet wired)
- `MAPBOX_STYLE` — default: `mapbox://styles/mapbox/dark-v11`
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — Web Push VAPID keys (generated via scripts/generate-vapid-keys.js)
- `VAPID_EMAIL` — zbradford@bestbigteam.com (VAPID contact email)

**Removed APIs:** Tomorrow.io, TomTom — deleted from all config and services.

---

## Phase 1 — COMPLETE (Visual Foundation)
All files upgraded for cinematic UI:
- `StartScreen.js` — animated SVG shield, rain particles, typewriter, press-and-hold button
- `TelemetryPanel.js` — orbiting particles, SVG sparklines, Threat Radar compass, edge glow
- `ToastContainer.js` — slide+blur+scale entrance, confetti on success, shake on error, progress bar
- `ControlBar.js` — sound-wave rings on voice, bouncing notification badge
- `RouteEnginePanel.js` — shimmer focus states, liquid glass plan button, ripple click
- `MapOverlay.js` — canvas weather particle overlay (rain streaks/snow dots, 200 particle cap, object pooling)
- `tailwind.config.js` + `index.css` — extended with Phase 1 animations

---

## Phase 2 — COMPLETE (Shareable Intelligence)
New files built:
- `src/components/ui/SafetyReportPanel.js` — slides up after every route; SSI ring (framer-motion), hazard stats, Mapbox thumbnail, QR code (qrcode pkg), "Share Card" button → POST /api/share-card
- `src/components/ui/MomentCapturedOverlay.js` — auto-triggers SSI ≥ 95 ("Perfect Run") or ≤ 60 ("Danger Navigated"); share card + copy-text for social posts; auto-dismisses 10s
- `src/components/ui/WeatherReplayPanel.js` — 24hr history from Open-Meteo archive API; time slider; SSI bar chart sparkline; What If? mode (precip/wind sliders → live SSI recalc)
- `src/components/ui/SavedRoutesModal.js` — UPGRADED: Mapbox Static Image thumbnails per route, Replay Journey button, Compare mode (2-route side-by-side SSI bars)
- `server.js` — UPGRADED: POST /api/share-card endpoint; composites Mapbox static map + SSI ring + route stats → returns 1200×630 PNG using @napi-rs/canvas

---

## Phase 3 — COMPLETE (Deep Research & Retention)

### Backend (server.js)
- `GET /api/hazards?lat=&lng=&radius=` — community reports, auto-expires after 4h
- `POST /api/hazards` — submit report (clientId owner tracking, vote dedup)
- `PUT /api/hazards/:id/vote` — upvote/downvote with toggle-off, one-per-client
- `DELETE /api/hazards/:id` — owner-only delete
- `GET /api/intelligence-feed?lat=&lng=&radius=` — community hazards sorted by distance

### Files Built
- `src/hooks/usePredictiveRouting.js` — 8 departure windows (now→+24h), Open-Meteo hourly forecast → SSI per slot, golden window detection (SSI ≥ 85)
- `src/hooks/useCommunityHazards.js` — 2-min polling, pulsing diamond Mapbox markers, reportHazard/voteHazard/deleteHazard, Hazard Scout badge trigger
- `src/components/ui/IntelligenceFeed.js` — collapsible bottom panel, NWS + community hazards, TTS readout for high severity, 90s polling, unread badge
- `src/components/ui/HazardReportModal.js` — 7-type selector (see Phase 5 for new types), slide-up, location-aware, animated submit

---

## Phase 4 — COMPLETE (Gamification & Virality)

### Files Built
- `src/components/ui/SwerveScorePanel.js` — animated level ring (Novice→Legend), 3-day+ streak fire animation, badges grid (12 badge types), weekly points, stats row
- `src/hooks/useLiveShare.js` — manages "Track My Drive" session: POST /api/live-route to create, 15s position updates via PUT, DELETE on stop
- `src/components/ui/LiveSharePanel.js` — slide-up panel with share URL, QR code, copy button, Web Share API, live SSI chip, Stop Sharing button. Pulsing cyan rings when active

### Gamification System
Points formula: `max(1, round(distanceMiles × (ssi/100) × 10))` + 100 for golden departure + 50 for SSI ≥ 90
Level thresholds: Novice (0), Scout (500), Ranger (2000), Guardian (5000), Legend (10000)
12 badge types: first-route, safe-driver, storm-chaser, streak-3, streak-7, golden-window, hazard-scout, centurion, scout-rank, ranger-rank, guardian-rank, legend-rank

---

## Phase 5 — LARGELY COMPLETE (2026-04-25)

### 5A — Adventure Route — COMPLETE
User request: a third routing mode — most exciting/scenic, not fastest or safest. A "thrill ride" for riders.

#### Algorithm (src/utils/safetyEngine.js)
`calculateAdventureScore(route, ssi, fastestRouteDist)`:
- **Sinuosity** (38%): route_km / crow-flies_km. Score 0→1 at sinuosity 1.0→1.8
- **Length premium** (22%): sweet spot 15–40% longer than fastest route
- **SSI thrill factor** (25%): bell curve peaking at SSI≈68. Safety floor: SSI < 40 → `disqualified: true`
- **Turn density** (15%): coordinate nodes per km
- Returns: `{ as (0–100), adventureCategory, sinuosity, disqualified }`
- Adventure categories: Tame (0–14) | Scenic (15–34) | Exciting (35–54) | Thrilling (55–74) | Epic (75–100)

#### Routing service (src/services/routingService.js)
`getAdventureRoutes(start, end)`:
- Fetches `driving-traffic` + `driving` profiles in parallel
- Merges + deduplicates by 200m distance bucket
- Returns up to 6 unique route candidates

#### UI layer — COMPLETE
- `RouteEnginePanel.js` — Safe/Adventure segmented toggle above Plan button. Adventure mode: amber gradient, "🔥 Plan Adventure Route" label, "Finding Your Thrill Ride..." spinner, AS chip below button
- `TelemetryPanel.js` — When `isAdventureMode`: ring/badge swap to amber `#f97316`, AS row shows below SSI ring
- `MapOverlay.js` — `routeMode` state, passes to RouteEnginePanel, passes `{ mode: routeMode }` to `planRoute`

#### Route visual design
- Route line color: `#f97316` (orange-400) — amber pulse instead of cyan safety line
- TTS: "Adventure route locked in. X miles of [thrilling] roads. Safety score Z. Follow the amber pulse — ride the thrill."
- Safety override (all routes SSI<40): falls back to safest, warns user with toast

---

### 5B — Push Notification Re-engagement — COMPLETE

#### Backend (server.js)
- `GET /api/push/vapid-public-key` — serves public VAPID key to frontend
- `POST /api/push/subscribe` — upserts push subscription + routes list
- `DELETE /api/push/unsubscribe` — removes subscription
- `PUSH_SUBS_FILE = .data/push-subscriptions.json`
- Background `checkAndSendAlerts()` runs every 15 min:
  - Storm alert: SSI < 60 on saved route → push (1h cooldown)
  - Golden window: SSI ≥ 85 in next 6h → push (2h cooldown)
- `sendPushToSub()` — auto-removes expired/invalid subscriptions (410/404)

#### Frontend
- `public/service-worker.js` — handles `push` events, `notificationclick`, `install`, `activate`
- `src/hooks/usePushNotifications.js` — `subscribe()`, `unsubscribe()`, re-syncs routes on change. Returns `{ isSubscribed, isSupported, permission, subscribe, unsubscribe }`
- `src/components/ui/PushNotificationPrompt.js` — slide-up opt-in card, 3 example notifications, "Enable Route Alerts" + "Later". 7-day dismiss TTL via localStorage
- `src/index.js` — SW registration runs in both dev AND production (required for push testing)
- `MapOverlay.js` — shows prompt after first route if not subscribed/denied, handles subscribe flow with toasts
- `scripts/generate-vapid-keys.js` — one-time VAPID key generator

---

### 5C — Challenge Mode — COMPLETE

#### Data (src/data/challenges.js)
6 challenges:
```js
{ id: 'safe-month',         name: '30-Day Safe Driver',    icon: '🛡️', target: 30, check: ssi >= 70 }
{ id: 'storm-warrior',      name: 'Storm Warrior',         icon: '⛈️', target: 5,  check: ssi <= 55 }
{ id: 'perfect-week',       name: 'Perfect Week',          icon: '⭐', target: 7,  windowDays: 7, check: ssi >= 85 }
{ id: 'adventure-seeker',   name: 'Adventure Seeker',      icon: '🔥', target: 10, check: isAdventureMode }
{ id: 'hurricane-survivor', name: 'Hurricane Season Pro',  icon: '🌀', activeMonths: [5,6,7,8,9,10], check: ssi <= 60 }
{ id: 'winter-warrior',     name: 'Winter Warrior',        icon: '❄️', activeMonths: [11,0,1], check: ssi <= 50 }
```
- `getActiveChallenges()` — filters seasonal availability by current month
- `isChallengeAvailable(challenge)` — checks activeMonths

#### Store (src/store/useSwerveStore.js)
- Added `challengeProgress: {}` — keyed by challenge id: `{ count, entries: [{ ts, ...criteria }], completedAt? }`
- Added `showChallenges: false`, `showInsuranceReport: false` to `ui`
- `updateChallengeProgress({ ssi, isAdventureMode })` action — windowed filtering for time-window challenges (Perfect Week)
- Bumped persist name to `swerve-storage-v5`, version 5, migration adds `challengeProgress: {}`
- `challengeProgress` added to `partialize`

#### UI (src/components/ui/ChallengesPanel.js)
- Slides in from left, positioned at `left-[340px]` (beside TelemetryPanel)
- `ProgressRing` SVG component, `ChallengeCard` with progress ring + bar + seasonal badge + completion state
- Sections: In Progress / Available / Completed
- Overall progress bar (X / 6 complete)
- Close button → `setUiState({ showChallenges: false })`

#### ControlBar wiring
- Added `onChallenges` prop
- Challenges button: crosshair/target icon, amber accent, shows completed count badge
- `challengeProgress` + `showChallenges` + `completedCount` from store

#### useRoutePlanning.js
- Calls `updateChallengeProgress({ ssi, isAdventureMode })` after every route
- Toast for each `challengeResult.newlyCompleted` challenge

---

### 5D — Insurance / Safe Driver Report — COMPLETE

#### Component (src/components/ui/InsuranceReportModal.js)
- Full-screen modal overlay (z-60)
- Computes 90-day stats from `savedRoutes`: avgSsi, safeCount (≥70), safePct, optimalCount (≥85)
- Average SSI banner (color-coded)
- 3-column stats grid: Total Trips, Safe Trips %, Optimal Trips
- Swerve Score + streak display
- Recent trips list (up to 20, scrollable, color-coded SSI)
- Insurance copy explaining weather-adjusted SSI as telematics alternative
- "Print / Save as PDF" button → `window.print()`

#### Wired in:
- `MapOverlay.js` — `<InsuranceReportModal />` rendered for all post-start states
- `SavedRoutesModal.js` — "Generate Safe Driver Report" button at bottom (shows when routes > 0) → closes Trip History, opens Insurance modal

---

### 5E — Trip History (was "Saved Routes") — COMPLETE
- `SavedRoutesModal.js` — header renamed from "Saved Routes" → "Trip History"
- `ControlBar.js` — button renamed "Trip History", bookmark icon → clock icon

---

### 5F — True North / Recenter Button — COMPLETE
- `MapOverlay.js` — floating compass button, `bottom: 108px, right: 12px` (above Mapbox geolocate control)
- Compass SVG: red north needle + white south needle + center dot
- On click: `mapRef.current.flyTo({ center: userLocationRef.current, bearing: 0, pitch: 60, zoom: 15.5, duration: 1500 })`

---

### 5G — Expanded Road Hazard Types — COMPLETE
**New types added:** Pothole (`🕳️` violet `#a78bfa`), Animal (`🦌` emerald `#34d399`), Debris emoji changed from `🪨` → `🍂`

Files updated:
- `server.js` — `VALID_HAZARD_TYPES` now includes `'Pothole'` and `'Animal'`
- `src/hooks/useCommunityHazards.js` — HAZARD_COLORS + HAZARD_ICONS updated for all 7 types
- `src/components/ui/HazardReportModal.js` — 7-type grid (`grid-cols-4`)

---

### Phase 5 Remaining
1. **Search Along Route** — deferred (complex). POI search using Mapbox Places API along route geometry corridor. Would need to: buffer route geometry, query Mapbox Geocoding with proximity, render POI chips in RouteEnginePanel.
2. **App Store Submission** — PWA → Capacitor for native wrapper, screenshots, App Store Connect

---

## Phase 6 — Hardening Pass (2026-05-02)

Major stability, accuracy, and resilience pass across core systems.

### Safety Engine (src/utils/safetyEngine.js)
- Continuous traction curves (replaces discrete thresholds): deep freeze → near freezing → cold wet → hydroplane
- Snow/ice weather codes now apply traction multipliers independently of temp
- New `tractionRisk` factor integrated into all hazard risk calculations
- Wider visibility penalty tiers (0.25km, 0.5km, 1km, 2km, 5km)
- Higher wind gust tier at 55+ mph
- `worstPoint` now tracked by combined risk (not just max precip)
- SSI category thresholds recalibrated: Critical ≤25, Severe ≤45, Caution ≤65, Fair ≤80
- New `calculateWeatherVariance()` function for route weather unpredictability scoring
- New `"Reduced Traction"` hazard type for cold non-precip conditions
- Elevation variance bonus (8%) added to adventure score composite
- `assessPointSafety()` now integrates traction-based risk

### Routing Service (src/services/routingService.js)
- Coordinate validation with descriptive errors
- Retry logic with exponential backoff (2 retries, 500ms/1500ms)
- Request annotations now include `duration,distance,speed` alongside congestion/closure
- Steps always requested for turn-by-turn data
- Route normalization: filters empty geometries, flattens legs→steps
- Adventure route dedup improved: buckets by both distance AND duration
- New `getMultiStopRoute()` for future waypoint support
- `MAPBOX_TOKEN` extracted to module-level constant (no per-call env lookup)

### Weather Service (src/services/weatherService.js)
- Geometry validation before sampling
- `AbortSignal.timeout(15000)` on all fetches
- Coordinate precision capped to 4 decimals (URL length control)
- Sample point validation (NaN protection)
- Destination dedup (skip if <100m from last sample)
- Result padding: if API returns fewer results than points, extends with nearest
- All numeric values parsed via `parseFloat`/`parseInt` (no truthy coercion bugs)
- `getWeatherCodeDescription()` now returns `{ description, severity, iconCode }` with wind/flood context
- New `getCurrentWeather()` single-point fetch for non-route contexts

### Turn-by-Turn (src/hooks/useTurnByTurn.js)
- Off-route hysteresis: requires 3 consecutive reads >80m before declaring off-route (was single read >100m)
- Snap-back threshold: re-accepts at 50m without false-positive re-announce
- TTS rate gating: 3s minimum between spoken announcements, 30s repeat gate
- Distance formatting: 500ft threshold (was 1000ft), 100s rounding for mid-range
- Step extraction now handles both `routeData.legs` and pre-flattened `routeData.steps`
- Step advance: uses direct index set + fresh announcement instead of loop
- Geolocation: `maximumAge` reduced to 2s (was 3s), timeout increased to 15s (was 10s)
- Auto-advance threshold tightened to 20m (was 25m)
- Segment index clamping prevents array overruns

### Storm Cell Tracker (src/hooks/useStormCellTracker.js)
- Refactored to eliminate stale closure bugs: `syncGeoJSON` → `announceIntercepts` → `buildCellWithIntercept` → `computeCells` dependency chain
- Shared `buildCellWithIntercept()` helper eliminates code duplication between real/simulated paths
- Simulated cells visually distinguished (amber `#fbbf24` vs red `#f43f5e`)
- `isSimulated` flag on all cells; TTS only fires for real intercepts
- GeoJSON layer colors now data-driven by `simulated` property

### Weather Polling (src/hooks/useWeatherPolling.js)
- Rate limiter: no fetch if last fetch <30s ago
- Hourly forecast now filters to future hours only
- Added `surface_pressure` to hourly params for proper pressure trend
- Pressure trend calculated from hourly array (not current vs missing field)

### Predictive Routing (src/hooks/usePredictiveRouting.js)
- All hourly fields use `??` for null safety
- Precip output changed from mm to inches (matching rest of UI)
- Added `precipMm`, `windGust`, `visibility` to result objects
- `AbortSignal.timeout(15000)` on forecast fetch

### TelemetryPanel (src/components/ui/TelemetryPanel.js)
- Precip display: shows "None" when 0, otherwise `X.XX in/hr`
- Visibility: properly converts km→miles (was displaying km as "mi")
- Road Surface segment analysis: uses `< 0.001` threshold instead of `=== 0`

### RouteEnginePanel (src/components/ui/RouteEnginePanel.js)
- Departure Optimizer detail: fixed unit label from `mm` to `"` (inches) to match usePredictiveRouting output

### Server (server.js)
- COOP/COEP headers moved before `express.static` (fixes WASM cross-origin isolation)
- Explicit `/service-worker.js` route from `public/` (fixes SW MIME type error in dev)

---

## Current Uncommitted File State (2026-05-02)

### Modified files (M)
- `.brv/context-tree/_manifest.json`
- `.brv/context-tree/project-handoff/context.md`
- `server.js` — COOP/COEP header order fix, service-worker route, Phase 3-5 endpoints
- `src/components/MapOverlay.js` — Phase 5 fully wired (challenges, insurance, true north, push prompt)
- `src/components/ui/ControlBar.js` — Trip History rename + Challenges button
- `src/components/ui/HazardReportModal.js` — 7 hazard types (Pothole, Animal added)
- `src/components/ui/RouteEnginePanel.js` — fixed Departure Optimizer precip unit
- `src/components/ui/SavedRoutesModal.js` — Trip History rename + Insurance Report CTA
- `src/components/ui/TelemetryPanel.js` — fixed visibility km→mi, precip zero-state, road surface threshold
- `src/hooks/useCommunityHazards.js` — 7 hazard types
- `src/hooks/usePredictiveRouting.js` — null-safe fields, inches output
- `src/hooks/useRoutePlanning.js` — challenge progress + adventure routing
- `src/hooks/useStormCellTracker.js` — lifecycle fix, simulated cell visual distinction
- `src/hooks/useTurnByTurn.js` — off-route hysteresis, TTS rate gating
- `src/hooks/useWeatherPolling.js` — rate limiting, future-only hours, pressure trend
- `src/services/routingService.js` ��� retry logic, validation, multi-stop, annotations
- `src/services/weatherService.js` �� timeouts, validation, getCurrentWeather, rich code descriptions
- `src/store/useSwerveStore.js` — v5, challenge system, insurance modal flag
- `src/utils/safetyEngine.js` — traction curves, weather variance, recalibrated thresholds

### New files (??)
- `src/components/ui/ChallengesPanel.js` — Phase 5 challenge tracker
- `src/components/ui/InsuranceReportModal.js` — Phase 5 safe driver PDF
- `src/data/challenges.js` — 6 challenge definitions

---

## Key File Map
```
src/
  App.js                              — root, renders MapOverlay full-screen
  components/
    MapOverlay.js                     — central orchestrator (map init, all hooks, all panels)
    ui/
      StartScreen.js                  — cinematic intro (Phase 1)
      ControlBar.js                   — top-right buttons (voice, theme, trip history, weather, replay, notifications, challenges)
      TelemetryPanel.js               — top-left SSI dashboard + Adventure mode AS display
      RouteEnginePanel.js             — bottom-right route inputs + travel modes + Safe/Adventure toggle
      ToastContainer.js               — top-center notifications (Phase 1)
      SavedRoutesModal.js             — "Trip History" modal with thumbnails, compare, insurance CTA
      SafetyReportPanel.js            — post-route report panel (Phase 2)
      WeatherReplayPanel.js           — 24hr weather scrubber (Phase 2)
      MomentCapturedOverlay.js        — viral share overlay (Phase 2)
      WeatherLayersPanel.js           — weather layer toggles
      WeatherDetailPanel.js           — current weather + 7-day forecast
      LoadingOverlay.js               — routing spinner
      IntelligenceFeed.js             — collapsible bottom feed (Phase 3)
      HazardReportModal.js            — 7-type hazard selector (Phase 3 + Phase 5G)
      SwerveScorePanel.js             — gamification dashboard (Phase 4)
      LiveSharePanel.js               — live share with QR (Phase 4)
      PushNotificationPrompt.js       — push opt-in card (Phase 5B)
      ChallengesPanel.js              — 6-challenge tracker, slides left (Phase 5C)
      InsuranceReportModal.js         — safe driver PDF report (Phase 5D)
  hooks/
    useRoutePlanning.js               — route calc, safety analysis, adventure mode, challenge updates
    useWeatherPolling.js              — 5-min Open-Meteo polling
    useRadar.js                       — 10-min OWM radar tile refresh
    useMapLayers.js                   — traffic vector, 3D buildings, sky, radar raster
    useRouteScanner.js                — cyan dot traverses route geometry
    useTTS.js                         — Piper TTS session + queue
    useVoiceCommand.js                — Web Speech recognition
    useWindLayer.js / useCloudLayer.js / useLightningLayer.js
    useNwsAlerts.js                   — NWS severe weather alerts layer
    useNexradLayer.js / useStormCellTracker.js
    usePredictiveRouting.js           — 8-slot departure optimizer (Phase 3)
    useCommunityHazards.js            — 2-min polling, Mapbox markers, badge trigger (Phase 3)
    useLiveShare.js                   — live drive tracking (Phase 4)
    usePushNotifications.js           — VAPID push subscription (Phase 5B)
  store/
    useSwerveStore.js                 — Zustand v5: all state + actions
  data/
    challenges.js                     — 6 challenge definitions + helpers (Phase 5C)
  utils/
    safetyEngine.js                   — SSI calculation + calculateAdventureScore (Phase 5A)
  services/
    weatherService.js                 — getSafetyWeatherForRoute (turf sampling, Open-Meteo)
    routingService.js                 — Mapbox Directions wrapper + getAdventureRoutes (Phase 5A)
    traffic.service.js                — fetchCameras (Road511 via proxy)
  scripts/ (project root)
    generate-vapid-keys.js            — one-time VAPID key generator

public/
  service-worker.js                   — push notifications (Phase 5B)

server.js                             — Express on port 3001; all API endpoints
.env                                  — API keys (gitignored)
.env.example                          — placeholder values (committed)
```

---

## Design System Quick Reference
```
Surface:    #0a0a0e         (glass panel bg)
Border:     white/8         (glass borders)
Text:       white/90        (primary)
Muted:      white/40        (secondary)

SSI Colors:
  Optimal  ≥85: #34d399 (emerald-400)
  Fair    70-84: #3b82f6 (blue-400)
  Caution 55-69: #fbbf24 (amber-400)
  Severe  30-54: #f97316 (orange-400)
  Critical  <30: #ef4444 (red-500)

Accent colors:
  Primary:      #f43f5e  rose-500    (actions, alerts)
  Safe route:   #22d3ee  cyan-400    (scanner, safe routes)
  Adventure:    #f97316  orange-400  (adventure mode route line, AS display)
  Research:     #a78bfa  violet-400  (Phase 3 panels)
  Gamify:       #fcd34d  amber-300   (scores, streaks, challenges)

Animation timing:
  Fast feedback: 150ms
  Standard:      300ms cubic-bezier(0.16, 1, 0.3, 1)
  Dramatic:      600ms
  Ambient loops: 3s–8s

Z-index hierarchy:
  0-10:   Mapbox canvas
  11-20:  Weather particle canvas
  21-30:  Route lines, radar, 3D buildings
  31-40:  Map markers, scanner
  41-50:  Glass panels (Telemetry, RouteEngine)
  51-60:  Modals (StartScreen, SavedRoutes, Reports)
  60-70:  Full-screen modals (InsuranceReport z-60)
  61-70:  Toasts, loading overlays
  71-80:  Full-screen effects, MomentCapture
```

---

## Backend Architecture (.data/ flat file persistence)
```
.data/
  hazards.json              — community hazard reports (7 types, 4h TTL)
  live-routes.json          — active live share sessions (4h TTL)
  push-subscriptions.json   — VAPID push subscriptions + routes list
  feed.json                 — cached intelligence feed items (optional)
```

---

## Zustand Store Shape (v5 — post Phase 5)
```js
{
  map, weather, traffic, route, polling,
  theme, mapTheme, isMuted,
  routeTelemetry: {
    ssi, traction, roadTemp, fastestSsi, duration, distance, modeEtas, lastUpdated,
    adventureScore,       // Phase 5A: 0–100 AS score
    adventureCategory,    // Phase 5A: 'Tame'|'Scenic'|'Exciting'|'Thrilling'|'Epic'
    isAdventureMode,      // Phase 5A: bool
  },
  savedRoutes: [{ id, start, dest, ssi, centerLng, centerLat, savedAt, adventureScore?, isAdventureMode? }],
  moments: [...],
  lastRouteReport: { from, to, ssi, ..., adventureScore, adventureCategory, isAdventureMode },
  weatherHistory: [...],
  notifications, toasts, voiceCommand, notificationPermission,
  radar: { frames, currentFrameIndex, isPlaying, lastFetch },
  weatherLayers: { precip, wind, clouds, lightning, nws, nexrad, stormTracker },
  liveShare: { sessionId, shareUrl, isActive, ssi, startedAt },
  swerveScore: {
    total, level (0–4), currentStreak, longestStreak, lastRouteDate,
    weeklyPoints, weekStart, totalRoutes, safeRoutes, goldenDepartures,
    badges: string[],
  },
  challengeProgress: {
    [challengeId]: { count, entries: [{ ts, ssi?, isAdventureMode? }], completedAt? }
  },
  communityHazards: [...],
  ui: {
    showTelemetry, showRouteEngine, activePanel,
    showWeatherLayers, showWeatherDetail,
    showSafetyReport,       // SafetyReportPanel
    showWeatherReplay,      // WeatherReplayPanel
    showMomentCapture,      // MomentCapturedOverlay
    showSwerveScore,        // Phase 4
    showLiveShare,          // Phase 4
    showHazardReport,       // Phase 3
    showChallenges,         // Phase 5C
    showInsuranceReport,    // Phase 5D
  }
}
```

Persist key: `swerve-storage-v5` (version 5). Migration chain: v3→v4→v5.
Persisted: theme, mapTheme, isMuted, savedRoutes, notificationPermission, moments, swerveScore, liveShare, communityHazards, challengeProgress.
