/**
 * Swerve Traffic Design Tokens
 *
 * Single source-of-truth for all traffic congestion colors.
 * Mirrored in tailwind.config.js under theme.extend.colors.traffic.*
 */

export const TRAFFIC_COLORS = {
  unknown:   '#00E5FF',   // brand cyan — fall back when no congestion data
  free:      '#22E07A',   // green, slightly cyan-leaning for palette harmony
  moderate:  '#FFD24D',   // warm yellow
  heavy:     '#FF8A3D',   // burnt orange — "slow down"
  severe:    '#FF3B5C',   // alert red
  incident:  '#FF1744',   // reserved for incident-affected segments
};

/**
 * Maps Mapbox's congestion_numeric (0–100) to a traffic color.
 * IMPORTANT: 0 means "unknown" (no data), NOT free-flow.
 * Don't render 0 as green — it would lie to drivers in rural/no-coverage areas.
 */
export function colorForCongestion(n) {
  if (n === 0 || n == null) return TRAFFIC_COLORS.unknown;
  if (n <= 25)  return TRAFFIC_COLORS.free;
  if (n <= 50)  return TRAFFIC_COLORS.moderate;
  if (n <= 75)  return TRAFFIC_COLORS.heavy;
  return TRAFFIC_COLORS.severe;
}

/**
 * Compute what fraction of the route falls in each congestion bucket.
 * @param {number[]} congestion  per-segment congestion_numeric values
 * @param {number[]} distances   per-segment distances in meters
 * @returns {{ free, moderate, heavy, severe, unknown } | null}  fractions 0–1
 */
export function computeBuckets(congestion, distances) {
  if (!congestion?.length || !distances?.length) return null;

  const buckets = { free: 0, moderate: 0, heavy: 0, severe: 0, unknown: 0 };
  let total = 0;

  for (let i = 0; i < congestion.length; i++) {
    const d = distances[i] ?? 0;
    total += d;
    const n = congestion[i];
    if (n === 0 || n == null) buckets.unknown += d;
    else if (n <= 25) buckets.free += d;
    else if (n <= 50) buckets.moderate += d;
    else if (n <= 75) buckets.heavy += d;
    else buckets.severe += d;
  }

  if (total === 0) return null;

  return Object.fromEntries(
    Object.entries(buckets).map(([k, v]) => [k, v / total])
  );
}

/**
 * Returns the dominant traffic condition label for a route.
 * Used in alternatives pill tags ("Mostly clear", "Heavy 18mi").
 */
export function dominantCondition(buckets) {
  if (!buckets) return 'Unknown';
  if (buckets.severe  > 0.15) return 'Severe';
  if (buckets.heavy   > 0.20) return 'Heavy';
  if (buckets.moderate > 0.30) return 'Moderate';
  if (buckets.unknown > 0.50) return 'No data';
  return 'Mostly clear';
}
