---
title: "SSI Calculation & Hazard Logic"
tags: ["safety-index", "algorithm", "hazard-detection", "risk-scoring"]
keywords: ["risk calculation", "black ice", "storm cell", "traction", "precipitation intensity"]
related: ["safety-engine/ssi-algorithm"]
createdAt: "2026-04-22T05:48:00Z"
updatedAt: "2026-04-22T05:48:00Z"
---

## Raw Concept

**Task:**
Compute per-point risk, aggregate to route-level SSI, and generate TTS message.

**Primary File:**
`src/utils/safetyEngine.js`

**Flow:**
For each sampled weather point along route → assess risk factors → track max risk, worst point, min traction → compute final SSI and hazard classification.

## Narrative

### Risk Factor Table

| Condition                               | Detection Criteria                                                      | Risk  | Hazard Type   | TTS Message                                                              |
| --------------------------------------- | ------------------------------------------------------------------------ | ----- | ------------- | ------------------------------------------------------------------------- |
| Black Ice                               | `roadSurfaceTemperature <= 32°F`                                         | 1.0   | Black Ice     | "Critical safety alert: Freezing road temperatures and black ice risk..." |
| Storm Cell                              | `precipitationIntensity > 0.05 in/h` OR WMO codes `65, 95–99, 82`       | 0.8   | Storm Cell    | "Caution: Severe storm cells and heavy precipitation detected..."         |
| High Winds                              | `windGust > 30 mph`                                                      | 0.5   | High Winds    | "Safety warning: High wind gusts detected along the path."                |
| Slick Roads (light precip)              | `precipitationIntensity > 0` OR WMO codes `51–63`                        | 0.35  | Slick Roads   | "Weather update: Precipitation detected. Roads may be slick."             |
| None                                    | No conditions met                                                        | 0     | None          | "Optimal path verified."                                                   |

### Traction Model

```javascript
if (roadSurfaceTemperature <= 32) {
  currentTraction = 0.1; // 10% on ice
} else {
  // Hydroplane risk: linear decay with precip intensity, floor at 40%
  currentTraction = Math.max(0.4, 1.0 - (precipitationIntensity * 2));
}
```

`minTraction` (lowest across all points) is reported as overall traction %.

### SSI Computation

```javascript
const finalSSI = Math.round(Math.max(0, (1.0 - maxRisk) * 100));
```

Categorization:
- `finalSSI <= 30` → Critical (red)
- `finalSSI <= 70` → Caution (amber)
- `finalSSI > 70` → Optimal (green)

### Output Object

```typescript
{
  ssi: number,            // 0–100
  category: 'Critical' | 'Caution' | 'Optimal',
  color: string,          // hex for UI: #ef4444, #f97316, #22c55e
  hazardType: string,     // 'None' | 'Black Ice' | 'Storm Cell' | 'High Winds' | 'Slick Roads'
  ttsMessage: string,     // spoken alert
  weatherRisk: number,    // maxRisk value
  traction: number,       // 0–100 percentage
  worstPoint: { lat, lng } // location of max precipitation (for marker)
}
```

## Facts
- **risk_black_ice**: Freezing temps (≤32°F) assign maximum risk 1.0 and 10% traction [convention]
- **risk_storm_cell**: Precipitation >0.05 in/h or specific WMO codes assign risk 0.8 [convention]
- **risk_high_winds**: Gusts >30 mph assign risk 0.5 [convention]
- **risk_slick_roads**: Any precipitation or WMO drizzle codes 51–63 assign risk 0.35 [convention]
- **ssi_formula**: SSI = round((1 - maxRisk) × 100) [project]
- **traction_ice**: Road temperature ≤32°F yields fixed 10% traction [convention]
- **traction_hydroplane**: Traction = max(40%, 100% − precipIntensity×2) [convention]
- **hazard_selection**: The route's hazard type is the maxRisk hazard, not necessarily present at every point [project]
- **tts_generation**: The TTS message corresponds to the highest-risk condition found [project]
