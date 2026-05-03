// src/utils/safetyEngine.js

/**
 * Enhanced Swerve Safety Index (SSI) calculation.
 * Factors: precipitation, temperature, wind, visibility, weather codes, time of day.
 * @param {Object} route - Mapbox route object
 * @param {Array} weatherDataPoints - Weather data points sampled along route
 * @returns {Object} Safety assessment
 */
export const calculateRouteSafety = (route, weatherDataPoints) => {
  let maxRisk = 0;
  let hazardType = 'None';
  let ttsMessage = 'Optimal path verified. Conditions are clear.';
  let worstPoint = null;
  let maxPrecip = 0;
  let minTraction = 1.0;
  let totalRiskScore = 0;
  let worstPointRisk = 0;

  if (!weatherDataPoints || weatherDataPoints.length === 0) {
    return {
      ssi: 100,
      category: 'Optimal',
      color: '#22c55e',
      hazardType: 'None',
      ttsMessage: 'Optimal path verified. Conditions are clear.',
      weatherRisk: 0,
      traction: 100,
      worstPoint: null,
    };
  }

  const now = new Date();
  const hour = now.getHours();
  const isNight = hour < 6 || hour > 20;
  const nightRiskMultiplier = isNight ? 1.2 : 1.0;

  weatherDataPoints.forEach((point) => {
    let currentPointRisk = 0;
    let currentHazard = 'None';
    let currentMsg = '';
    let currentTraction = 1.0;

    const temp = point.roadSurfaceTemperature ?? point.temperature_2m ?? 70;
    const precip = point.precipitationIntensity ?? 0;
    const windGust = point.windGust ?? point.wind_speed_10m ?? 0;
    const weatherCode = point.weatherCode ?? 0;
    const humidity = point.relativeHumidity ?? 50;
    const visibility = point.visibility ?? 10; // km

    // ── TRACTION CALCULATION (Enhanced with continuous temperature curve) ──
    if (temp <= 20) {
      // Deep freeze — black ice / compacted snow
      currentTraction = 0.05 + (temp + 20) / 400; // 0.05 at -20°F → 0.10 at 20°F
    } else if (temp <= 32) {
      // Near freezing — frost, possible black ice
      currentTraction = 0.10 + (temp - 20) / 120; // 0.10 at 20°F → 0.20 at 32°F
    } else if (temp <= 40 && precip > 0) {
      // Freezing rain risk
      currentTraction = 0.25;
    } else if (temp <= 50 && precip > 0) {
      // Cold wet roads — reduced grip
      currentTraction = Math.max(0.35, 0.70 - precip * 3);
    } else {
      // Hydroplane risk based on precip + humidity
      const hydroplaneFactor = precip * 2.5 + (humidity > 90 ? 0.15 : 0);
      currentTraction = Math.max(0.30, 1.0 - hydroplaneFactor);
    }

    // Extra traction penalty for snow/ice codes regardless of temp
    const isSnowCode = weatherCode >= 71 && weatherCode <= 77;
    const isFreezingCode = weatherCode >= 66 && weatherCode <= 67;
    if (isSnowCode) currentTraction *= 0.5;
    if (isFreezingCode) currentTraction *= 0.3;

    if (currentTraction < minTraction) minTraction = currentTraction;

    // ── VISIBILITY PENALTY ──
    let visibilityRisk = 0;
    if (visibility < 0.25) visibilityRisk = 0.4;
    else if (visibility < 0.5) visibilityRisk = 0.3;
    else if (visibility < 1) visibilityRisk = 0.2;
    else if (visibility < 2) visibilityRisk = 0.15;
    else if (visibility < 5) visibilityRisk = 0.05;

    // ── WIND RISK (crosswind danger for high-profile vehicles) ──
    let windRisk = 0;
    if (windGust > 55) windRisk = 0.5;
    else if (windGust > 45) windRisk = 0.4;
    else if (windGust > 35) windRisk = 0.25;
    else if (windGust > 25) windRisk = 0.1;

    // ── TRACTION-BASED BASE RISK ──
    // Traction below 0.3 is exponentially more dangerous
    let tractionRisk = 0;
    if (currentTraction < 0.15) tractionRisk = 0.75;
    else if (currentTraction < 0.25) tractionRisk = 0.55;
    else if (currentTraction < 0.35) tractionRisk = 0.35;
    else if (currentTraction < 0.50) tractionRisk = 0.15;
    else if (currentTraction < 0.70) tractionRisk = 0.05;

    // ── SEVERE WEATHER CODES (WMO) ──
    const isThunderstorm = weatherCode >= 95 && weatherCode <= 99;
    const isHeavyPrecip = weatherCode >= 65 && weatherCode <= 67;
    const isSleetOrFreezing = weatherCode >= 66 && weatherCode <= 67;
    const isSnow = weatherCode >= 71 && weatherCode <= 77;
    const isFog = weatherCode >= 45 && weatherCode <= 48;
    const isDrizzle = weatherCode >= 51 && weatherCode <= 55;
    const isStormCell = precip > 0.05 || isThunderstorm || isHeavyPrecip || weatherCode === 82;

    // ── DETERMINE HAZARD AND RISK (traction-integrated) ──
    if (temp <= 28) {
      currentPointRisk = Math.min(1.0, (0.85 + visibilityRisk + windRisk + tractionRisk) * nightRiskMultiplier);
      currentHazard = 'Black Ice';
      currentMsg = 'Critical alert: Severe black ice conditions. Traction severely compromised.';
    } else if (isSleetOrFreezing || (temp <= 35 && precip > 0 && temp <= 32)) {
      currentPointRisk = Math.min(1.0, (0.90 + visibilityRisk + tractionRisk) * nightRiskMultiplier);
      currentHazard = 'Freezing Rain';
      currentMsg = 'Severe warning: Freezing rain detected. Roads are extremely hazardous.';
    } else if (isThunderstorm) {
      currentPointRisk = Math.min(1.0, (0.75 + windRisk + visibilityRisk + tractionRisk) * nightRiskMultiplier);
      currentHazard = 'Thunderstorm';
      currentMsg = 'Severe weather: Thunderstorm with lightning. Consider delaying travel.';
    } else if (isStormCell) {
      currentPointRisk = Math.min(1.0, (0.65 + windRisk + visibilityRisk + tractionRisk) * nightRiskMultiplier);
      currentHazard = 'Storm Cell';
      currentMsg = 'Caution: Heavy precipitation and storm cells along this path.';
    } else if (isSnow) {
      currentPointRisk = Math.min(1.0, (0.55 + visibilityRisk + tractionRisk) * nightRiskMultiplier);
      currentHazard = 'Snow';
      currentMsg = 'Weather update: Snowfall reducing visibility and traction.';
    } else if (windGust > 35) {
      currentPointRisk = Math.min(1.0, (0.50 + windRisk + tractionRisk) * nightRiskMultiplier);
      currentHazard = 'High Winds';
      currentMsg = 'Safety warning: High wind gusts detected. Maintain firm steering control.';
    } else if (isFog || visibility < 2) {
      currentPointRisk = Math.min(1.0, (0.40 + visibilityRisk + tractionRisk) * nightRiskMultiplier);
      currentHazard = 'Low Visibility';
      currentMsg = 'Caution: Reduced visibility due to fog or mist.';
    } else if (precip > 0 || isDrizzle) {
      currentPointRisk = Math.min(1.0, (0.30 + visibilityRisk + tractionRisk) * nightRiskMultiplier);
      currentHazard = 'Slick Roads';
      currentMsg = 'Weather update: Light precipitation detected. Roads may be slick.';
    } else if (tractionRisk > 0) {
      // Non-precip traction risk (e.g. cold damp roads)
      currentPointRisk = Math.min(1.0, tractionRisk * nightRiskMultiplier);
      currentHazard = 'Reduced Traction';
      currentMsg = 'Caution: Cold road surfaces may reduce tire grip.';
    }

    if (currentPointRisk > maxRisk) {
      maxRisk = currentPointRisk;
      hazardType = currentHazard;
      ttsMessage = currentMsg;
    }

    totalRiskScore += currentPointRisk;

    // Track the ACTUAL worst point by combined risk, not just precip
    const combinedPointRisk = currentPointRisk + (1 - currentTraction) * 0.2;
    if (combinedPointRisk > worstPointRisk || worstPoint === null) {
      worstPointRisk = combinedPointRisk;
      worstPoint = { lat: point.lat, lng: point.lng };
    }

    if (precip > maxPrecip) {
      maxPrecip = precip;
    }
  });

  // Weighted average: max risk matters most, but overall route conditions factor in
  const avgRisk = totalRiskScore / weatherDataPoints.length;
  const combinedRisk = maxRisk * 0.65 + avgRisk * 0.35;

  const finalSSI = Math.round(Math.max(0, Math.min(100, (1.0 - combinedRisk) * 100)));

  let category = 'Optimal';
  let color = '#22c55e';

  if (finalSSI <= 25) {
    category = 'Critical';
    color = '#ef4444';
  } else if (finalSSI <= 45) {
    category = 'Severe';
    color = '#f97316';
  } else if (finalSSI <= 65) {
    category = 'Caution';
    color = '#eab308';
  } else if (finalSSI <= 80) {
    category = 'Fair';
    color = '#3b82f6';
  }

  return {
    ssi: finalSSI,
    category,
    color,
    hazardType,
    ttsMessage,
    weatherRisk: combinedRisk,
    traction: Math.round(minTraction * 100),
    worstPoint,
    isNight,
    maxPrecip,
    pointCount: weatherDataPoints.length,
  };
};

