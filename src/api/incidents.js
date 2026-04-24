/**
 * Swerve Incidents API Client
 *
 * Fetches traffic incident data via the server-side HERE proxy at /api/here/incidents.
 * The HERE API key is NEVER exposed in the client bundle — all requests are proxied.
 *
 * Gracefully degrades to [] when HERE is not configured (503 from proxy) or on any error.
 */

export const INCIDENT_TYPES = {
  accident:        { color: '#FF1744', icon: '💥', flashRoute: true,  autoReroute: false },
  roadClosure:     { color: '#FF1744', icon: '🚫', flashRoute: true,  autoReroute: true  },
  construction:    { color: '#FFB020', icon: '🚧', flashRoute: false, autoReroute: false },
  disabledVehicle: { color: '#FF8A3D', icon: '🚗', flashRoute: true,  autoReroute: false },
  laneRestriction: { color: '#FF8A3D', icon: '➖', flashRoute: true,  autoReroute: false },
  plannedEvent:    { color: '#FFD24D', icon: '📅', flashRoute: false, autoReroute: false },
  massTransit:     { color: '#FFD24D', icon: '🚇', flashRoute: false, autoReroute: false },
  weather:         { color: '#5EB8FF', icon: '🌧', flashRoute: false, autoReroute: false },
  other:           { color: '#FFD24D', icon: '⚠️',  flashRoute: false, autoReroute: false },
};

export function getIncidentStyle(type) {
  return INCIDENT_TYPES[type] ?? INCIDENT_TYPES.other;
}

/**
 * Fetch incidents for a bounding box via Express proxy.
 * @param {string} bbox  "west,south,east,north"
 * @returns {Promise<NormalizedIncident[]>}  empty on any failure
 */
export async function fetchIncidents(bbox) {
  try {
    const r = await fetch(`/api/here/incidents?bbox=${encodeURIComponent(bbox)}`);

    if (!r.ok) {
      if (r.status === 503) return []; // HERE key not configured — silent
      console.warn(`[incidents] HTTP ${r.status}`);
      return [];
    }

    const data = await r.json();
    return (data.results ?? []).map(normalizeIncident).filter(Boolean);
  } catch (err) {
    console.warn('[incidents] fetch failed:', err.message);
    return [];
  }
}

function normalizeIncident(raw) {
  const d = raw.incidentDetails;
  if (!d) return null;

  // HERE v7 geometry: location.shape.links → array of polylines
  const links = raw.location?.shape?.links ?? [];
  const coords = links.flatMap((l) =>
    (l.points ?? []).map((p) => [p.lng, p.lat])
  );
  if (!coords.length) return null;

  return {
    id:          d.id,
    type:        d.type,
    subtype:     d.subtype,
    criticality: d.criticality,   // 0–3 in HERE v7 (NOT 0–5 like v6)
    description: d.description?.value,
    summary:     d.summary?.value,
    startTime:   d.startTime,
    endTime:     d.endTime,
    roadClosed:  d.roadClosed,
    coordinates: coords,
    centroid:    centroidOf(coords),
  };
}

function centroidOf(coords) {
  const n = coords.length;
  const [sx, sy] = coords.reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
  return [sx / n, sy / n];
}
