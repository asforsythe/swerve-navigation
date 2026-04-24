---
title: "Weather Integration"
tags: ["weather", "open-meteo", "api", "batch-fetch"]
keywords: ["Open-Meteo", "weather sampling", "route points", "spatial interpolation"]
related: ["safety-engine/routing-integration", "safety-engine/ssi-algorithm"]
createdAt: "2026-04-22T05:48:00Z"
updatedAt: "2026-04-22T05:48:00Z"
---

# Topic: weather-integration

## Overview
Fetches hyper-local weather for discrete points along a route using the free Open-Meteo forecast API. Implements batch fetching (single HTTP request for all points) with sampling every 10 miles.

## Key Concepts
- Sampling interval: 10 miles (16.09 km) along route geometry
- Always includes endpoint (destination) even if outside the interval grid
- Weather variables requested: temperature_2m, apparent_temperature, precipitation, weather_code, wind_gusts_10m
- Units: Fahrenheit for temperature, mph for wind, inches for precipitation
- Returns array of `{ lat, lng, precipitationIntensity, weatherCode, windGust, roadSurfaceTemperature }`

## Primary File
`src/services/weatherService.js`

## Related Topics
- [safety-engine/ssi-algorithm](./ssi-algorithm/context.md) — consumes these weather points
- [safety-engine/routing-integration](./routing-integration/context.md) — invokes this service per route
