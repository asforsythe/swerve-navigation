// src/services/weatherService.js
import length from "@turf/length";
import along from "@turf/along";

/**
 * Fetches weather data for points sampled along the route geometry.
 * Enhanced with visibility, humidity, and comprehensive WMO code mapping.
 * @param {Object} routeGeometry - GeoJSON geometry of the route (LineString)
 * @returns {Promise<Array>} Array of weather data points
 */
export const getSafetyWeatherForRoute = async (routeGeometry) => {
  try {
    if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.coordinates.length < 2) {
      console.warn("[Swerve Weather] Invalid route geometry");
      return [];
    }

    const routeLengthKm = length(routeGeometry, { units: "kilometers" });
    // Cap points to stay within Open-Meteo URL limits (~2000 chars).
    // Open-Meteo supports comma-separated lat/lng up to ~100 coords.
    const MAX_POINTS = 15; // Conservative to avoid URL length issues
    const MIN_INTERVAL_KM = 8; // Minimum sample interval
    const intervalKm = Math.max(MIN_INTERVAL_KM, routeLengthKm / MAX_POINTS);
    const samplePoints = [];

    for (let d = 0; d <= routeLengthKm; d += intervalKm) {
      const pt = along(routeGeometry, d, { units: "kilometers" });
      if (pt?.geometry?.coordinates) {
        samplePoints.push(pt.geometry.coordinates);
      }
    }

    // Always include the destination
    try {
      const dest = along(routeGeometry, routeLengthKm, { units: "kilometers" });
      if (dest?.geometry?.coordinates) {
        const last = samplePoints[samplePoints.length - 1];
        const dx = Math.abs((last?.[0] ?? 0) - dest.geometry.coordinates[0]);
        const dy = Math.abs((last?.[1] ?? 0) - dest.geometry.coordinates[1]);
        // Only add if more than 100m off from last point
        if (dx > 0.001 || dy > 0.001) {
          samplePoints.push(dest.geometry.coordinates);
        }
      }
    } catch (_e) {
      // Ignore turf along errors near end
    }

    if (samplePoints.length === 0) return [];

    // Validate all points have valid coordinates
    const validPoints = samplePoints.filter(
      (p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])
    );
    if (validPoints.length === 0) return [];

    const lats = validPoints.map((p) => p[1].toFixed(4)).join(",");
    const lngs = validPoints.map((p) => p[0].toFixed(4)).join(",");

    // Open-Meteo Batch Fetch with enhanced params
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}` +
      "&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_gusts_10m,relative_humidity_2m,visibility" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch";

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      // Short timeout to avoid hanging UI
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      throw new Error(`Open-Meteo API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    // Open-Meteo batch returns array when multiple coords
    const results = Array.isArray(data) ? data : [data];

    // If we got fewer results than points, pad with nearest neighbors
    while (results.length < validPoints.length) {
      results.push(results[results.length - 1] || { current: {} });
    }

    return results.map((result, index) => {
      const current = result?.current || {};
      const pt = validPoints[index];
      return {
        lat: pt?.[1] ?? 0,
        lng: pt?.[0] ?? 0,
        precipitationIntensity: parseFloat(current.precipitation ?? 0) || 0,
        weatherCode: parseInt(current.weather_code ?? 0, 10) || 0,
        windGust: parseFloat(current.wind_gusts_10m ?? 0) || 0,
        wind_speed_10m: parseFloat(current.wind_speed_10m ?? 0) || 0,
        roadSurfaceTemperature: parseFloat(current.apparent_temperature ?? current.temperature_2m ?? 15) || 15,
        temperature_2m: parseFloat(current.temperature_2m ?? 15) || 15,
        relativeHumidity: parseFloat(current.relative_humidity_2m ?? 50) || 50,
        visibility: current.visibility ? parseFloat(current.visibility) / 1000 : 10, // convert meters to km
        timestamp: Date.now(),
      };
    });
  } catch (error) {
    console.error("[Swerve Weather] Error fetching path weather:", error);
    return [];
  }
};

