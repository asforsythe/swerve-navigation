# SWERVE — Complete Project Context for Claude Opus
> **Purpose:** Re-engineer a "perfect prompt" for Swerve development by giving Claude Opus exhaustive context of the entire codebase, architecture, design language, and roadmap.

---

## 1. PROJECT IDENTITY

**Swerve** is a mobile-first, real-time navigation application with **weather-aware routing**. It is NOT a utilitarian GPS — it is a **sci-fi HUD / weather intelligence superweapon** that people screen-record and share.

**Core value proposition:**
- Calculates the **safest route**, not just the fastest
- Live **Swerve Safety Index (SSI)** — a 0-100 score based on precipitation, temperature, wind, visibility, WMO weather codes, and time-of-day
- **Voice AI co-pilot** using on-device Piper TTS (Amy voice, 1.15x speed)
- **Spatial weather intelligence** with storm cell tracking, lightning detection, and route intercept warnings
- **Viral / gamification DNA** — shareable moments, Swerve Score leaderboard, route streaks, cinematic HUD UI

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Framework | React 18 (create-react-app base, custom webpack) |
| Map Rendering | Mapbox GL JS v2.15 (WebGL vector tiles, globe projection, 3D pitch) |
| Map Alternative | MapLibre GL JS v5.23 (progressive fallback) |
| State | Zustand v4.5.7 with `persist` middleware (localStorage) |
| Styling | TailwindCSS v3.4.1 + custom `@layer` utilities |
| TTS Engine | `@realtimex/piper-tts-web` (on-device, no API key) |
| Voice Commands | Web Speech API (`webkitSpeechRecognition`) |
| Routing | Mapbox Directions API (with `alternatives=true`) |
| Weather Primary | Open-Meteo (free, no key, batch endpoint for route sampling) |
| Weather Secondary | XWeather API (conditions, road weather, summary — client_id/client_secret auth) |
| Radar Tiles | RainViewer precipitation tiles |
| Backend | Express.js static server (`server.js`) with COOP/COEP headers for WASM threading |
| Build Output | `build/` directory, served by Express |
| Dev Bundler | Custom `webpack.config.js` + react-scripts 5.0.1 |
| Geospatial | Turf.js v7 (`@turf/length`, `@turf/along`, `@turf/turf`) |

**No Redux, no Chart.js, no Framer Motion.** All animations are CSS/Tailwind keyframes or raw SVG/canvas. Bundle size discipline.

---

## 3. PROJECT FILE TREE