// ── Haversine helper (km) — used by adventure scoring ─────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Adventure Score (AS) — rates how thrilling/scenic a route is.
 *
 * Inputs:
 *   route             — Mapbox route object (needs .distance + .geometry.coordinates)
 *   ssi               — pre-computed SSI for this route (0–100)
 *   fastestRouteDist  — distance (meters) of the fastest available route
 *
 * Returns { as (0-100), adventureCategory, sinuosity, disqualified }
 * disqualified=true when SSI < 40 (safety floor — too dangerous for adventure)
 *
 * Scoring components:
 *   - Sinuosity     (38%) — route distance / crow-flies distance (winding = high)
 *   - Length premium(22%) — sweet spot: 15-40% longer than fastest
 *   - SSI thrill    (25%) — bell-curve peaking at SSI≈68 (caution/fair adds drama)
 *   - Turn density  (15%) — coordinate nodes per km (more turns = more engaging)
 */
export const calculateAdventureScore = (route, ssi, fastestRouteDist) => {
  const coords = route.geometry?.coordinates ?? [];
  const routeDist = route.distance || 0;
  const fastestDist = fastestRouteDist || routeDist;

  if (coords.length < 2 || routeDist < 500) {
    return { as: 0, adventureCategory: 'Unknown', sinuosity: 1, disqualified: false };
  }

  // Safety floor
  if (ssi < 40) {
    return { as: 0, adventureCategory: 'Too Dangerous', sinuosity: 1, disqualified: true };
  }

  const routeKm = routeDist / 1000;
  const fastestKm = fastestDist / 1000;

  // ── Sinuosity ─────────────────────────────────────────────────────────────
  const [startLng, startLat] = coords[0];
  const [endLng, endLat] = coords[coords.length - 1];
  const straightLineKm = Math.max(0.1, haversineKm(startLat, startLng, endLat, endLng));
  const sinuosity = routeKm / straightLineKm;
  // 0 at sinuosity 1.0 (straight), 1.0 at sinuosity 1.8+
  const sinuosityScore = Math.min(1, Math.max(0, (sinuosity - 1.0) / 0.8));

  // ── Length premium ────────────────────────────────────────────────────────
  const extraPct = fastestKm > 0 ? Math.max(0, (routeKm - fastestKm) / fastestKm) : 0;
  let lengthScore;
  if (extraPct < 0.05) {
    lengthScore = (extraPct / 0.05) * 0.15;
  } else if (extraPct <= 0.40) {
    lengthScore = 0.15 + ((extraPct - 0.05) / 0.35) * 0.85;
  } else {
    lengthScore = Math.max(0, 1.0 - (extraPct - 0.40) / 0.35);
  }

  // ── SSI thrill factor ─────────────────────────────────────────────────────
  // Bell curve: peaks at SSI ≈ 68 (Caution/Fair edge — exciting but not critical)
  const ssiThrill = ssi < 68
    ? (ssi - 40) / 28                          // ramp 0→1 from SSI 40 to 68
    : Math.max(0, 1 - (ssi - 68) / 45);        // taper 1→0.29 from SSI 68 to 100+

  // ── Turn density ──────────────────────────────────────────────────────────
  const nodesPerKm = routeKm > 0 ? coords.length / routeKm : 0;
  const turnScore = Math.min(1, nodesPerKm / 20); // 20+ nodes/km = max

  // ── Elevation variance bonus (if available) ───────────────────────────────
  let elevationScore = 0;
  if (coords.length > 2 && coords[0].length >= 3) {
    let elevGain = 0;
    for (let i = 1; i < coords.length; i++) {
      const diff = (coords[i][2] ?? 0) - (coords[i - 1][2] ?? 0);
      if (diff > 0) elevGain += diff;
    }
    // 500m+ elevation gain = max score
    elevationScore = Math.min(1, elevGain / 500);
  }

  // ── Composite ─────────────────────────────────────────────────────────────
  const raw = sinuosityScore * 0.35 + lengthScore * 0.20 + ssiThrill * 0.25 + turnScore * 0.12 + elevationScore * 0.08;
  const as = Math.round(Math.max(0, Math.min(100, raw * 100)));

  let adventureCategory = 'Tame';
  if (as >= 75) adventureCategory = 'Epic';
  else if (as >= 55) adventureCategory = 'Thrilling';
  else if (as >= 35) adventureCategory = 'Exciting';
  else if (as >= 15) adventureCategory = 'Scenic';

  return {
    as,
    adventureCategory,
    sinuosity: Math.round(sinuosity * 100) / 100,
    disqualified: false,
  };
};

