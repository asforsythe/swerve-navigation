// src/services/weatherService.js
import length from '@turf/length';
import along from '@turf/along';

/**
 * Fetches weather data for points sampled along the route geometry.
 * Enhanced with visibility, humidity, and comprehensive WMO code mapping.
 * @param {Object} routeGeometry - GeoJSON geometry of the route (LineString)
 * @returns {Promise<Array>} Array of weather data points
 */
export const getSafetyWeatherForRoute = async (routeGeometry) => {
  try {
    const routeLengthKm = length(routeGeometry, { units: 'kilometers' });
    // Cap at 20 points regardless of route length to stay within URL limits.
    // A 4000km cross-country route uses 200km intervals; a 50km local route uses 16km.
    const MAX_POINTS = 20;
    const intervalKm = Math.max(16, routeLengthKm / MAX_POINTS);
    const samplePoints = [];

    for (let d = 0; d <= routeLengthKm; d += intervalKm) {
      samplePoints.push(along(routeGeometry, d, { units: 'kilometers' }).geometry.coordinates);
    }
    // Always include the destination
    const lastSampled = samplePoints[samplePoints.length - 1];
    const dest = along(routeGeometry, routeLengthKm, { units: 'kilometers' }).geometry.coordinates;
    if (lastSampled[0] !== dest[0] || lastSampled[1] !== dest[1]) {
      samplePoints.push(dest);
    }

    if (samplePoints.length === 0) return [];

    const lats = samplePoints.map((p) => p[1]).join(',');
    const lngs = samplePoints.map((p) => p[0]).join(',');

    // Open-Meteo Batch Fetch with enhanced params
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_gusts_10m,relative_humidity_2m,visibility&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo API error: ${res.statusText}`);
    }

    const data = await res.json();
    const results = Array.isArray(data) ? data : [data];

    return results.map((result, index) => {
      const current = result.current || {};
      return {
        lat: samplePoints[index]?.[1] || 0,
        lng: samplePoints[index]?.[0] || 0,
        precipitationIntensity: current.precipitation || 0,
        weatherCode: current.weather_code || 0,
        windGust: current.wind_gusts_10m || 0,
        wind_speed_10m: current.wind_speed_10m || 0,
        roadSurfaceTemperature: current.apparent_temperature || current.temperature_2m || 15,
        temperature_2m: current.temperature_2m || 15,
        relativeHumidity: current.relative_humidity_2m || 50,
        visibility: current.visibility ? current.visibility / 1000 : 10, // convert meters to km
      };
    });
  } catch (error) {
    console.error('[Swerve Weather] Error fetching path weather:', error);
    return [];
  }
};

/**
 * Get WMO weather code description.
 * @param {number} code - WMO weather code
 * @returns {string} Human-readable description
 */
export const getWeatherCodeDescription = (code) => {
  const codes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return codes[code] || 'Unknown';
};
