---
title: "Hazard Detection Conditions"
tags: ["safety", "hazards", "weather-codes"]
keywords: ["black ice", "storm cell", "high winds", "slick roads", "WMO codes"]
related: ["safety-engine/ssi-algorithm/ssi_calculation"]
createdAt: "2026-04-22T05:48:00Z"
updatedAt: "2026-04-22T05:48:00Z"
---

## Raw Concept

**Task:**
Define exact thresholds and weather code mappings used to classify hazardous conditions.

**Primary File:**
`src/utils/safetyEngine.js`

## Narrative

### WMO Weather Code Interpretation

Open-Meteo returns [WMO codes](https://open-meteo.com/en/docs). Significant codes for safety:

- `0` — Clear sky → no hazard
- `1–3` — Mainly clear, partly cloudy, overcast → no hazard
- `45, 48` — Fog, ice fog → not currently in hazard logic (could enhance later)
- `51–63` — Drizzle / rain (various intensities) → Slick Roads (0.35 risk)
- `65` — Heavy rain → Storm Cell (0.8 risk)
- `66–67` — Heavy freezing rain, heavy sleet → likely Storm Cell or Black Ice depending on temp
- `71–77` — Snow, sleet, hail → handled via temp; could add explicit logic (not yet)
- `82` — Heavy rain and snow mix → Storm Cell
- `95–99` — Thunderstorm variants → Storm Cell (0.8 risk)

Implementation check (safetyEngine.js line 38):

```javascript
const isStormCode = point.weatherCode >= 65 || (point.weatherCode >= 95 && point.weatherCode <= 99) || point.weatherCode === 82;
```

### Precipitation Intensity Thresholds

- Storm Cell threshold: `> 0.05 inches/hour`
- Slick Roads threshold: any detectable precipitation (`> 0`)

Open-Meteo precipitation is cumulative? Actually it's rate in current period.

### Wind Thresholds

- High Winds: `windGust > 30 mph` (from `wind_gusts_10m`)

### Temperature Thresholds

- Black Ice: `roadSurfaceTemperature <= 32°F`
  - Uses `apparent_temperature` (feels-like) as proxy for road surface; falls back to `temperature_2m`.

## Facts
- **temp_ice_threshold**: 32°F freezing point for black ice detection [convention]
- **precip_storm_threshold**: >0.05 in/h indicates storm cell hazard [convention]
- **wind_gust_threshold**: >30 mph triggers high winds risk [convention]
- **wmocode_storm_range**: Codes 65, 82, 95–99 indicate thunderstorm/storm conditions [convention]
- **wmocode_slick_range**: Codes 51–63 indicate drizzle/rain → slick roads [convention]
