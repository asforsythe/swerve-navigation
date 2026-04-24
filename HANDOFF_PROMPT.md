# SWERVE — Immersive Visual UI & Research Feature Upgrade Handoff
> **Target Model:** Claude Sonnet 4.6  
> **Goal:** Analyze the current Swerve navigation app and deliver upgrades that make it *visually viral* and *intellectually addictive*. Think: "What would make someone screen-record this and post it?"

---

## 1. CURRENT SYSTEM SNAPSHOT

### Tech Stack
- **Frontend:** React 18, Mapbox GL JS (WebGL), TailwindCSS
- **State:** Zustand with `persist` middleware (localStorage)
- **TTS:** `@realtimex/piper-tts-web` (Amy voice, 1.15x speed)
- **Voice Commands:** Web Speech API (`webkitSpeechRecognition`)
- **Weather APIs:** Open-Meteo (free, no key), RainViewer radar tiles
- **Routing:** Mapbox Directions API
- **Build:** Custom webpack, outputs to `build/`

### File Structure (key files)
```
src/
  App.js                     # Entry — full-screen black div + MapOverlay
  components/
    MapOverlay.js            # Central orchestrator: map init, all hooks, layout
    ui/
      StartScreen.js         # "Ready to Roll" modal with glassmorphism card
      ControlBar.js          # Top-right: voice, mute, theme, saved routes, notifications
      TelemetryPanel.js      # Top-left: SSI safety ring, road temp, traction, precip, wind
      RouteEnginePanel.js    # Bottom-right: manual route inputs + radar toggle
      ToastContainer.js      # Top-center: success/error/info/warning toasts
      SavedRoutesModal.js    # Center modal: list, share (clipboard), delete
      LoadingOverlay.js      # Top-center spinner pill
  hooks/
    useTTS.js                # Piper TTS session + queue + audio unlock
    useVoiceCommand.js       # Web Speech recognition toggle
    useWeatherPolling.js     # 5-min Open-Meteo polling
    useRadar.js              # 10-min RainViewer radar tile refresh
    useRoutePlanning.js      # Route calc, safety analysis, drawRoutes, scanner trigger
    useMapLayers.js          # Traffic vector, 3D buildings, sky atmosphere, radar raster
    useRouteScanner.js       # Cyan dot that traverses the route geometry (12s loop)
  store/
    useSwerveStore.js        # Zustand: map, weather, traffic, route, polling, theme, telemetry, savedRoutes, notifications, toasts, voiceCommand, ui
  utils/
    safetyEngine.js          # SSI calc: precip, temp, wind, visibility, WMO codes, night multiplier
  services/
    weatherService.js        # getSafetyWeatherForRoute (turf sampling), WMO code descriptions
    routingService.js        # Mapbox Directions wrapper
  index.css                  # Tailwind + glass-panel, glass-button, text-gradient, marker-pulse utilities
  tailwind.config.js         # Custom animations: fade-in-up, slide-in-right, shimmer, pulse-glow, float, radar-ping, route-draw
```

### Current Visual Design Language
- **Theme:** Dark glassmorphism (`bg-[#0a0a0e]/70 backdrop-blur-2xl border-white/[0.08]`)
- **Accent:** Rose-500 (`#f43f5e`) for primary actions, cyan for safe routes, emerald for optimal, amber for caution, red for critical
- **Shadows:** `shadow-glass`, `shadow-neon-green/red/blue/cyan`
- **Animations:** Custom keyframes for slide-ins, shimmer, float, radar ping, route draw
- **Map:** Mapbox dark-v11 (or light-v11), 3D extruded buildings, sky atmosphere, fog that reacts to weather
- **Typography:** Inter sans + SF Mono for numbers

### Current State Shape (Zustand)
```js
{
  map: { loaded, bounds, cameraMarkers, weatherOverlays },
  weather: { current, forecast, severeAlerts, lastUpdated, isLoading, error },
  traffic: { cameras, selectedCamera, isLoading, error },
  route: { path, waypoints, isOptimized, weatherImpact },
  polling: { weatherInterval, cameraInterval, isActive, weatherLastPoll, cameraLastPoll },
  theme: 'dark', mapTheme: 'mapbox://styles/mapbox/dark-v11',
  isMuted: false,
  routeTelemetry: { ssi, traction, roadTemp, fastestSsi, lastUpdated },
  savedRoutes: [],
  notifications: [],
  toasts: [],
  voiceCommand: { isListening, lastTranscript },
  notificationPermission: 'default',
  ui: { showTelemetry, showRouteEngine, activePanel }
}
```

---

## 2. WHAT "VIRAL" MEANS FOR SWERVE

We are not building a utilitarian GPS. We are building a **weather-aware navigation experience** that people *show off*. Viral moments come from:

