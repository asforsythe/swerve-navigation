---
title: "Swerve Project Handoff — Complete State"
tags: ["handoff", "phase-status", "architecture", "roadmap"]
keywords: ["phase1", "phase2", "phase3", "backend", "continuation", "state"]
related: ["safety-engine", "bug-fixes", "backend"]
createdAt: "2026-04-24T00:00:00Z"
updatedAt: "2026-04-24T00:00:00Z"
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

## Git State (as of 2026-04-24)
- Branch: `main`
- Remote: `https://github.com/asforsythe/swerve-navigation.git`
- Latest commit: Phase 2 complete — see git log

---

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, Mapbox GL JS v2.15, TailwindCSS v3, Framer Motion v12 |
| State | Zustand v4 with persist middleware (localStorage, key: `swerve-storage-v3`) |
| Maps | Mapbox GL JS — dark-v11 / light-v11 styles, Directions API, Static Images API |
| Weather | Open-Meteo (free, no key) — current + forecast + archive |
| Radar | OWM precipitation tiles (`REACT_APP_OWM_KEY`) |
| Cameras | Road511 (`REACT_APP_ROAD511_TOKEN`) |
| TTS | @realtimex/piper-tts-web (Amy voice, 1.15x speed) |
| Voice | Web Speech API (webkitSpeechRecognition) |
| Routing | Mapbox Directions API |
| Backend | Express 4 on port 3001, node-canvas via @napi-rs/canvas |
| Build | react-scripts (CRA), custom webpack.config.js |

## API Keys (in .env — never commit)
- `REACT_APP_MAPBOX_TOKEN` — Mapbox GL + Directions + Static Images API
- `REACT_APP_OWM_KEY` — OpenWeatherMap precipitation radar tiles
- `REACT_APP_ROAD511_TOKEN` — Road511 highway cameras
- `REACT_APP_XWEATHER_CLIENT_ID` / `REACT_APP_XWEATHER_CLIENT_SECRET` — XWeather (configured, not yet wired)
- `MAPBOX_STYLE` — default: `mapbox://styles/mapbox/dark-v11`

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
- `src/components/ui/SavedRoutesModal.js` — UPGRADED: Mapbox Static Image thumbnails per route, Replay Journey button (flies map to route center), Compare mode (2-route side-by-side SSI bars)
- `server.js` — UPGRADED: POST /api/share-card endpoint; composites Mapbox static map + SSI ring + route stats → returns 1200×630 PNG using @napi-rs/canvas

Modified for Phase 2:
- `src/store/useSwerveStore.js` — added: moments[], lastRouteReport, weatherHistory[]; extended ui state with showSafetyReport, showWeatherReplay, showMomentCapture; new actions: setLastRouteReport, captureRouteMoment, setWeatherHistory, deleteMoment; moments added to persist partialize
- `src/hooks/useRoutePlanning.js` — after planRoute: stores lastRouteReport, triggers showSafetyReport, fires captureRouteMoment on extreme SSI, passes centerLng/centerLat to saveRoute
- `src/components/ui/ControlBar.js` — added Weather Replay button (clock icon, violet accent)
- `src/components/MapOverlay.js` — imports and renders SafetyReportPanel, WeatherReplayPanel, MomentCapturedOverlay; wires onWeatherReplay to ControlBar; passes onReplayRoute to SavedRoutesModal
- `src/setupProxy.js` — now proxies /api → localhost:3001 via http-proxy-middleware

---

## Phase 3 — COMPLETE (Deep Research & Retention)

### Backend (server.js — fully built)
Flat JSON file persistence in `.data/` (gitignored). All routes live:
- `GET /api/hazards?lat=&lng=&radius=` — community reports, auto-expires after 4h
- `POST /api/hazards` — submit report (clientId owner tracking, vote dedup)
- `PUT /api/hazards/:id/vote` — upvote/downvote with toggle-off, one-per-client
- `DELETE /api/hazards/:id` — owner-only delete
- `GET /api/intelligence-feed?lat=&lng=&radius=` — community hazards sorted by distance

### Files Built
- `src/hooks/usePredictiveRouting.js` — 8 departure windows (now→+24h), Open-Meteo hourly forecast → SSI per slot, golden window detection (SSI ≥ 85)
- `src/hooks/useCommunityHazards.js` — 2-min polling, pulsing diamond Mapbox markers, reportHazard/voteHazard/deleteHazard, Hazard Scout badge trigger
- `src/components/ui/IntelligenceFeed.js` — collapsible bottom panel, NWS + community hazards, TTS readout for high severity, 90s polling, unread badge
- `src/components/ui/HazardReportModal.js` — 5-type selector (Flooding/Debris/Accident/Ice/Construction), slide-up, location-aware, animated submit

