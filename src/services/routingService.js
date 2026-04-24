// src/services/routingService.js

/**
 * Fetches alternative routes from Mapbox Directions API.
 * @param {Array|Object} start - [lng, lat] or { lat, lng } or { latitude, longitude }
 * @param {Array|Object} end - [lng, lat] or { lat, lng } or { latitude, longitude }
 * @returns {Promise<Array>} Array of route objects with GeoJSON geometries
 */
const formatCoords = (c) => {
  if (Array.isArray(c)) return `${c[0]},${c[1]}`;
  const lat = c.lat || c.latitude || c.y;
  const lng = c.lng || c.longitude || c.x;
  return `${lng},${lat}`;
};

export const getRoutes = async (start, end, profile = 'driving-traffic') => {
  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  if (!mapboxToken) {
    throw new Error("Mapbox token not found in environment variables.");
  }

  const coordinates = `${formatCoords(start)};${formatCoords(end)}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?alternatives=true&geometries=geojson&overview=full&annotations=congestion,closure&access_token=${mapboxToken}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Mapbox API Error Details:", errorData);
      throw new Error(`Mapbox API error: ${response.statusText} (${response.status})`);
    }
    const data = await response.json();
    
    if (data.routes) {
      data.routes.forEach(route => {
        if (route.geometry && route.geometry.coordinates) {
          const fixedCoords = route.geometry.coordinates.map(c => [c[0], c[1]]);
          route.geometry.coordinates = fixedCoords;
        }
      });
    }
    
    return data.routes || [];
  } catch (error) {
    console.error("Error fetching routes from Mapbox:", error);
    throw error;
  }
};

/**
 * Fetches routes for Adventure Mode.
 * Requests both driving-traffic and driving (non-traffic) profiles in parallel, then
 * merges unique alternatives. The driving profile often surfaces more scenic surface
 * roads that the traffic-optimised profile hides behind highways.
 *
 * Deduplicates by distance bucket (200 m) to avoid scoring the same road twice.
 *
 * @returns {Promise<Array>} Up to 6 merged, deduplicated route objects
 */
export const getAdventureRoutes = async (start, end) => {
  const [trafficRoutes, freeRoutes] = await Promise.all([
    getRoutes(start, end, 'driving-traffic').catch(() => []),
    getRoutes(start, end, 'driving').catch(() => []),
  ]);

  const all = [...(trafficRoutes || []), ...(freeRoutes || [])];

  // Deduplicate: two routes with distance within 200 m of each other are the same road
  const seen = new Set();
  return all.filter((r) => {
    const bucket = Math.round((r.distance || 0) / 200);
    if (seen.has(bucket)) return false;
    seen.add(bucket);
    return true;
  });
};

/**
 * Lightweight ETA-only fetch — returns { duration (seconds), distance (meters) } for a single profile.
 * Uses geometries=false, steps=false, alternatives=false to minimise response size.
 */
export const getRouteDuration = async (start, end, profile = 'driving') => {
  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  if (!mapboxToken) return null;

  try {
    const coordinates = `${formatCoords(start)};${formatCoords(end)}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?geometries=polyline&steps=false&alternatives=false&overview=false&access_token=${mapboxToken}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes?.length) return null;
    return { duration: data.routes[0].duration, distance: data.routes[0].distance };
  } catch {
    return null;
  }
};