1. **Visual Spectacle** — The map itself should feel like a sci-fi HUD from a movie. Every interaction should have satisfying motion.
2. **Shareable Intelligence** — Users should want to screenshot and share their "Safety Score," storm-bypass stories, or "I dodged a tornado" replays.
3. **Social Proof** — Leaderboards, route streaks, community-sourced hazard reports.
4. **Research Depth** — Power users should be able to dive deep into weather data, historical trends, and predictive models. This creates authority and long-term retention.
5. **Gamification** — Safety streaks, "Swerve Score," achievements for avoiding hazards.
6. **Cinematic Onboarding** — The first 10 seconds should feel like launching a spaceship, not a GPS app.

---

## 3. UPGRADE CATEGORIES (DO NOT SKIP ANY)

### A. CINEMATIC UI / IMMERSIVE VISUALS
Upgrade every existing component. Reference exact files above.

**StartScreen.js** → Make it an **event**. Current: static glass card with emoji.
- Add a **live weather particle background** (CSS canvas or lightweight rain/snow particles behind the modal that react to current conditions)
- Replace emoji with an **animated SVG logo** that morphs (e.g., a shield/pulse icon that draws itself with SVG stroke animation)
- Add a **typewriter effect** for the voice status text
- Button: add a **press-and-hold to start** interaction with a radial fill progress ring (haptic feel)
- On start: **camera fly-through** — instead of just flying to location, animate through "warp speed" star particles that dissolve into the map

**TelemetryPanel.js** → Make it a **dashboard people screenshot**.
- SSI ring: add **concentric orbiting particles** that spin around the ring at speed proportional to wind speed
- Replace static stat boxes with **mini animated sparkline charts** (using pure SVG, no chart lib) that show last 5 readings
- Add a **"Threat Radar" mini-circle** that shows direction of nearest hazard (like a compass ring)
- Glass panel: add **edge light bleed** — a subtle gradient border that shifts color based on SSI (green→yellow→red pulse)
- Add **hover-expand** behavior: hovering the panel smoothly expands it to reveal detailed per-segment safety breakdown

**RouteEnginePanel.js** → Make it feel like a **mission control console**.
- Inputs: add **glowing focus states** with animated bottom border that travels left-to-right on focus
- Suggestions dropdown: add **3D tilt hover** effect (CSS `transform: perspective(600px) rotateX(2deg)`)
- "Plan Safest Route" button: replace with a **liquid glass button** that has an internal shimmer + ripple on click (CSS-only)
- Radar toggle: add **live thumbnail preview** of the current radar frame next to the toggle
- Add **route history timeline** — a thin vertical line showing past 3 routes with mini SSI dots you can click to replay

**ControlBar.js** → Make it **context-aware and alive**.
- Buttons: replace flat icons with **neon tube icons** that glow when active (SVG filter glow)
- Voice button: when listening, emit **concentric sound-wave rings** from the button (CSS animation)
- Add a **compact "Live Status" pill** that appears between buttons when routing: "Avoiding storm cell ↑ 2.3mi"
- Notification bell: animate with a **red dot that bounces** on new alert

**ToastContainer.js** → Make toasts **theatrical**.
- Add **slide + blur + scale entrance** (not just fade)
- Success toasts: brief **confetti particle burst** (CSS-only, 20-30 divs) from the toast origin
- Error toasts: **screen shake** (subtle `translateX` wobble on the toast container)
- Add **progress bar** that shrinks until auto-dismiss

**SavedRoutesModal.js** → Make routes **story-worthy**.
- Each route card: add a **mini static map thumbnail** (using Mapbox Static Images API — `https://api.mapbox.com/styles/v1/.../static/...`)
- Add **"Replay Journey"** button that re-animates the route drawing + scanner on the main map
- Share: generate a **beautiful share image** (Open Graph card) with route stats overlaid on a stylized map background — or at minimum, a rich text summary with emojis and route story
- Add **route comparison mode** — select 2 routes to see side-by-side SSI, time, weather breakdown

**MapOverlay.js** — The canvas itself needs upgrades:
- Add **post-processing glow layer** — a full-screen CSS overlay with `mix-blend-mode: screen` that pulses cyan when a safe route is found, amber when caution, red when critical
- Add **weather particle overlay** — a `<canvas>` layer above the map (but below UI) that renders rain streaks, snow drift, or dust particles based on current weather code. Performance-critical: use `requestAnimationFrame` with object pooling, cap at 200 particles.
- Add **holographic grid effect** on the ground when zoomed in > 16 — faint cyan grid lines that fade at edges (Mapbox custom layer or canvas overlay)
- **Route scanner upgrade**: instead of a simple dot, make it a **comet trail** — the scanner leaves a fading line of particles behind it (canvas or multiple geojson point sources with decaying opacity)

### B. RESEARCH / DEEP-DIVE FEATURES
These are the features that make power users stay and create content.