### Wired in MapOverlay.js (2026-04-24)
- `usePredictiveRouting()` → passed as `predictive` prop to RouteEnginePanel with `centerLat/centerLng` from `lastRouteReport`
- `useCommunityHazards({ mapRef, mapLoaded })` → markers auto-render; `userLoc` synced via reactive state on geolocate
- `<IntelligenceFeed speak={speak} userLoc={userLoc} />` rendered after start screen
- `<HazardReportModal reportHazard={hazards.reportHazard} userLoc={userLoc} />` triggered by ControlBar ⚠ button
- Fixed coordinates bug in IntelligenceFeed (`[lng, lat]` Mapbox convention)
- Removed `window.__SWERVE_STORE__` hack in RouteEnginePanel; uses `predictive.centerLat/Lng`

---

## Phase 4 — COMPLETE (Gamification & Virality)

### Files Built
- `src/components/ui/SwerveScorePanel.js` — animated level ring (Novice→Legend), 3-day+ streak fire animation, badges grid (12 badge types), weekly points, stats row. Triggered by trophy button in ControlBar.
- `src/hooks/useLiveShare.js` — manages "Track My Drive" session: POST /api/live-route to create, 15s position updates via PUT, DELETE on stop. Persists clientId in localStorage.
- `src/components/ui/LiveSharePanel.js` — slide-up panel with share URL, QR code, copy button, Web Share API, live SSI chip, Stop Sharing button. Pulsing cyan rings when active.

### Files Modified for Phase 4
- `src/store/useSwerveStore.js` — UPGRADED: extended `swerveScore` (level 0–4, currentStreak, longestStreak, lastRouteDate, weeklyPoints, weekStart, totalRoutes, safeRoutes, goldenDepartures); added `liveShare` state; new actions `awardRoutePoints` (full points/streak/badge logic), `setLiveShare`, `clearLiveShare`; added `ui.showSwerveScore`, `ui.showLiveShare`; bumped persist version to v4 with migration.
- `src/hooks/useRoutePlanning.js` — calls `awardRoutePoints({ssi, distance})` after every route; shows "+X pts" toast and badge unlock toasts.
- `server.js` — added: `POST /api/live-route`, `PUT /api/live-route/:id`, `GET /api/live-route/:id`, `DELETE /api/live-route/:id` (flat-file .data/live-routes.json, 4h TTL); added `format=stories` (1080×1920) to `POST /api/share-card`.
- `src/components/ui/ControlBar.js` — added Trophy button (score panel) with level-color accent dot; Share button (live share) with pulsing cyan rings when active.
- `src/components/MapOverlay.js` — imports `useLiveShare`, `SwerveScorePanel`, `LiveSharePanel`; wires `onSwerveScore`/`onLiveShare` to ControlBar; renders Phase 4 panels.

### Gamification System
Points formula: `max(1, round(distanceMiles × (ssi/100) × 10))` + 100 for golden departure + 50 for SSI ≥ 90
Level thresholds: Novice (0), Scout (500), Ranger (2000), Guardian (5000), Legend (10000)
12 badge types: first-route, safe-driver, storm-chaser, streak-3, streak-7, golden-window, hazard-scout, centurion, scout-rank, ranger-rank, guardian-rank, legend-rank

---

## Phase 5 — IN PROGRESS (Adventure Route + Polish)

### Adventure Route — PARTIALLY COMPLETE (2026-04-24)
User request: a third routing mode — not fastest or safest, but most exciting/scenic. A "thrill ride" for riders who want adventurous roads over optimal ones.

#### ✅ DONE — Core algorithm + routing
- `src/utils/safetyEngine.js` — `calculateAdventureScore(route, ssi, fastestRouteDist)` added
  - **Sinuosity** (38%): route_km / crow-flies_km. Straight road = 1.0, mountain switchbacks = 2.0+. Score 0→1 at sinuosity 1.0→1.8.
  - **Length premium** (22%): sweet spot 15–40% longer than fastest route.
  - **SSI thrill factor** (25%): bell curve peaking at SSI≈68. Not too safe (boring), not too dangerous (reckless). Safety floor: SSI < 40 → `disqualified: true`.
  - **Turn density** (15%): coordinate nodes per km (more turns = more engaging geometry).
  - Returns: `{ as (0–100), adventureCategory ('Tame'|'Scenic'|'Exciting'|'Thrilling'|'Epic'), sinuosity, disqualified }`
- `src/services/routingService.js` — `getAdventureRoutes(start, end)` added
  - Fetches `driving-traffic` + `driving` profiles in parallel
  - Merges + deduplicates by 200m distance bucket (avoids scoring same road twice)
  - Returns up to 6 unique route candidates
