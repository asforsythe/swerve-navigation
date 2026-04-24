---
title: "Open-Meteo Batch Fetch Strategy"
tags: ["weather-service", "open-meteo", "api-integration"]
keywords: ["batch request", "coordinate arrays", "lat,lng join", "route sampling", "10-mile interval"]
related: ["safety-engine/weather-integration"]
createdAt: "2026-04-22T05:48:00Z"
updatedAt: "2026-04-22T05:48:00Z"
---

## Raw Concept

**Task:**
Sample coordinates every 10 miles along the route polyline and request current weather for all points in a single Open-Meteo API call.

**Primary File:**
`src/services/weatherService.js`

**Dependencies:**
- `@turf/length` — computes total route length in km
- `@turf/along` — interpolates point at a given distance

## Narrative

### Sampling Algorithm

```javascript
const routeLengthKm = length(routeGeometry, { units: 'kilometers' });
const intervalKm = 16.09; // 10 miles in km
const samplePoints = [];

for (let d = 0; d <= routeLengthKm; d += intervalKm) {
  samplePoints.push(along(routeGeometry, d, { units: 'kilometers' }).geometry.coordinates);
}
// Always add destination
if (routeLengthKm % intervalKm !== 0) {
  samplePoints.push(along(routeGeometry, routeLengthKm, { units: 'kilometers' }).geometry.coordinates);
}
```

This yields approximately one weather call per ~10 miles. Example: a 45-mile route → 5 points (0, 10, 20, 30, 40, 45).

### Batch Request Format

Open-Meteo supports comma-separated coordinate lists:

```
https://api.open-meteo.com/v1/forecast?latitude=lat1,lat2,...&longitude=lng1,lng2,...&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_gusts_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch
```

Response:

```json
{
  "current": [
    { "temperature_2m": 85.2, "apparent_temperature": 90.1, "precipitation": 0.0, "weather_code": 0, "wind_gusts_10m": 12 },
    { ...point 2... },
    ...
  ]
}
```

If a single point is provided, `current` is an object; if multiple, an array. The code normalizes with `Array.isArray(data) ? data : [data]`.

### Output Mapping

For each result index `i`, returns:

```javascript
{
  lat: samplePoints[i][1],
  lng: samplePoints[i][0],
  precipitationIntensity: current.precipitation || 0,
  weatherCode: current.weather_code || 0,
  windGust: current.wind_gusts_10m || 0,
  roadSurfaceTemperature: current.apparent_temperature || current.temperature_2m || 15
}
```

### Error Handling

On fetch failure, logs error and returns empty array — caller must handle gracefully. `calculateRouteSafety` returns SSI=100 when weatherDataPoints empty (optimistic default), but that may be unrealistic; could change to neutral 75 later.

## Facts
- **sampling_interval**: Exactly every 10 miles (16.09 km) along route geometry [project]
- **endpoint_inclusion**: Destination coordinate always included even if not aligned to grid [project]
- **batch_api**: Open-Meteo accepts comma-separated lat/lng arrays for a single request [convention]
- **units**: Temperatures in °F, wind in mph, precip in inches [project]
- **fallback_temp**: If apparent_temperature missing, uses temperature_2m; defaults to 15°C (59°F) if both missing [project]
- **error_policy**: Network errors yield empty array; no retries implemented [convention]
