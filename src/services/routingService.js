// src/services/routingService.js

/**
 * Fetches alternative routes from Mapbox Directions API.
 * @param {Array|Object} start - [lng, lat] or { lat, lng } or { latitude, longitude }
 * @param {Array|Object} end - [lng, lat] or { lat, lng } or { latitude, longitude }
 * @returns {Promise<Array>} Array of route objects with GeoJSON geometries
 */

const formatCoords = (c) => {
  if (!c) throw new Error("Coordinate is required");
  if (Array.isArray(c)) {
    // Validate: must be [lng, lat] with valid numbers
    if (c.length < 2 || typeof c[0] !== "number" || typeof c[1] !== "number") {
      throw new Error(`Invalid array coordinates: ${JSON.stringify(c)}`);
    }
    return `${c[0]},${c[1]}`;
  }
  // Object: extract lat/lng with fallback
  const lat = c.lat ?? c.latitude ?? c.y;
  const lng = c.lng ?? c.longitude ?? c.x;
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error(`Invalid object coordinates: ${JSON.stringify(c)}`);
  }
  return `${lng},${lat}`;
};

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

/**
 * Fetch route data from Mapbox Directions API.
 * @param {string} coordinates formatted "lng,lat;lng,lat"
 * @param {string} profile Mapbox routing profile
 * @param {Object} opts optional parameters
 * @returns {Promise<Object>} Mapbox directions response
 */
const fetchMapboxDirections = async (coordinates, profile = "driving-traffic", opts = {}) => {
  if (!MAPBOX_TOKEN) {
    throw new Error("Mapbox token not found in environment variables.");
  }

  const params = new URLSearchParams({
    alternatives: opts.alternatives ? "true" : "false",
    geometries: "geojson",
    overview: "full",
    steps: opts.steps !== false ? "true" : "false",
    annotations: "congestion,closure,duration,distance,speed",
    access_token: MAPBOX_TOKEN,
  });

  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?${params.toString()}`;

  let retries = 0;
  const MAX_RETRIES = 2;
  while (retries <= MAX_RETRIES) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const text = await res.text();
        let errorData;
        try { errorData = JSON.parse(text); } catch { errorData = { message: text }; }
        console.error("Mapbox API Error Details:", errorData);
        throw new Error(`Mapbox API error: ${res.statusText} (${res.status})`);
      }
      return await res.json();
    } catch (error) {
      if (retries === MAX_RETRIES) throw error;
      retries++;
      // Exponential backoff: 500ms, then 1500ms
      await new Promise((r) => setTimeout(r, 500 * retries));
    }
  }
  return null;
};

export const getRoutes = async (start, end, profile = "driving-traffic") => {
  const coordinates = `${formatCoords(start)};${formatCoords(end)}`;
  const data = await fetchMapboxDirections(coordinates, profile, { alternatives: true, steps: true });

  if (!data?.routes || data.routes.length === 0) {
    return [];
  }

  // Normalize: Mapbox returns [lng, lat], ensure no empty geometries
  return data.routes
    .filter((route) => route.geometry?.coordinates?.length >= 2)
    .map((route) => {
      // Keep coordinates as-is (they're already [lng, lat])
      const normalized = {
        ...route,
        geometry: route.geometry,
        // Inject per-step data for turn-by-turn if available
        steps: route.legs?.flatMap((leg) => leg.steps || []) || [],
        // Summary for quick display
        duration: route.duration || 0,
        distance: route.distance || 0,
      };
      return normalized;
    });
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
  const [trafficRoutes = [], freeRoutes = []] = await Promise.all([
    getRoutes(start, end, "driving-traffic").catch((err) => {
      console.warn("[Swerve] Traffic route fetch failed:", err.message);
      return [];
    }),
    getRoutes(start, end, "driving").catch((err) => {
      console.warn("[Swerve] Driving route fetch failed:", err.message);
      return [];
    }),
  ]);

  const all = [...trafficRoutes, ...freeRoutes];

  // Deduplicate: two routes with distance within 200 m of each other are the same road
  const seen = new Map();
  return all.filter((r) => {
    const bucket = Math.round((r.distance || 0) / 200);
    const key = `${bucket}-${Math.round(r.duration || 0)}`; // Also bucket by duration for better dedup
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });
};

/**
 * Lightweight ETA-only fetch — returns { duration (seconds), distance (meters) } for a single profile.
 * Uses geometries=false, steps=false, alternatives=false to minimise response size.
 */
export const getRouteDuration = async (start, end, profile = "driving") => {
  if (!MAPBOX_TOKEN) return null;

  try {
    const coordinates = `${formatCoords(start)};${formatCoords(end)}`;
    const params = new URLSearchParams({
      geometries: "polyline",
      steps: "false",
      alternatives: "false",
      overview: "false",
      access_token: MAPBOX_TOKEN,
    });
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes?.[0]) return null;
    // Handle ambiguous geometries
    const route = data.routes[0];
    if (!route.duration || route.duration <= 0 || !route.distance || route.distance <= 0) {
      return null;
    }
    return { duration: route.duration, distance: route.distance };
  } catch (err) {
    console.warn("[Swerve] ETA fetch failed:", err.message);
    return null;
  }
};

/**
 * Extensibility: multi-stop waypoint route with chronology.
 * @param {Array<Object>} waypoints [{coord, label?}, ...]
 * @param {string} profile
 */
export const getMultiStopRoute = async (waypoints, profile = "driving-traffic") => {
  if (!waypoints || waypoints.length < 2) {
    throw new Error("At least 2 waypoints required");
  }
  const coordinates = waypoints.map((wp) => formatCoords(wp.coord)).join(";");
  const data = await fetchMapboxDirections(coordinates, profile, { alternatives: false, steps: true });
  return data?.routes || [];
};