**1. Weather Archive & Replay (`src/components/ui/WeatherReplayPanel.js`)**
- New panel (accessible from ControlBar) that shows a **time-slider** for the last 24 hours of weather along the current route
- Uses Open-Meteo **historical API** (`https://archive-api.open-meteo.com/...`) to fetch past data
- Slider scrubs: map atmosphere (fog color, sky intensity) and route line color animate to match historical conditions
- Add **"What If?" mode**: user adjusts a hypothetical weather condition (e.g., "What if wind was 50mph?") and sees real-time SSI recalculation

**2. Route Safety Report (`src/components/ui/SafetyReportPanel.js`)**
- New panel that generates a **PDF-ready or shareable HTML report** after each route
- Sections: Executive Summary (SSI, time saved vs fastest), Hazard Breakdown (per-segment with severity bars), Weather Timeline (hour-by-hour along route), Recommendations ("Leave 30 min later to avoid storm"),
- Use **html2canvas + jsPDF** or just rich styled HTML for sharing
- Include a **QR code** generated via `qrcode` npm package that links to a read-only view of the report

**3. Community Hazard Layer (`src/hooks/useCommunityHazards.js`)**
- New hook + map layer that fetches community-reported hazards from a hypothetical endpoint
- For now, build the client-side architecture: localStorage-based "My Reports" + mock community data
- Report types: Flooding, Debris, Accident, Ice, Construction
- Map markers: **user-avatar circles** for community reports, **pulsing diamonds** for official reports
- Add **upvote/downvote** on reports (Zustand state)
- Gamify: "Hazard Scout" badge for first report in an area

**4. Predictive Routing (`src/hooks/usePredictiveRouting.js`)**
- Before planning, offer **"Departure Time Optimizer"**
- Slider: leave now, +30min, +1hr, +2hr, +4hr, +6hr, +12hr, +24hr
- For each offset, fetch forecast weather (Open-Meteo has hourly forecast) and re-run `calculateRouteSafety`
- Render a **sparkline chart** of SSI vs departure time — user picks the peak
- Highlight the "golden window" — green band on the chart where SSI > 85

**5. Swerve Intelligence Feed (`src/components/ui/IntelligenceFeed.js`)**
- New bottom-panel (collapsible) that acts like a **news ticker for your route**
- Sources: weather alerts, traffic incidents, community reports, historical accident data for this road segment
- Each item: icon, severity badge, distance ahead, timestamp, "More" expandable detail
- Auto-scroll with pause on hover
- AI-summarized TTS readout: "Ahead in 3 miles: reported flooding. Suggest reducing speed."

### C. GAMIFICATION & VIRAL MECHANICS

**Swerve Score (`src/components/ui/SwerveScorePanel.js`)**
- Persistent user score based on: routes completed, hazards avoided, community reports filed, safety streaks (consecutive routes with SSI > 80), night-driving bonuses
- Levels: Novice → Scout → Ranger → Guardian → Legend
- Each level unlocks: new map themes, scanner colors, badge frames
- Score panel: circular progress ring + level badge + next milestone

**Route Streaks**
- Track consecutive days with at least one route planned
- Fire streak animation on TelemetryPanel when active
- "7-day safe rider" — shareable badge

**Shareable Moments (auto-generated)**
- After any route with SSI < 60 (dangerous) OR SSI > 95 (perfect): trigger **"Moment Captured"** toast
- Moment includes: map screenshot region, route line, SSI, hazard type, time saved/lost, quote
- One-tap share: copy rich text + image to clipboard or native share API
- Store moments in Zustand: `moments: []`

**Challenge Mode**
- "Beat the Storm" — predefined scenarios using historical weather data
- "Safest Commute" — weekly challenge to maintain highest average SSI
- Leaderboard: localStorage mock for now, design for Firebase backend later

### D. PERFORMANCE & ACCESSIBILITY GUARDRAILS
- **Never drop below 55 FPS** on mobile. Use `will-change`, `transform` instead of `left/top`, debounce all map movement handlers.
- **Weather particle canvas**: cap at 200 particles, use object pooling, skip frames if `deltaTime > 33ms`.
- **Mapbox layers**: reuse sources, don't recreate on every style change.
- **Accessibility**: all new UI must support `prefers-reduced-motion` (disable particles, simplify animations).
- **Bundle size**: prefer CSS animations over JS animation libraries. If you need a library, use `framer-motion` selectively for complex orchestrations only.

---

## 4. IMPLEMENTATION PRIORITY (PHASES)

### Phase 1: Visual Foundation (Immediate Viral Impact)
1. Upgrade `StartScreen.js` — cinematic intro, particle background, press-and-hold button
2. Upgrade `TelemetryPanel.js` — orbiting particles, sparklines, threat radar, edge glow
3. Add weather particle canvas overlay to `MapOverlay.js`
4. Upgrade `ToastContainer.js` — theatrical entrances, confetti, progress bars