- `src/store/useSwerveStore.js` — `routeTelemetry` extended with `adventureScore`, `adventureCategory`, `isAdventureMode`
- `src/hooks/useRoutePlanning.js` — fully updated:
  - `drawRoutes(routes, { primaryRoute, primaryColor })` — now accepts adventure override; primary defaults to safest
  - `planRoute(start, dest, startLabel, destLabel, { mode: 'safe'|'adventure' })` — new `mode` option
  - Adventure mode: calls `getAdventureRoutes`, scores each route, selects highest AS with SSI≥40 floor, draws with `primaryColor: '#f97316'` (amber-orange), different TTS ("Follow the amber pulse — ride the thrill")
  - Safety override when ALL routes SSI<40: falls back to safest, warns user
  - `setRouteTelemetry({ adventureScore, adventureCategory, isAdventureMode })` merged after draw
  - `lastRouteReport` extended with `adventureScore`, `adventureCategory`, `isAdventureMode`

#### ❌ NOT YET DONE — UI layer (interrupted)
The following still needs to be implemented for the adventure feature to be usable:

**`src/components/ui/RouteEnginePanel.js`** — needs:
- Accept `routeMode` (string) + `setRouteMode` (fn) props
- Add a **Safe / Adventure segmented toggle** above the Plan button
  - Safe: shield icon, `text-white`, current rose-500 button style
  - Adventure: flame icon `🔥`, amber-orange button `linear-gradient(135deg, rgba(217,119,6,0.95), rgba(249,115,22,0.9))`, label "Plan Adventure Route"
- Show adventure score result below the Plan button after routing (when `routeTelemetry.adventureScore` is set):
  - Small AS chip: `🔥 AS 72 — Thrilling` in amber styling
- Change `isRouting` spinner text: "Finding your thrill ride..." in adventure mode

**`src/components/MapOverlay.js`** — needs:
- `const [routeMode, setRouteMode] = useState('safe');`
- Pass `routeMode` and `setRouteMode` to `<RouteEnginePanel />`
- Change `handleManualRoute` to pass `{ mode: routeMode }` to `planRoute`:
  ```js
  await planRoute(startCoords, destCoords, startAddress, destAddress, { mode: routeMode });
  ```

**`src/components/ui/TelemetryPanel.js`** — needs:
- Read `routeTelemetry.isAdventureMode`, `routeTelemetry.adventureScore`, `routeTelemetry.adventureCategory`
- When `isAdventureMode`:
  - Replace "Caution/Optimal" badge in header with `🔥 Adventure` badge (amber styling)
  - Add AS row below SSI ring: `AS 72 — Thrilling` in amber text
  - Optional: amber glow on ring border instead of SSI color

#### Adventure Route Visual Design
- Route line color: `#f97316` (orange-400) — amber pulse instead of cyan safety line
- TTS: "Adventure route locked in. X miles of [thrilling] roads with sinuosity factor Y. Safety score Z. Follow the amber pulse — ride the thrill."
- Safety override TTS: "Safety override: conditions are critical. Routing you safely with SSI N."
- Adventure categories: Tame (0–14) | Scenic (15–34) | Exciting (35–54) | Thrilling (55–74) | Epic (75–100)

---

## Phase 5 Remaining — After Adventure Route UI is complete
1. **Push Notification Re-engagement** — "Golden window opens in 45 min", "Storm approaching your saved route", "Your hazard report was upvoted"
2. **Challenge Mode** — "30-Day Safe Driver", seasonal challenges (Hurricane Season Survivor), achievement cards
3. **Insurance Integration Hook** — "Export your SSI history" PDF, telematics landing page
4. **App Store Submission** — PWA → Capacitor for native wrapper, screenshots, App Store Connect

---

