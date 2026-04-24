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

    const temp = point.roadSurfaceTemperature || point.temperature_2m || 70;
    const precip = point.precipitationIntensity || 0;
    const windGust = point.windGust || point.wind_speed_10m || 0;
    const weatherCode = point.weatherCode || 0;
    const humidity = point.relativeHumidity || 50;
    const visibility = point.visibility || 10; // km

    // TRACTION CALCULATION - Enhanced
    if (temp <= 32) {
      // Freezing
      currentTraction = temp <= 20 ? 0.05 : 0.15; // Black ice vs frost
    } else if (temp <= 40 && precip > 0) {
      // Freezing rain risk
      currentTraction = 0.25;
    } else {
      // Hydroplane risk based on precip + humidity
      const hydroplaneFactor = precip * 2.5 + (humidity > 90 ? 0.15 : 0);
      currentTraction = Math.max(0.3, 1.0 - hydroplaneFactor);
    }

    if (currentTraction < minTraction) minTraction = currentTraction;

    // VISIBILITY PENALTY
    let visibilityRisk = 0;
    if (visibility < 0.5) visibilityRisk = 0.3;
    else if (visibility < 2) visibilityRisk = 0.15;
    else if (visibility < 5) visibilityRisk = 0.05;

    // WIND RISK (crosswind danger for high-profile vehicles)
    let windRisk = 0;
    if (windGust > 45) windRisk = 0.4;
    else if (windGust > 35) windRisk = 0.25;
    else if (windGust > 25) windRisk = 0.1;

    // SEVERE WEATHER CODES (WMO)
    const isThunderstorm = weatherCode >= 95 && weatherCode <= 99;
    const isHeavyPrecip = weatherCode >= 65 && weatherCode <= 67;
    const isSleetOrFreezing = weatherCode >= 66 && weatherCode <= 67;
    const isSnow = weatherCode >= 71 && weatherCode <= 77;
    const isFog = weatherCode >= 45 && weatherCode <= 48;
    const isDrizzle = weatherCode >= 51 && weatherCode <= 55;
    const isStormCell = precip > 0.05 || isThunderstorm || isHeavyPrecip || weatherCode === 82;

    // DETERMINE HAZARD AND RISK
    if (temp <= 28) {
      currentPointRisk = Math.min(1.0, (0.7 + visibilityRisk + windRisk) * nightRiskMultiplier);
      currentHazard = 'Black Ice';
      currentMsg = 'Critical alert: Severe black ice conditions. Traction severely compromised.';
    } else if (isSleetOrFreezing || (temp <= 35 && precip > 0)) {
      currentPointRisk = Math.min(1.0, (0.85 + visibilityRisk) * nightRiskMultiplier);
      currentHazard = 'Freezing Rain';
      currentMsg = 'Severe warning: Freezing rain detected. Roads are extremely hazardous.';
    } else if (isThunderstorm) {
      currentPointRisk = Math.min(1.0, (0.75 + windRisk + visibilityRisk) * nightRiskMultiplier);
      currentHazard = 'Thunderstorm';
      currentMsg = 'Severe weather: Thunderstorm with lightning. Consider delaying travel.';
    } else if (isStormCell) {
      currentPointRisk = Math.min(1.0, (0.65 + windRisk + visibilityRisk) * nightRiskMultiplier);
      currentHazard = 'Storm Cell';
      currentMsg = 'Caution: Heavy precipitation and storm cells along this path.';
    } else if (isSnow) {
      currentPointRisk = Math.min(1.0, (0.55 + visibilityRisk) * nightRiskMultiplier);
      currentHazard = 'Snow';
      currentMsg = 'Weather update: Snowfall reducing visibility and traction.';
    } else if (windGust > 35) {
      currentPointRisk = Math.min(1.0, (0.5 + windRisk) * nightRiskMultiplier);
      currentHazard = 'High Winds';
      currentMsg = 'Safety warning: High wind gusts detected. Maintain firm steering control.';
    } else if (isFog || visibility < 2) {
      currentPointRisk = Math.min(1.0, (0.4 + visibilityRisk) * nightRiskMultiplier);
      currentHazard = 'Low Visibility';
      currentMsg = 'Caution: Reduced visibility due to fog or mist.';
    } else if (precip > 0 || isDrizzle) {
      currentPointRisk = Math.min(1.0, (0.3 + visibilityRisk) * nightRiskMultiplier);
      currentHazard = 'Slick Roads';
      currentMsg = 'Weather update: Light precipitation detected. Roads may be slick.';
    }

    if (currentPointRisk > maxRisk) {
      maxRisk = currentPointRisk;
      hazardType = currentHazard;
      ttsMessage = currentMsg;
    }

    totalRiskScore += currentPointRisk;

    if (precip > maxPrecip) {
      maxPrecip = precip;
      worstPoint = { lat: point.lat, lng: point.lng };
    }
  });

  // Weighted average: max risk matters most, but overall route conditions factor in
  const avgRisk = totalRiskScore / weatherDataPoints.length;
  const combinedRisk = maxRisk * 0.7 + avgRisk * 0.3;

  const finalSSI = Math.round(Math.max(0, (1.0 - combinedRisk) * 100));

  let category = 'Optimal';
  let color = '#22c55e';

  if (finalSSI <= 30) {
    category = 'Critical';
    color = '#ef4444';
  } else if (finalSSI <= 55) {
    category = 'Severe';
    color = '#f97316';
  } else if (finalSSI <= 70) {
    category = 'Caution';
    color = '#eab308';
  } else if (finalSSI <= 85) {
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

  if (temp <= 32) {
    risk = 0.8;
    hazard = 'Ice Risk';
  } else if (precipitationIntensity > 0.05 || (weatherCode >= 65 && weatherCode <= 67)) {
    risk = 0.6;
    hazard = 'Heavy Rain';
  } else if (windSpeed > 30) {
    risk = 0.4;
    hazard = 'High Winds';
  } else if (precipitationIntensity > 0) {
    risk = 0.25;
    hazard = 'Light Rain';
  }

  return { ssi: Math.round((1 - risk) * 100), hazard };
};
