/**
 * Swerve Directions API Client
 *
 * Wraps the Mapbox Directions v5 API with traffic-aware annotations.
 * Returns normalized route objects with per-segment congestion data
 * aligned to the route geometry coordinates array.
 */

const MAPBOX_TOKEN =
  process.env.REACT_APP_MAPBOX_TOKEN ||
  process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ||
  process.env.MAPBOX_ACCESS_TOKEN;

/**
 * Request a traffic-aware route from Mapbox Directions.
 *
 * @param {[number, number]} origin   [lng, lat]
 * @param {[number, number]} dest     [lng, lat]
 * @param {object} opts
 * @param {'driving-traffic'|'driving'|'cycling'|'walking'} [opts.profile]
 * @param {boolean} [opts.alternatives]
 * @param {Array<[number,number]>} [opts.exclude]  points to avoid (reroute around incident)
 * @returns {Promise<NormalizedRoute[]>}
 */
export async function fetchRoute(origin, dest, opts = {}) {
  const profile = opts.profile ?? 'driving-traffic';
  const coords = `${origin[0]},${origin[1]};${dest[0]},${dest[1]}`;

  const params = new URLSearchParams({
    geometries:  'geojson',
    overview:    'full',        // CRITICAL — simplified geometry breaks annotation alignment
    steps:       'true',
    annotations: 'congestion_numeric,congestion,duration,distance,speed',
    alternatives: opts.alternatives ? 'true' : 'false',
    access_token: MAPBOX_TOKEN,
  });

  if (opts.exclude?.length) {
    params.set(
      'exclude',
      opts.exclude.map(([lng, lat]) => `point(${lng} ${lat})`).join(',')
    );
  }

  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}?${params}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Mapbox Directions ${r.status}: ${await r.text()}`);

  const data = await r.json();
  if (!data.routes?.length) throw new Error('No routes found');

  return data.routes.map((route) => normalizeRoute(route, profile));
}

/**
 * Flatten multi-leg annotations into single arrays aligned with route coordinates.
 * Each leg shares a coordinate with the next, so annotation arrays are length = coords - 1.
 */
function normalizeRoute(route, profile) {
  const coords = route.geometry.coordinates;
  const congestion = [];
  const distances  = [];
  const durations  = [];
  const speeds     = [];

  for (const leg of route.legs) {
    const a = leg.annotation ?? {};
    congestion.push(...(a.congestion_numeric ?? []));
    distances.push( ...(a.distance          ?? []));
    durations.push( ...(a.duration          ?? []));
    speeds.push(    ...(a.speed             ?? []));
  }

  // Sanity check — mismatch here means silent visual misalignment
  if (congestion.length && congestion.length !== coords.length - 1) {
    console.warn(
      `[directions] Annotation length mismatch: ${congestion.length} annotations ` +
      `vs ${coords.length - 1} segments. Profile: ${profile}`
    );
  }

  return {
    geometry:    route.geometry,
    coordinates: coords,
    congestion,
    distances,
    durations,
    speeds,
    duration:    route.duration,
    distance:    route.distance,
    legs:        route.legs,
    profile,
  };
}
