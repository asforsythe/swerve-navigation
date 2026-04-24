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

## Phase 3 — IN PROGRESS (Deep Research & Retention)

### Decision: Real Backend
Building a real Express backend into `server.js` using **flat JSON file persistence** (no database install needed, works locally). Files stored in `.data/` directory at project root (gitignored).

Backend routes to build:
- `GET /api/hazards` — fetch all community hazard reports
- `POST /api/hazards` — submit new hazard report
- `PUT /api/hazards/:id/vote` — upvote or downvote a report
- `DELETE /api/hazards/:id` — remove a report (owner only, by clientId)
- `GET /api/intelligence-feed` — aggregated feed: NWS alerts + community reports + weather for route
- `POST /api/departure-optimizer` — given start/end coords + departure offsets, return SSI for each time slot

### Tasks Remaining in Phase 3:
1. **`usePredictiveRouting.js`** + UI in `RouteEnginePanel.js`
   - Departure time optimizer slider: now / +30min / +1hr / +2hr / +4hr / +6hr / +12hr / +24hr
   - For each offset: fetch Open-Meteo hourly forecast → recalculate SSI via safetyEngine
   - Render sparkline of SSI vs. departure time
   - Highlight "golden window" where SSI > 85 (green band)
   - User selects time → updates route planning

2. **`IntelligenceFeed.js`** (new bottom collapsible panel)
   - Auto-scrolling ticker: NWS alerts + community hazard reports + road camera statuses
   - Each item: icon, severity badge, distance ahead, timestamp, expandable detail
   - TTS auto-readout when new items arrive (uses existing `speak` from useTTS)
   - Sources: NWS alerts (already in useNwsAlerts hook), community hazards (new backend), Road511

3. **`useCommunityHazards.js`** + Mapbox layer
   - Hook that polls `GET /api/hazards` every 2 minutes
   - Report types: Flooding, Debris, Accident, Ice, Construction
   - Map markers: pulsing diamonds for community reports, user-avatar circles for own reports
   - Upvote/downvote dispatches `PUT /api/hazards/:id/vote`
   - "Hazard Scout" badge triggers via Zustand when user submits first report in an area

---

## Phase 4 — NOT STARTED (Gamification)
- `SwerveScorePanel.js` — scoring ring, levels (Novice→Scout→Ranger→Guardian→Legend), badges
- Streak tracking in Zustand + fire animation on TelemetryPanel
- Challenge Mode scaffold

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
      IntelligenceFeed.js       — [TO BUILD — Phase 3]
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
    usePredictiveRouting.js     — [TO BUILD — Phase 3]
    useCommunityHazards.js      — [TO BUILD — Phase 3]
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