```
swerve/
├── public/
│   └── index.html
├── build/                          # Production output (static)
│
├── src/
│   ├── App.js                      # Entry: full-screen black div + MapOverlay
│   ├── index.css                   # Tailwind + glass-panel, text-gradient, marker-pulse utilities
│   ├── serviceWorker.js
│   ├── setupProxy.js
│   │
│   ├── components/
│   │   ├── MapOverlay.js           # CENTRAL ORCHESTRATOR: map init, all hooks, layout, particle canvas
│   │   ├── weather/
│   │   │   └── WeatherIcon.js      # SVG icons for WMO codes + getWeatherTheme helper
│   │   └── ui/
│   │       ├── StartScreen.js      # Cinematic intro: rain particles, animated shield SVG, press-and-hold button, typewriter subtitle
│   │       ├── ControlBar.js       # Top-right: voice (concentric rings when listening), mute, theme, saved routes, notifications (bouncing badge), weather layers/detail toggles
│   │       ├── TelemetryPanel.js   # Top-left: SSI ring (SVG, concentric orbiting particles, edge glow), sparkline charts (pure SVG), wind compass rose, visibility bar, UV badge, pressure gauge, hourly temp chart, dewpoint, lightning badge, segment analysis, expand-on-click
│   │       ├── RouteEnginePanel.js # Bottom-right: address inputs (Mapbox geocoding autocomplete with 3D tilt hover), liquid-glass "Plan Safest Route" button (ripple, shimmer), travel mode ETA toggles (drive/bike/walk)
│   │       ├── WeatherLayersPanel.js
│   │       ├── WeatherDetailPanel.js
│   │       ├── SavedRoutesModal.js # Center modal: list routes with SSI badges, share to clipboard, delete. Escape-to-close.
│   │       ├── ToastContainer.js   # Top-center: theatrical entrance (blur + scale), confetti burst on success, screen shake on error, progress drain bar
│   │       └── LoadingOverlay.js
│   │
│   ├── hooks/
│   │   ├── useTTS.js               # Piper TTS session init, speech queue, audio unlock, flushQueue
│   │   ├── useVoiceCommand.js      # Web Speech recognition toggle, command handler
│   │   ├── useWeatherPolling.js    # 5-min Open-Meteo polling: current + hourly + daily + simulated XWeather lightning
│   │   ├── useRadar.js             # XWeather conditions fetch (NOT radar tiles — XWeather has no tiles)
│   │   ├── useRoutePlanning.js     # Multi-route fetch, weather sampling per route, safety calc, drawRoutes with glow/animation, save best routes
│   │   ├── useRouteScanner.js      # Cyan dot traverses route geometry (12s loop)
│   │   ├── useMapLayers.js         # Base layers (mostly empty — atmosphere removed due to MapLibre)
│   │   ├── useWindLayer.js         # Wind overlay layer on map
│   │   ├── useCloudLayer.js        # Cloud overlay layer on map
│   │   ├── useLightningLayer.js    # Lightning strike markers on map
│   │   ├── useNwsAlerts.js         # NWS polygon alerts on map
│   │   ├── useNexradLayer.js       # NEXRAD radar raster tiles on map
│   │   ├── useStormCellTracker.js  # THE VIRAL FEATURE: detect storm cells from RainViewer frames, track velocity, project paths, check route intersection, warn via TTS/toast
│   │   ├── useDebounce.js
│   │   └── useNexradLayer.js
│   │
│   ├── services/
│   │   ├── routingService.js       # Mapbox Directions wrapper: getRoutes(alternatives), getRouteDuration(lightweight ETA)
│   │   └── weatherService.js       # getSafetyWeatherForRoute: Turf sampling along geometry → Open-Meteo batch fetch → WMO code descriptions
│   │
│   ├── store/
│   │   └── useSwerveStore.js       # Zustand central store (see §4)
│   │
│   ├── utils/
│   │   └── safetyEngine.js         # calculateRouteSafety: SSI algorithm. Factors: precip, temp, wind gust, visibility, humidity, WMO codes, night multiplier. Returns: ssi, category, color, hazardType, ttsMessage, traction, worstPoint, isNight
│   │
│   ├── config/
│   │   ├── api.config.js             # Centralized API config (Mapbox, Tomorrow.io, XWeather, Vizzion, Road511, TomTom)
│   │   ├── env.js
│   │   ├── paths.js
│   │   ├── routes.js
│   │   └── index.js
│   │
│   ├── controllers/
│   │   └── user.controller.js
│   ├── middlewares/
│   │   └── hello.middleware.js
│   ├── models/
│   │   └── user.model.js
│   └── routes/
│       └── user.routes.js
│
├── server.js                       # Express static server with COOP/COEP headers
├── tailwind.config.js              # Custom animations: fade-in-up, slide-in-right, shimmer, pulse-glow, orbit, toast-enter, toast-shake, progress-drain, svg-draw, confetti-fall, edge-pulse + neon shadows
├── webpack.config.js
├── package.json
├── .env / .env.example
├── README.md
├── HANDOFF_PROMPT.md             # VIRAL UPGRADE ROADMAP (essential read)
└── API_ARCHITECTURE.md
```

---

## 4. ZUSTAND STATE SHAPE

```js
{
  // Map
  map: { loaded, bounds, cameraMarkers, weatherOverlays },

  // Weather
  weather: {
    current: {
      temp, roadTemp, feelsLike, precipitationIntensity,
      windSpeed, windDirection, windGusts,
      humidity, cloudCover, weatherCode,
      visibility, pressure, pressureTrend,
      uvIndex, dewPoint, isDay
    },
    hourly: [...],      // 24h forecast objects
    daily: [...],       // 7-day forecast objects
    xweather: { lightningStrikesNearby, lightningDistance, severeRiskLevel, stormBearing, xweatherTimestamp, place, tz, summary, road },
    severeAlerts: [],
    lastUpdated,
    isLoading,
    error
  },

  // Traffic
  traffic: { cameras, selectedCamera, isLoading, error },

  // Route
  route: { path, waypoints, isOptimized, weatherImpact },

  // Polling
  polling: { weatherInterval, cameraInterval, isActive, weatherLastPoll, cameraLastPoll },

  // Theme & Audio
  theme: 'dark',               // or 'light'
  mapTheme: 'mapbox://styles/mapbox/dark-v11',
  isMuted: false,

  // Telemetry
  routeTelemetry: {
    ssi, traction, roadTemp,
    fastestSsi, duration, distance,
    modeEtas: { driving, cycling, walking },
    lastUpdated
  },

  // Saved routes
  savedRoutes: [{ id, start, dest, ssi, savedAt }],

  // Notifications / Toasts
  notifications: [],
  toasts: [{ id, message, type, duration }],

  // Voice
  voiceCommand: { isListening, lastTranscript },
  notificationPermission: 'default',

  // Radar animation
  radar: { frames, currentFrameIndex, isPlaying, lastFetch },

  // Weather layer toggles
  weatherLayers: {
    precip, wind, clouds, lightning, nws, nexrad, stormTracker
  },

  // UI visibility
  ui: {
    showTelemetry, showRouteEngine, activePanel,
    showWeatherLayers, showWeatherDetail
  }
}
```

