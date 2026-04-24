---
title: "Console Errors & Radar Bug Fixes"
tags: ["bugfix", "radar", "voice", "wasm", "mapbox"]
keywords: ["setupProxy", "COOP", "COEP", "setSprite", "not-allowed", "rainviewer", "radar", "useMapLayers", "useVoiceCommand"]
related: ["safety-engine/routing-integration"]
createdAt: "2026-04-22T19:00:00Z"
updatedAt: "2026-04-22T19:00:00Z"
---

# Domain: bug-fixes

## Fixes Applied (2026-04-22) — Round 2

### 5. 414 Request-URI Too Large (weatherService.js)
- **Root cause:** Fixed 12km interval → ~335 sample points for FL→CA (~4000km), URL too long for Open-Meteo.
- **Fix:** Adaptive interval: `Math.max(16, routeLengthKm / 20)` — caps at 20 points for any route length. Destination always included.
- File: `src/services/weatherService.js`

### 6. fog.js Crash During Theme Switch (MapOverlay.js)
- **Root cause:** Mock hazard markers (and route hazard markers) remain attached to the map during `setStyle({diff:false})`. Mapbox tears down `map.style.fog` mid-rebuild; markers access it in the rAF render loop → TypeError.
- **Fix:**
  - `mapMarkersRef` tracks mock markers created at map init.
  - `clearHazardMarkersRef` exposes route marker cleanup (added to `useRoutePlanning` return).
  - Theme switch effect now removes ALL markers before `setStyle`, re-adds mock markers in `style.load` handler.
- Files: `src/components/MapOverlay.js`, `src/hooks/useRoutePlanning.js`

### 7. Live Radar Not Showing
- **Root cause 1:** `tiles:[]` on raster source can create a broken/invalid Mapbox source state.
- **Root cause 2:** `setTiles()` on raster source is unreliable; after style reload, the source was recreated with placeholder URL and `setTiles` was never called again reliably.
- **Fix:** `refreshRadar` now does full remove+re-add of source AND layer with real URL, preserving current visibility state. Reverted placeholder back to original `/0/` URL.
- Uses latest past frame (index `-1`) not second-to-last.
- File: `src/hooks/useRadar.js`, `src/hooks/useMapLayers.js`

## Fixes Applied (2026-04-22) — Round 1

### 1. WASM Multi-threading (Piper TTS)
- **File:** `src/setupProxy.js` (new)
- Added `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` headers via CRA dev server proxy middleware.
- Used `credentialless` (not `require-corp`) to avoid blocking Mapbox tiles and other cross-origin resources that lack CORP headers.

### 2. setSprite Warning × 3 (Mapbox style diff)
- **File:** `src/components/MapOverlay.js`
- The theme-switch effect was calling `setStyle()` on initial load (when `mapLoaded` first became true) with the same style already applied — causing 2 extra style rebuilds.
- Fix: Added `prevMapThemeRef` (starts as `null`). First run skips `setStyle`; subsequent runs only fire when `mapTheme` actually changes.
- Removed `addBaseLayers` from the effect's dependency array (use ref instead) to prevent style reloads when only `activeRadar` or `theme` changed.

### 3. Voice Recognition `not-allowed`
- **File:** `src/hooks/useVoiceCommand.js`
- Added `onError` callback parameter.
- When `event.error === 'not-allowed'`, fires `onError('Microphone access denied. Enable it in browser settings.')`.
- **File:** `src/components/MapOverlay.js` — passes `onError: (msg) => addToast({ message: msg, type: 'warning' })` to the hook.

### 4. Live Radar Broken After Theme Switch
- **Files:** `src/hooks/useMapLayers.js`, `src/components/MapOverlay.js`
- Root cause: `addBaseLayers` recreates the `rainviewer-radar` source with a placeholder URL (`/0/`) on every style reload. `refreshRadar` only ran on mount and every 10 minutes, not after style switches.
- Fix 1: Changed placeholder tiles from `['.../0/...']` to `[]` to avoid 404 tile requests on init.
- Fix 2: Bumped source `maxzoom` from 7 to 12 — at default zoom 12, tiles were being upscaled 32× from zoom 7.
- Fix 3: Added `refreshRadarRef` in `MapOverlay.js`. Theme-switch `style.load` handler now calls `refreshRadarRef.current?.()` after `addBaseLayers`, re-syncing the real tile URL immediately.
