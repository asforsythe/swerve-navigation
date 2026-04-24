---
title: "Safety Engine Domain"
tags: ["safety", "routing", "weather", "ssi"]
keywords: ["safety-index", "SSI", "hazard-detection", "route-safety", "weather-routing"]
related: ["navigation", "mapbox", "tts"]
createdAt: "2026-04-22T05:48:00Z"
updatedAt: "2026-04-22T05:48:00Z"
---

# Domain: safety-engine

## Purpose
Covers all logic for calculating route safety, hazard detection, weather data fetching, and safety-aware routing decisions in Swerve.

## Scope
Included in this domain:
- Swerve Safety Index (SSI) calculation algorithm
- Hazard detection (black ice, storm cells, high winds, slick roads)
- Weather data fetching from Open-Meteo along route polylines
- Route analysis, comparison, and selection of safest vs fastest paths
- TTS message generation for safety alerts and routing guidance
- Integration with Mapbox Directions API and routingService

Excluded from this domain:
- Map rendering (see UI/mapbox)
- Voice synthesis engine (see tts/piper)
- Traffic camera management (see cameras)
- User location tracking (see geolocation)

## Ownership
Backend navigation & safety algorithms

## Usage
Reference when implementing or modifying safety calculations, adding new hazard types, tweaking SSI thresholds, or integrating new weather data sources.