## Key File Map
```
src/
  App.js                        — root, renders MapOverlay full-screen
  components/
    MapOverlay.js               — central orchestrator (map init, all hooks, all panels)
    ui/
      StartScreen.js            — cinematic intro (Phase 1 complete)
      ControlBar.js             — top-right buttons (voice, mute, theme, routes, weather, replay, notifications)
      TelemetryPanel.js         — top-left SSI dashboard (Phase 1 complete)
      RouteEnginePanel.js       — bottom-right route inputs + travel modes + ETAs
      ToastContainer.js         — top-center notifications (Phase 1 complete)
      SavedRoutesModal.js       — saved routes with thumbnails + compare (Phase 2 complete)
      SafetyReportPanel.js      — post-route report panel (Phase 2 complete)
      WeatherReplayPanel.js     — 24hr weather scrubber (Phase 2 complete)
      MomentCapturedOverlay.js  — viral share overlay (Phase 2 complete)
      WeatherLayersPanel.js     — weather layer toggles
      WeatherDetailPanel.js     — current weather + 7-day forecast
      LoadingOverlay.js         — routing spinner
      IntelligenceFeed.js       — collapsible bottom feed: NWS + community hazards (Phase 3 complete)
      HazardReportModal.js      — slide-up hazard type selector (Phase 3 complete)
  hooks/
    useRoutePlanning.js         — route calc, safety analysis, moment capture trigger
    useWeatherPolling.js        — 5-min Open-Meteo polling
    useRadar.js                 — 10-min OWM radar tile refresh
    useMapLayers.js             — traffic vector, 3D buildings, sky, radar raster
    useRouteScanner.js          — cyan dot traverses route geometry
    useTTS.js                   — Piper TTS session + queue
    useVoiceCommand.js          — Web Speech recognition
    useWindLayer.js / useCloudLayer.js / useLightningLayer.js
    useNwsAlerts.js             — NWS severe weather alerts layer
    useNexradLayer.js / useStormCellTracker.js
    usePredictiveRouting.js     — 8-slot departure optimizer, Open-Meteo forecast → SSI (Phase 3 complete)
    useCommunityHazards.js      — 2-min polling, Mapbox markers, badge trigger (Phase 3 complete)
  store/
    useSwerveStore.js           — Zustand: all state + actions (see Phase 2 additions above)
  utils/
    safetyEngine.js             — SSI calculation (calculateRouteSafety, assessPointSafety)
  services/
    weatherService.js           — getSafetyWeatherForRoute (turf sampling, Open-Meteo)
    routingService.js           — Mapbox Directions wrapper (getRoutes, getRouteDuration)
    traffic.service.js          — fetchCameras (Road511 via proxy)
  config/
    api.config.js               — centralized API config (mapbox, xweather, vizzion, road511)
    env.js                      — env var exports
    paths.js                    — API path constants

server.js                       — Express on port 3001; /api/share-card endpoint
.env                            — API keys (gitignored)
.env.example                    — placeholder values (committed)
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
  Primary:    #f43f5e  rose-500    (actions, alerts)
  Safe route: #22d3ee  cyan-400    (scanner, safe routes)
  Research:   #a78bfa  violet-400  (Phase 3 panels)
  Gamify:     #fcd34d  amber-300   (scores, streaks)

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
  61-70:  Toasts, loading overlays
  71-80:  Full-screen effects, MomentCapture
```

---

## Backend Architecture (.data/ flat file persistence)
```
.data/
  hazards.json    — array of community hazard reports
  feed.json       — cached intelligence feed items (optional)
```

Hazard report schema:
```json
{
  "id": "uuid",
  "type": "Flooding|Debris|Accident|Ice|Construction",
  "lat": 28.5383,
  "lng": -81.3792,
  "description": "optional user text",
  "clientId": "browser-generated uuid stored in localStorage",
  "upvotes": 3,
  "downvotes": 0,
  "createdAt": "ISO8601",
  "expiresAt": "ISO8601"  // auto-expire after 4 hours
}
```

---

## Zustand Store Shape (current — post Phase 2)
```js
{
  map, weather, traffic, route, polling,
  theme, mapTheme, isMuted,
  routeTelemetry: { ssi, traction, roadTemp, fastestSsi, duration, distance, modeEtas, lastUpdated },
  savedRoutes: [{ id, start, dest, ssi, centerLng, centerLat, savedAt }],
  moments: [{ id, type, from, to, ssi, category, hazardType, traction, distance, duration, centerLng, centerLat, capturedAt }],
  lastRouteReport: { from, to, ssi, category, hazardType, traction, distance, duration, centerLng, centerLat, isNight, timestamp },
  weatherHistory: [{ time, temp, precip, windSpeed, windGust, weatherCode, visibility, relativeHumidity }],  // 24 entries, newest first
  notifications, toasts, voiceCommand, notificationPermission,
  radar: { frames, currentFrameIndex, isPlaying, lastFetch },
  weatherLayers: { precip, wind, clouds, lightning, nws, nexrad, stormTracker },
  ui: {
    showTelemetry, showRouteEngine, activePanel,
    showWeatherLayers, showWeatherDetail,
    showSafetyReport,    // SafetyReportPanel
    showWeatherReplay,   // WeatherReplayPanel
    showMomentCapture,   // MomentCapturedOverlay
  }
}
```

Persist version: v3 (key: `swerve-storage-v3`). Persisted: theme, mapTheme, isMuted, savedRoutes, notificationPermission, moments.