/**
 * Get WMO weather code description.
 * @param {number} code - WMO weather code
 * @param {Object} extra — optional extra metadata (wind, precip)
 * @returns {Object} { description, severity, icon }
 */
export const getWeatherCodeDescription = (code, extra = {}) => {
  const codes = {
    0: { desc: "Clear sky", severity: 0 },
    1: { desc: "Mainly clear", severity: 0 },
    2: { desc: "Partly cloudy", severity: 0 },
    3: { desc: "Overcast", severity: 1 },
    45: { desc: "Fog", severity: 2 },
    48: { desc: "Depositing rime fog", severity: 3 },
    51: { desc: "Light drizzle", severity: 1 },
    53: { desc: "Moderate drizzle", severity: 2 },
    55: { desc: "Dense drizzle", severity: 3 },
    56: { desc: "Light freezing drizzle", severity: 4 },
    57: { desc: "Dense freezing drizzle", severity: 5 },
    61: { desc: "Slight rain", severity: 1 },
    63: { desc: "Moderate rain", severity: 2 },
    65: { desc: "Heavy rain", severity: 3 },
    66: { desc: "Light freezing rain", severity: 5 },
    67: { desc: "Heavy freezing rain", severity: 5 },
    71: { desc: "Slight snow fall", severity: 2 },
    73: { desc: "Moderate snow fall", severity: 3 },
    75: { desc: "Heavy snow fall", severity: 4 },
    77: { desc: "Snow grains", severity: 2 },
    80: { desc: "Slight rain showers", severity: 1 },
    81: { desc: "Moderate rain showers", severity: 2 },
    82: { desc: "Violent rain showers", severity: 4 },
    85: { desc: "Slight snow showers", severity: 2 },
    86: { desc: "Heavy snow showers", severity: 3 },
    95: { desc: "Thunderstorm", severity: 4 },
    96: { desc: "Thunderstorm with slight hail", severity: 5 },
    99: { desc: "Thunderstorm with heavy hail", severity: 5 },
  };

  const base = codes[code] || { desc: "Unknown", severity: 0 };

  // Override with extra context
  let finalDesc = base.desc;
  if (extra.windSpeed > 45) {
    finalDesc += " with damaging winds";
  } else if (extra.windSpeed > 30) {
    finalDesc += " with strong winds";
  }
  if (extra.precip > 0.3) {
    finalDesc += " — flash flooding risk";
  }

  return {
    description: finalDesc,
    severity: base.severity,
    iconCode: code,
  };
};

/**
 * Single-point current weather fetch (for non-route contexts).
 * @param {{lat:number,lng:number}|Array} coord
 * @returns {Promise<Object|null>}
 */
export const getCurrentWeather = async (coord) => {
  try {
    let lat, lng;
    if (Array.isArray(coord)) {
      [lng, lat] = coord;
    } else {
      lat = coord.lat ?? coord.latitude;
      lng = coord.lng ?? coord.longitude;
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      throw new Error("Invalid coordinates");
    }

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
      "&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m,visibility,cloud_cover,surface_pressure" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch";

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error("Open-Meteo fetch failed");
    const data = await res.json();
    const cur = data?.current || {};
    return {
      temp: cur.temperature_2m,
      feelsLike: cur.apparent_temperature,
      precipitationIntensity: cur.precipitation,
      windSpeed: cur.wind_speed_10m,
      windDirection: cur.wind_direction_10m,
      windGusts: cur.wind_gusts_10m,
      humidity: cur.relative_humidity_2m,
      visibility: cur.visibility ? cur.visibility / 1000 : 10,
      cloudCover: cur.cloud_cover,
      pressure: cur.surface_pressure,
      weatherCode: cur.weather_code,
      timestamp: Date.now(),
    };
  } catch (e) {
    console.error("[Swerve Weather] Current weather error:", e);
    return null;
  }
};