**Persisted to localStorage (v3):** `theme`, `mapTheme`, `isMuted`, `savedRoutes`, `notificationPermission`.

---

## 5. DESIGN SYSTEM & TOKENS

### Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#f43f5e` rose-500 | Actions, alerts, brand |
| Safe | `#22d3ee` cyan-400 | Safe routes, scanner dot |
| Optimal | `#34d399` emerald-400 | High SSI, success states |
| Caution | `#fbbf24` amber-400 | Mid SSI, warnings |
| Critical | `#ef4444` red-500 | Low SSI, hazards |
| Info | `#60a5fa` blue-400 | Radar, info panels |
| Research | `#a78bfa` violet-400 | Deep-dive panels, intelligence feed |
| Gamify | `#fcd34d` amber-300 | Gold, streaks, scores |
| Surface | `#0a0a0e` | Glass panel backgrounds |
| Border | `white/[0.08]` | Glass borders |
| Text | `white/90` | Primary text |
| Muted | `white/40` | Secondary text |

### Typography
- **Sans:** Inter + system-ui
- **Mono:** SF Mono / ui-monospace
- **Numbers:** `font-feature-settings: 'tnum'` (tabular-nums)
- **Labels:** `uppercase`, `tracking-widest`, `text-[10px]`
- **Headings:** `tracking-tight`, `font-semibold`

### Animation Timing
- Fast feedback: `150ms`
- Standard: `300ms` `cubic-bezier(0.16, 1, 0.3, 1)`
- Dramatic: `600ms`
- Ambient loops: `3s–8s`

### Z-Index Hierarchy
```
0–10:    Mapbox canvas, custom map layers
11–20:   Weather particle canvas overlay
21–30:   Route lines, radar raster, 3D buildings
31–40:   Map markers, scanner glow
41–50:   Glass panels (Telemetry, RouteEngine)
51–60:   Modals (StartScreen, SavedRoutes)
61–70:   Toasts, loading overlays
71–80:   Full-screen effects (post-processing glow)
```

### Glass Panel Base Class
```css
.glass-panel {
  @apply bg-[#0a0a0e]/70 backdrop-blur-2xl border border-white/[0.08] shadow-glass;
}
```

### Accessibility
- Full `prefers-reduced-motion` support in `src/index.css` — disables particles, collapses animations to instant
- Weather particle canvas is `pointer-events-none` and `aria-hidden`

---

## 6. SSI ALGORITHM (SAFETY ENGINE)

**File:** `src/utils/safetyEngine.js`

**Factors (per route sample point):**
1. **Temperature** → black ice risk below 32°F, freezing rain 32–40°F with precip
2. **Precipitation intensity** → hydroplane risk calculation
3. **Wind gusts** → crosswind danger thresholds at 25/35/45 mph
4. **Visibility** → penalties below 5/2/0.5 km
5. **WMO weather codes** → thunderstorm (95–99), heavy precip (65–67), snow (71–77), fog (45–48)
6. **Night multiplier** → 1.2x risk between 8pm–6am
7. **Traction** → derived from temp + precip + humidity (0.05 = black ice, 1.0 = dry)

**Scoring:**
- `combinedRisk = maxRisk * 0.7 + avgRisk * 0.3`
- `SSI = round(max(0, (1.0 - combinedRisk) * 100))`

**Categories:**
- 86–100: Optimal (green `#22c55e`)
- 71–85: Fair (blue `#3b82f6`)
- 56–70: Caution (yellow `#eab308`)
- 31–55: Severe (orange `#f97316`)
- 0–30: Critical (red `#ef4444`)

---

## 7. API INTEGRATIONS & DATA FLOW

### Mapbox
- **Directions API** → `getRoutes(start, end, profile)` with `alternatives=true`
- **Geocoding API** → autocomplete suggestions in RouteEnginePanel
- **Style:** `mapbox://styles/mapbox/dark-v11` (or light-v11)
- **Token:** `REACT_APP_MAPBOX_TOKEN`