### Phase 2: Shareable Intelligence
5. Build `SafetyReportPanel.js` — post-route rich report with QR code
6. Build `WeatherReplayPanel.js` — historical weather scrubber
7. Add "Moment Captured" auto-share logic after extreme routes
8. Upgrade `SavedRoutesModal.js` — map thumbnails, replay, comparison

### Phase 3: Deep Research & Retention
9. Build `usePredictiveRouting.js` + departure time optimizer UI in `RouteEnginePanel.js`
10. Build `IntelligenceFeed.js` — news ticker for route intelligence
11. Build `useCommunityHazards.js` + community layer

### Phase 4: Gamification
12. Build `SwerveScorePanel.js` — scoring, levels, badges
13. Add streak tracking to Zustand store + fire animation
14. Build Challenge Mode scaffold

---

## 5. DESIGN TOKENS & CONSTRAINTS

### Color Palette (expand, don't replace)
```
Primary:    rose-500   #f43f5e  (actions, alerts)
Safe:       cyan-400   #22d3ee  (safe routes, scanner)
Optimal:    emerald-400 #34d399 (SSI high)
Caution:    amber-400  #fbbf24  (SSI mid)
Critical:   red-500    #ef4444  (SSI low, hazards)
Info:       blue-400   #60a5fa  (radar, info)
Surface:    #0a0a0e    (glass panel bg)
Border:     white/8    (glass borders)
Text:       white/90   (primary text)
Muted:      white/40   (secondary text)
```
New accent for research features: **violet-400** `#a78bfa` (deep-dive panels, intelligence feed)
New accent for gamification: **amber-300** `#fcd34d` (gold, streaks, scores)

### Typography
- Keep Inter + SF Mono. Add `font-feature-settings: 'tnum'` for tabular numbers in telemetry.
- Headings: `tracking-tight`, `font-semibold`
- Labels: `uppercase`, `tracking-widest`, `text-[10px]`

### Animation Timing
- Fast feedback: `150ms`
- Standard transition: `300ms`, `cubic-bezier(0.16, 1, 0.3, 1)`
- Dramatic entrances: `600ms`
- Ambient loops: `3s-8s`

### Z-Index Hierarchy
```
0-10:    Mapbox canvas, custom layers
11-20:   Weather particle canvas overlay
21-30:   Route lines, radar raster, 3D buildings
31-40:   Map markers, scanner glow
41-50:   Glass panels (Telemetry, RouteEngine)
51-60:   Modals (StartScreen, SavedRoutes, Reports)
61-70:   Toasts, loading overlays
71-80:   Full-screen effects (post-processing glow)
```

---

## 6. STATE EXTENSIONS NEEDED

Extend `useSwerveStore.js` with:
```js
// New slices
swerveScore: {
  total: 0,
  level: 'Novice',
  streakDays: 0,
  lastRouteDate: null,
  badges: [],
},
moments: [], // captured shareable moments
communityReports: [], // user-submitted + mock
predictiveResults: null, // departure time optimizer results
weatherHistory: [], // 24hr cache for replay
ui: {
  showTelemetry: true,
  showRouteEngine: true,
  activePanel: null,
  showIntelligenceFeed: false,
  showSwerveScore: false,
  showWeatherReplay: false,
},
```

---

## 7. OPEN QUESTIONS (Answer before coding)

1. **Community backend**: Do we have a backend for community hazards, or should everything be localStorage + mock data for now?
2. **Share image generation**: Should we generate real images server-side (requires backend), or create rich HTML/CSS share cards that users screenshot?
3. **Mapbox token budget**: Are we constrained on Mapbox Static Images API calls for route thumbnails?
4. **Mobile target**: Is this primarily mobile web (PWA) or desktop? The current design is mobile-first.
5. **New dependencies**: Can we add `framer-motion`, `html2canvas`, `qrcode`, `date-fns`? Or keep deps minimal?

---

## 8. SUCCESS CRITERIA

After your upgrade, a user should be able to:
1. Open the app and feel like they're launching something from *Blade Runner 2049* (StartScreen)
2. See their telemetry panel and immediately want to screenshot it (TelemetryPanel)
3. Plan a route, get a cinematic safety briefing, and receive a "Moment Captured" they can share
4. Scrub back through 24 hours of weather and understand *why* a route was dangerous yesterday
5. Optimize their departure time to find the "golden window" of safety
6. See community hazards and feel part of a network of informed drivers
7. Check their Swerve Score and feel compelled to maintain their streak

**Bottom line:** The app should feel less like Google Maps and more like a **weather intelligence superweapon** that happens to give directions.

---

*Good luck. Make it unforgettable.*
