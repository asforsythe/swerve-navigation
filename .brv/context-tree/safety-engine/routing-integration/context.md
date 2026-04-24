---
title: "Routing Integration"
tags: ["routing", "mapbox", "route-safety", "alternatives"]
keywords: ["Mapbox Directions API", "alternative routes", "safest vs fastest", "route geometry", "hazard markers"]
related: ["safety-engine/ssi-algorithm", "safety-engine/weather-integration", "mapbox"]
createdAt: "2026-04-22T05:48:00Z"
updatedAt: "2026-04-22T05:48:00Z"
---

# Topic: routing-integration

## Overview
Orchestrates fetching multiple route alternatives from Mapbox, analyzing each via the safety engine, choosing safest vs fastest, and rendering results with UI cues (pulse, color coding, markers).

## Key Concepts
- Routes fetched with `alternatives=true` and `geometries=geojson`
- Each route is scored independently; fastest = min duration, safest = max SSI
- Visual hierarchy: safest route glowing neon blue (#00f2ff, width 10); fastest if dangerous shown amber (#f59e0b, width 4)
- Storm cell markers (red bouncing dots) placed at each route's worstPoint (max precip)
- Neural scan pulse follows the safest route geometry

## Primary File
`src/components/MapOverlay.js` (handleRouteRequest, handleManualRoute, drawRoutes)

## Supporting Services
- `src/services/routingService.js` — raw Mapbox API wrapper
- `src/utils/safetyEngine.js` — per-route safety scoring
- `src/services/weatherService.js` — weather sampling per route

## Related Topics
- [safety-engine/ssi-algorithm](./ssi-algorithm/context.md) — produces SSI per route
- [safety-engine/weather-integration](./weather-integration/context.md) — provides per-point weather