### Open-Meteo (free, no key)
- **Current conditions** + **hourly forecast** + **daily forecast**
- **Route batch fetch:** samples up to 20 points along route geometry, batch-fetches via `latitude=l1,l2,...&longitude=lng1,lng2,...`
- **Units:** Fahrenheit, mph, inches
- **Poll interval:** 5 minutes

### XWeather
- **Endpoints:** `/conditions`, `/conditions/summary`, `/roadweather`
- **Auth:** `REACT_APP_XWEATHER_CLIENT_ID` + `REACT_APP_XWEATHER_CLIENT_SECRET`
- **Data merged into** `weather.xweather` in Zustand
- **Simulated lightning data** when `weatherCode >= 95` (for UI demo purposes when API unavailable)

### RainViewer
- Radar tile URLs for `useRadar` precipitation overlay
- 10-minute refresh

### Environment Variables (`.env`)
```
REACT_APP_MAPBOX_TOKEN         # Mapbox token
MAPBOX_STYLE                    # mapbox://styles/mapbox/dark-v11
REACT_APP_TOMORROW_TOKEN       # Tomorrow.io (legacy)
REACT_APP_TOMTOM_TOKEN         # TomTom traffic
REACT_APP_ROAD511_TOKEN        # Road511 cameras
REACT_APP_OWM_KEY              # OpenWeatherMap (optional)
REACT_APP_XWEATHER_CLIENT_ID # XWeather client ID
REACT_APP_XWEATHER_CLIENT_SECRET # XWeather secret
PORT=3000
```

---

## 8. KEY ARCHITECTURE PATTERNS

### MapOverlay Orchestration Pattern
- `MapOverlay.js` is the single parent that initializes `mapboxgl.Map` once
- All child components are **absolute-positioned overlays** on top of the map canvas
- Hooks receive `mapRef` (a `useRef`) rather than the map instance directly
- **Ref forwarding pattern:** hook return values are stored in `useRef` inside MapOverlay to avoid unstable deps in `useEffect`
- **Theme switch:** `setStyle` with `diff: false`, markers removed before style teardown (prevents fog.js crash), then re-added after `style.load`

### Weather Particle Canvas
- Full-screen `canvas` at `z-index: 11`, `pointer-events-none`
- Uses `ResizeObserver` for responsive sizing
- Object-pooled `Particle` class (rain streaks or snow circles)
- Capped at 200 particles, respects `prefers-reduced-motion`
- Only renders when `precipitationIntensity > 0.01` or `weatherCode >= 51`

### Route Drawing
- Safest route = **cyan** (`#00f2ff`) with glow layer (blur + opacity)
- Fastest but dangerous route = **amber** (`#f59e0b`) with glow
- Route lines animated with `requestAnimationFrame` stroke-width buildup
- Hazard markers: pulsing red circles with SVG warning icon at `worstPoint`
- Route fit bounds with `padding: 100, pitch: 50`

### Voice Co-pilot Flow
1. User presses **StartScreen** → `unlockAudio()` + TTS briefing
2. Route planned → `speak('Calculating safest route...')` → final safety announcement
3. Storm intercept detected → `speak('Storm cell intercepting route in 12 minutes')` + toast warning
4. All speech goes through queue (`speechQueue[]`) to prevent overlap

---

## 9. BUILD & DEPLOYMENT

**Dev:** `npm run dev` (react-scripts start, PORT 3000)
**Production:** `npm run build` → outputs to `build/` → `node server.js` serves static with COOP/COEP headers
**Custom webpack config** referenced in `package.json` under `"config": { "webpack": "./webpack.config.js" }`

Server headers required for Piper TTS WASM threading:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

---

## 10. ALREADY-BUILT FEATURES (CURRENT STATE)

### Phase 1 Visual Foundation — PARTIALLY COMPLETE
- [x] **StartScreen.js** — Rain particles, animated shield SVG with stroke-draw animation, typewriter subtitle, press-and-hold launch button with radial fill and shimmer
- [x] **TelemetryPanel.js** — SSI ring with edge glow, sparkline charts (pure SVG area fill), wind compass rose, visibility bar, UV badge, pressure gauge, hourly temp chart, dewpoint comfort, lightning badge, segment analysis, click-to-expand
- [x] **ToastContainer.js** — Blur + scale entrance, confetti burst on success (14 CSS divs), screen shake on error, progress drain bar
- [x] **ControlBar.js** — Concentric sound-wave rings when voice listening, bouncing notification badge, active-state borders, neon glow on active
- [x] **RouteEnginePanel.js** — Mapbox geocoding autocomplete with 3D tilt hover (`perspective(600px) rotateX(1deg)`), liquid glass button with shimmer skew + click ripple, travel mode ETA toggles
- [x] **Weather particle canvas** — Object-pooled rain/snow particles, `requestAnimationFrame`, 200 particle cap
- [x] **Route scanner** — Cyan dot traverses route geometry in 12s loop (via `useRouteScanner`)
- [x] **Storm cell tracker** — Detects cells from RainViewer frames, projects paths, checks route intersection with Turf.js, TTS/toast warnings
- [x] **Radar sweep effect** — Expanding blue circle animation on map when `isSweeping` is true
- [x] **SavedRoutesModal.js** — List, share (clipboard), delete, Escape-to-close, glass modal with scale-in

