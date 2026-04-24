/**
 * Swerve Traffic Gradient Builder
 *
 * Builds a Mapbox line-gradient expression with CRISP color boundaries
 * at segment edges — no color smear between adjacent congestion levels.
 *
 * Requires the source to be created with `lineMetrics: true`.
 */
import { colorForCongestion, TRAFFIC_COLORS } from '../design/traffic';

const SOLID_CYAN = [
  'interpolate', ['linear'], ['line-progress'],
  0, TRAFFIC_COLORS.unknown,
  1, TRAFFIC_COLORS.unknown,
];

/**
 * Build a Mapbox line-gradient expression from per-segment data.
 * @param {number[]} distances   per-segment distances in meters (length = coords - 1)
 * @param {number[]} congestion  per-segment congestion_numeric (0–100, 0 = unknown)
 * @returns {Array}  Mapbox paint expression for line-gradient
 */
export function buildTrafficGradient(distances, congestion) {
  if (!distances?.length || !congestion?.length) return SOLID_CYAN;

  const total = distances.reduce((a, b) => a + b, 0);
  if (total === 0) return SOLID_CYAN;

  const EPSILON = 0.0005; // crisp boundary — hold previous color to just before the edge
  const stops = [];
  let acc = 0;

  // First stop at t=0 using first segment's color
  stops.push([0, colorForCongestion(congestion[0])]);

  for (let i = 0; i < distances.length; i++) {
    acc += distances[i];
    const t = Math.min(acc / total, 1);
    const color = colorForCongestion(congestion[i]);
    const [prevT, prevColor] = stops[stops.length - 1];

    if (color === prevColor) {
      // Extend current run forward (avoids stop explosion on long uniform segments)
      stops[stops.length - 1] = [t, color];
    } else {
      // Crisp boundary: hold previous color right up to the edge, then jump
      const boundaryT = Math.max(t - EPSILON, prevT + EPSILON / 2);
      if (boundaryT > prevT) stops.push([boundaryT, prevColor]);
      stops.push([t, color]);
    }
  }

  // Guarantee a final stop at t=1
  if (stops[stops.length - 1][0] < 1) {
    stops.push([1, stops[stops.length - 1][1]]);
  }

  // Build Mapbox interpolate expression
  const expr = ['interpolate', ['linear'], ['line-progress']];
  for (const [t, c] of stops) expr.push(t, c);
  return expr;
}

/**
 * Convert a solid hex color to a Mapbox line-gradient expression.
 * Used for non-driving profiles (bike/walk) and SSI-based fallback.
 */
export function solidColorGradient(color) {
  return ['interpolate', ['linear'], ['line-progress'], 0, color, 1, color];
}
