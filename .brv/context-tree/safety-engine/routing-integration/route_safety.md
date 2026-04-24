---
title: "Route Safety Analysis & Bypass Logic"
tags: ["route-comparison", "bypass", "tts-messaging", "ui-rendering"]
keywords: ["safest route selection", "bypass suggestion", "SSI comparison", "neural scan pulse", "hazard marker"]
related: ["safety-engine/routing-integration"]
createdAt: "2026-04-22T05:48:00Z"
updatedAt: "2026-04-22T05:48:00Z"
---

## Raw Concept

**Task:**
Compare all analyzed routes, pick the fastest and safest, render them with appropriate styling, and generate a spoken announcement that may override the default safety message when a safer bypass exists.

**Primary File:**
`src/components/MapOverlay.js` — functions `handleRouteRequest` & `drawRoutes`

## Narrative

### Analysis Pipeline

1. `getRoutes(start, end)` → returns raw Mapbox route alternatives (typically 2–3).
2. For each route:
   - Sample weather via `getSafetyWeatherForRoute(route.geometry)`
   - Compute safety via `calculateRouteSafety(route, weatherPoints)`
   - Attach `safety` object to route.
3. Sort:
   - Fastest: `routes.sort((a,b) => a.duration - b.duration)[0]`
   - Safest: `routes.sort((a,b) => b.safety.ssi - a.safety.ssi)[0]`
4. Render: `drawRoutes(analyzedRoutes)`
5. Speak: final announcement.

### Visual Hierarchy (`drawRoutes`)

Route styling per route (line color, width, opacity):

| Criteria                                 | Color          | Width | Opacity |
| ---------------------------------------- | -------------- | ----- | ------- |
| Safest route (any SSI)                   | `#00f2ff` (neon blue) | 10    | 1.0     |
| Dangerous route (`ssi < 70`) that's also fastest | `#f59e0b` (amber) | 4     | 0.8     |
| All other routes                         | `#4b5563` (gray) | 4     | 0.4     |

Additionally, if a route is both dangerous and fastest, a **storm cell marker** is added at `route.safety.worstPoint`:

```javascript
const el = document.createElement('div');
el.className = 'flex items-center justify-center w-8 h-8 bg-rose-600 rounded-full border-2 border-white shadow-xl animate-bounce';
// SVG lightning bolt icon inside
new mapboxgl.Marker(el).setLngLat([worstPoint.lng, worstPoint.lat]).addTo(map);
```

### Bypass TTS Override Logic

When fastest route has `ssi < 70` AND safest geometry differs, provide a comparative message:

```javascript
if (fastest.safety.ssi < 70 && safest.geometry !== fastest.geometry) {
  const timeDiff = Math.round((safest.duration - fastest.duration) / 60);
  const condition = fastest.safety.hazardType === 'Storm Cell' ? 'heavy rain' : 'weather hazards';
  finalAnnouncement = `Primary route is impacted by ${condition}. Northern bypass is 100% clear and only adds ${timeDiff} minutes to your ETA. Follow the blue pulse for a safe heading.`;
}
```

Otherwise, if all routes have `ssi < 70`, warn:

```javascript
} else if (safest.safety.ssi < 70) {
  finalAnnouncement = `Swerve Safety Warning: All available paths contain weather hazards. Safest path has a score of ${Math.round(safest.safety.ssi)}. ${safest.safety.ttsMessage}`;
}
```

Otherwise, use the safest route's own `ttsMessage`.

### Scan Pulse

A blue dot (`route-scanner` source/layer) traverses the safest route geometry over a 10-second loop using Turf `along()`:

```javascript
const routeLen = length(currentRouteGeometry);
const point = along(currentRouteGeometry, progress * routeLen);
// radius pulses and opacity fades at ends
```

The pulse is independent of UI; purely visual feedback.

## Facts
- **route_source**: Mapbox Directions API `driving-traffic` profile with `alternatives=true` [project]
- **max_routes_considered**: All returned alternatives (typically ≤3) are scored [project]
- **safest_color**: Neon blue #00f2ff with 8px radius pulse [convention]
- **dangerous_color**: Amber #f59e0b for fastest-but-hazardous path [convention]
- **marker_style**: Red circular marker with lightning icon at worst precipitation point [project]
- **bypass_criteria**: Fastest SSI < 70 AND safest path differs → override TTS with time difference [project]
- **pulse_duration**: Full route traversal takes 10 seconds (slow cinematic scan) [project]