### NOT YET BUILT (Major gaps from HANDOFF_PROMPT)
- [ ] **SwerveScorePanel.js** — Persistent scoring, levels (Novice→Legend), badges
- [ ] **WeatherReplayPanel.js** — Historical 24h weather scrubber with Open-Meteo archive API
- [ ] **SafetyReportPanel.js** — PDF-ready/shareable HTML post-route report with QR code
- [ ] **IntelligenceFeed.js** — Bottom-panel news ticker for route intelligence
- [ ] **usePredictiveRouting.js** — Departure time optimizer with SSI sparkline vs. leave-time
- [ ] **useCommunityHazards.js** — Community-sourced hazard layer (localStorage + mock data)
- [ ] **"Moment Captured"** auto-share after extreme routes (SSI >95 or SSI ≤60)
- [ ] **Route comparison mode** in SavedRoutesModal
- [ ] **Challenge Mode** scaffold
- [ ] **Streak tracking** in Zustand store + fire animation in TelemetryPanel

---

## 11. PERFORMANCE CONSTRAINTS

- **Never drop below 55 FPS** on mobile
- Weather particle canvas capped at 200 particles, object-pooled, skips frames if `deltaTime > 33ms`
- Mapbox sources reused; never recreate on style change
- All map movement handlers debounced
- `will-change` and `transform` preferred over `left/top`
- CSS animations preferred over JS animation libraries
- `framer-motion` is **exclusively reserved** for complex orchestrations (not currently used)

---

## 12. SECURITY & OPERATIONAL NOTES

- API keys are **hardcoded in `.env.example`** (exposed in git). This is known and acceptable for demo/internal use but should move to CI/CD secrets for production.
- No actual backend API beyond Express static file serving — all data fetching is client-side.
- The `db.js`, `user.model.js`, `user.controller.js`, `user.routes.js`, `hello.middleware.js` are **scaffold files** from an early Express backend plan but are **not wired into the application**.

---

## 13. DESIGN INTENT: "WEATHER INTELLIGENCE SUPERWEAPON"

When producing new code for Swerve, always bias toward:
1. **Cinematic motion** — every interaction should feel sci-fi HUD-level satisfying
2. **Screenshot-ability** — telemetry panels, route results, and storm warnings should be visually stunning enough to share
3. **Voice-first UX** — the AI co-pilot speaks naturally; visuals reinforce what the voice says
4. **Safety above speed** — the safest route is the star; fastest is secondary context
5. **Performance purity** — no JS animation libraries if CSS can do it; no chart libraries if SVG can do it
6. **Glassmorphism discipline** — consistent `bg-[#0a0a0e]/70 backdrop-blur-2xl border-white/[0.08]` panels with subtle edge lighting

---

## 14. PROMPT FOR CLAUDE OPUS

> **Now, Claude Opus — synthesize this entire context into a "perfect prompt" for Swerve development.**
>
> The prompt should:
> 1. Capture the **complete project identity** (weather-aware nav, sci-fi HUD, viral/gamification)
> 2. Specify the **exact tech stack** and constraints (React 18, Mapbox GL JS, Zustand, Tailwind, pure SVG/canvas, NO Redux/chart libs)
> 3. Embed the **design token system** (colors, typography, glass panel base, animation timing, z-index hierarchy)
> 4. Include the **Zustand state shape** with all current slices
> 5. Reference the **SSI algorithm** and weather data flow (Open-Meteo batch, XWeather, RainViewer)
> 6. Describe the **MapOverlay orchestration pattern** (map init, ref forwarding, theme switch lifecycle, marker teardown)
> 7. List **already-built features** versus **not-yet-built features** from the viral upgrade roadmap
> 8. Embed **performance guardrails** (55 FPS floor, 200 particle cap, prefers-reduced-motion)
> 9. Maintain the **"weather intelligence superweapon" voice** throughout
>
> The prompt should be **one-shot ready** — paste it into a new Claude Opus conversation and immediately get coherent, architecturally correct Swerve code that builds on the existing codebase without contradicting it.
>
> Output the prompt as a single markdown code block that can be copied directly.
