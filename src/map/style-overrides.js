/**
 * Swerve Map Style Overrides
 * Applied after every map style.load event.
 * Gives the dark-v11 base a cinematic look:
 * — Deep atmosphere fog
 * — Muted roads with rose/cyan accent on primary streets
 * — Building extrusion with subtle tint
 * — Suppressed labels that clash with UI
 *
 * Usage:
 *   import { applyStyleOverrides } from '../map/style-overrides';
 *   map.on('style.load', () => applyStyleOverrides(map, { theme }));
 */

/**
 * Apply all visual overrides to a loaded Mapbox map.
 * @param {mapboxgl.Map} map
 * @param {{ theme?: 'dark' | 'light' }} opts
 */
export function applyStyleOverrides(map, { theme = 'dark' } = {}) {
  if (!map || !map.isStyleLoaded()) return;

  const isDark = theme === 'dark';

  // ── Atmosphere / Fog ─────────────────────────────────────────────────────
  try {
    map.setFog({
      color:            isDark ? 'rgba(8, 8, 16, 0.85)'  : 'rgba(220,230,255,0.6)',
      'high-color':     isDark ? 'rgba(12, 12, 28, 0.95)' : 'rgba(180,200,240,0.8)',
      'horizon-blend':  0.04,
      'space-color':    isDark ? '#050508' : '#c8d8f0',
      'star-intensity': isDark ? 0.25 : 0,
    });
  } catch (_) { /* fog not available on all GL versions */ }

  // ── Road color overrides (dark theme only) ────────────────────────────────
  if (isDark) {
    const roadTweaks = [
      // Motorways — subtle rose glow to signal they're the "fast" network
      { id: 'road-motorway-trunk',    color: 'rgba(180, 48, 72, 0.70)', width: [1.5, 3.5] },
      { id: 'road-motorway-trunk-bg', color: 'rgba(120, 20, 40, 0.60)', width: [2.0, 5.0] },
      { id: 'road-primary',           color: 'rgba(50,  60,  80, 0.80)', width: [0.8, 2.5] },
      { id: 'road-primary-bg',        color: 'rgba(20,  24,  36, 0.90)', width: [1.5, 4.0] },
      { id: 'road-secondary-tertiary',color: 'rgba(28,  32,  48, 0.85)', width: [0.5, 2.0] },
      { id: 'road-street',            color: 'rgba(18,  20,  30, 0.90)', width: [0.3, 1.5] },
      { id: 'road-pedestrian',        color: 'rgba(14,  16,  24, 0.70)', width: [0.3, 1.0] },
    ];

    roadTweaks.forEach(({ id, color, width }) => {
      if (!map.getLayer(id)) return;
      try {
        map.setPaintProperty(id, 'line-color', color);
        if (width) {
          map.setPaintProperty(id, 'line-width', [
            'interpolate', ['linear'], ['zoom'],
            8, width[0], 16, width[1],
          ]);
        }
      } catch (_) {}
    });

    // Building extrusion — dark teal tint at street level
    if (map.getLayer('building')) {
      try {
        map.setPaintProperty('building', 'fill-color', 'rgba(12,14,22,0.95)');
        map.setPaintProperty('building', 'fill-opacity', 0.9);
      } catch (_) {}
    }

    // 3D buildings if present
    if (map.getLayer('building-extrusion')) {
      try {
        map.setPaintProperty('building-extrusion', 'fill-extrusion-color', [
          'interpolate', ['linear'], ['zoom'],
          12, 'rgba(12, 14, 22, 0.85)',
          16, 'rgba(18, 22, 40, 0.90)',
        ]);
        map.setPaintProperty('building-extrusion', 'fill-extrusion-opacity', 0.75);
        map.setPaintProperty('building-extrusion', 'fill-extrusion-vertical-gradient', true);
      } catch (_) {}
    }

    // Water — deeper navy
    ['water', 'water-shadow'].forEach((id) => {
      if (!map.getLayer(id)) return;
      try { map.setPaintProperty(id, 'fill-color', 'rgba(8, 14, 32, 0.95)'); } catch (_) {}
    });

    // Parks — very muted dark green
    ['landuse', 'landuse-park'].forEach((id) => {
      if (!map.getLayer(id)) return;
      try { map.setPaintProperty(id, 'fill-color', 'rgba(10, 18, 14, 0.70)'); } catch (_) {}
    });
  }

  // ── Label opacity (reduce visual noise) ───────────────────────────────────
  const labelLayers = [
    'road-label',
    'road-number-shield',
    'motorway-junction',
    'poi-label',
    'place-village',
  ];
  labelLayers.forEach((id) => {
    if (!map.getLayer(id)) return;
    try {
      const type = map.getLayer(id).type;
      const opacityProp = type === 'symbol' ? 'text-opacity' : 'icon-opacity';
      map.setPaintProperty(id, opacityProp, 0.5);
      if (type === 'symbol') {
        map.setPaintProperty(id, 'text-color', 'rgba(255,255,255,0.35)');
        map.setPaintProperty(id, 'text-halo-color', 'rgba(0,0,0,0.7)');
        map.setPaintProperty(id, 'text-halo-width', 1);
      }
    } catch (_) {}
  });
}

/**
 * Orchestrate a cinematic camera flyTo when a route is found.
 * @param {mapboxgl.Map} map
 * @param {[number,number]} center   [lng, lat]
 * @param {{ bearing?: number, zoom?: number }} opts
 */
export function routeCamera(map, center, { bearing = 0, zoom = 14.5 } = {}) {
  if (!map) return;
  map.flyTo({
    center,
    zoom,
    pitch:    55,
    bearing,
    duration: 2200,
    essential: true,
    easing:   (t) => 1 - Math.pow(1 - t, 3), // ease-out-cubic
  });
}

/**
 * Reset camera to overhead view (e.g. when route is cleared).
 * @param {mapboxgl.Map} map
 * @param {[number,number]} center
 */
export function overviewCamera(map, center) {
  if (!map) return;
  map.flyTo({
    center,
    zoom:     12,
    pitch:    0,
    bearing:  0,
    duration: 1800,
    essential: true,
  });
}

/**
 * Dramatic tilt + bearing lock for navigation mode.
 * @param {mapboxgl.Map} map
 * @param {[number,number]} position  [lng, lat]
 * @param {number} bearing
 */
export function navigationCamera(map, position, bearing = 0) {
  if (!map) return;
  map.easeTo({
    center:   position,
    zoom:     16,
    pitch:    62,
    bearing,
    duration: 800,
    easing:   (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  });
}