/**
 * Quick safety assessment for a single point (used for live telemetry).
 */
export const assessPointSafety = (weather) => {
  if (!weather) return { ssi: 100, hazard: 'None' };

  const { temp, precipitationIntensity, windSpeed, weatherCode } = weather;
  let risk = 0;
  let hazard = 'None';

  // Traction-based risk
  let traction = 1.0;
  if (temp != null && temp <= 32) {
    traction = temp <= 20 ? 0.05 : 0.15;
  } else if (temp != null && temp <= 40 && precipitationIntensity > 0) {
    traction = 0.25;
  } else if (precipitationIntensity > 0) {
    traction = Math.max(0.3, 1.0 - precipitationIntensity * 2.5);
  }

  const tractionRisk = traction < 0.15 ? 0.6 : traction < 0.3 ? 0.4 : traction < 0.5 ? 0.2 : 0;

  if (temp != null && temp <= 32) {
    risk = Math.min(1.0, 0.8 + tractionRisk);
    hazard = 'Ice Risk';
  } else if (weatherCode >= 66 && weatherCode <= 67) {
    risk = Math.min(1.0, 0.75 + tractionRisk);
    hazard = 'Freezing Rain';
  } else if (precipitationIntensity > 0.05 || (weatherCode >= 65 && weatherCode <= 67)) {
    risk = Math.min(1.0, 0.55 + tractionRisk);
    hazard = 'Heavy Rain';
  } else if (windSpeed > 35) {
    risk = Math.min(1.0, 0.4 + tractionRisk);
    hazard = 'High Winds';
  } else if (precipitationIntensity > 0) {
    risk = Math.min(1.0, 0.25 + tractionRisk);
    hazard = 'Light Rain';
  } else if (tractionRisk > 0) {
    risk = tractionRisk;
    hazard = 'Reduced Traction';
  }

  return { ssi: Math.round(Math.max(0, Math.min(100, (1 - risk) * 100))), hazard };
};

/**
 * Compute route-level weather variance score.
 * Higher variance = more unpredictable conditions along route.
 */
export const calculateWeatherVariance = (weatherDataPoints) => {
  if (!weatherDataPoints || weatherDataPoints.length < 2) return 0;

  const temps = weatherDataPoints.map(p => p.temperature_2m ?? p.roadSurfaceTemperature ?? 70).filter(v => v != null);
  const winds = weatherDataPoints.map(p => p.windGust ?? p.wind_speed_10m ?? 0).filter(v => v != null);
  const precips = weatherDataPoints.map(p => p.precipitationIntensity ?? 0);

  const variance = (arr) => {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sqDiffs = arr.map(v => (v - mean) ** 2);
    return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / arr.length);
  };

  const tempVar = variance(temps);
  const windVar = variance(winds);
  const precipMax = Math.max(...precips);

  // Normalize: temp variance of 20°F = 1.0, wind variance of 15mph = 1.0
  const normTempVar = Math.min(1, tempVar / 20);
  const normWindVar = Math.min(1, windVar / 15);
  const precipFactor = Math.min(1, precipMax / 0.2);

  return Math.round((normTempVar * 0.4 + normWindVar * 0.35 + precipFactor * 0.25) * 100);
};
