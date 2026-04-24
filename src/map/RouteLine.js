/**
 * Swerve RouteLine — Cinema-grade animated route visualization
 *
 * Renders a 4-layer route line on a Mapbox GL map:
 *   Layer 1: Thick glow halo (outermost, blurred)
 *   Layer 2: Core line (solid SSI-colored)
 *   Layer 3: Animated dash overlay (moving dashes)
 *   Layer 4: Comet head — a bright dot that travels along the route
 *
 * Usage:
 *   const line = new RouteLine(map);
 *   line.draw(geojsonLineString, { ssi: 85, color: '#34d399' });
 *   line.remove();
 *   line.animateComet(); // starts comet loop — call once after draw()
 */

const SOURCE_ID   = 'swerve-route';
const LAYER_HALO  = 'swerve-route-halo';
const LAYER_CASE  = 'swerve-route-case';
const LAYER_CORE  = 'swerve-route-core';
const LAYER_DASH  = 'swerve-route-dash';
const SOURCE_COMET= 'swerve-comet';
const LAYER_COMET = 'swerve-comet-dot';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a 6-digit hex color + alpha (0–1) to rgba() string Mapbox accepts. */
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Dasharray steps that create the illusion of moving dashes in Mapbox GL.
 * (Mapbox GL has no line-dash-offset; we cycle through dasharray values instead.)
 */
const DASH_STEPS = [
  [0,   3.5, 2],
  [0.5, 3,   2],
  [1,   2.5, 2],
  [1.5, 2,   2],
  [2,   1.5, 2],
  [2.5, 1,   2],
  [3,   0.5, 2],
  [3.5, 0,   2],
];

export class RouteLine {
  /**
   * @param {mapboxgl.Map} map
   */
  constructor(map) {
    this._map    = map;
    this._coords = [];
    this._raf    = null;
    this._cometT = 0;   // 0–1 position along route
    this._dashOffset = 0;
  }

  /**
   * Draw the route.
   * @param {GeoJSON.Feature} geojson  LineString feature
   * @param {{ ssi?: number, color?: string }} opts
   */
  draw(geojson, { ssi = 80, color } = {}) {
    const map = this._map;
    if (!map || !map.isStyleLoaded()) return;

    // Derive color from SSI if not provided
    const lineColor = color ?? ssiToColor(ssi);
    const glowColor = hexToRgba(lineColor, 0.35); // rgba — Mapbox doesn't accept 8-digit hex
    const caseColor = '#000000';

    // Store coords for comet animation
    const coords = geojson?.geometry?.coordinates ?? [];
    this._coords = coords;
    this._cometT = 0;

    // ── Source ───────────────────────────────────────────────────────────────
    if (map.getSource(SOURCE_ID)) {
      map.getSource(SOURCE_ID).setData(geojson);
    } else {
      map.addSource(SOURCE_ID, { type: 'geojson', data: geojson, lineMetrics: true });
    }

    // ── Layer 1: wide glow halo ───────────────────────────────────────────
    if (!map.getLayer(LAYER_HALO)) {
      map.addLayer({
        id:     LAYER_HALO,
        type:   'line',
        source: SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color':   glowColor,
          'line-width':   ['interpolate', ['linear'], ['zoom'], 10, 12, 16, 24],
          'line-blur':    8,
          'line-opacity': 0.55,
        },
      }, getFirstSymbolLayer(map));
    } else {
      map.setPaintProperty(LAYER_HALO, 'line-color', glowColor);
    }

    // ── Layer 2: dark case (border) ───────────────────────────────────────
    if (!map.getLayer(LAYER_CASE)) {
      map.addLayer({
        id:     LAYER_CASE,
        type:   'line',
        source: SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color':   caseColor,
          'line-width':   ['interpolate', ['linear'], ['zoom'], 10, 7, 16, 14],
          'line-opacity': 0.40,
        },
      }, getFirstSymbolLayer(map));
    }

    // ── Layer 3: core solid line ──────────────────────────────────────────
    if (!map.getLayer(LAYER_CORE)) {
      map.addLayer({
        id:     LAYER_CORE,
        type:   'line',
        source: SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': lineColor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 5, 16, 10],
          'line-opacity': 0.90,
        },
      }, getFirstSymbolLayer(map));
    } else {
      map.setPaintProperty(LAYER_CORE, 'line-color', lineColor);
    }

    // ── Layer 4: animated dash overlay ────────────────────────────────────
    if (!map.getLayer(LAYER_DASH)) {
      map.addLayer({
        id:     LAYER_DASH,
        type:   'line',
        source: SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color':         '#ffffff',
          'line-width':         ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 4],
          'line-opacity':       0.30,
          'line-dasharray':     DASH_STEPS[0],
        },
      }, getFirstSymbolLayer(map));
    }

    // ── Comet source / layer ──────────────────────────────────────────────
    const cometPt = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coords[0] ?? [0, 0] },
    };

    if (map.getSource(SOURCE_COMET)) {
      map.getSource(SOURCE_COMET).setData(cometPt);
    } else {
      map.addSource(SOURCE_COMET, { type: 'geojson', data: cometPt });
    }

    if (!map.getLayer(LAYER_COMET)) {
      // Inner bright core
      map.addLayer({
        id:     LAYER_COMET,
        type:   'circle',
        source: SOURCE_COMET,
        paint: {
          'circle-radius':       ['interpolate', ['linear'], ['zoom'], 10, 5, 16, 9],
          'circle-color':        '#ffffff',
          'circle-opacity':      1,
          'circle-blur':         0,
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 8],
          'circle-stroke-color': lineColor,
          'circle-stroke-opacity': 0.70,
        },
      });

      // Outer glow ring
      map.addLayer({
        id:     LAYER_COMET + '-glow',
        type:   'circle',
        source: SOURCE_COMET,
        paint: {
          'circle-radius':   ['interpolate', ['linear'], ['zoom'], 10, 14, 16, 24],
          'circle-color':    lineColor,
          'circle-opacity':  0,
          'circle-blur':     1,
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 10, 8, 16, 16],
          'circle-stroke-color': lineColor,
          'circle-stroke-opacity': 0.25,
        },
      });
    } else {
      map.setPaintProperty(LAYER_COMET, 'circle-stroke-color', lineColor);
      map.setPaintProperty(LAYER_COMET + '-glow', 'circle-color', lineColor);
      map.setPaintProperty(LAYER_COMET + '-glow', 'circle-stroke-color', lineColor);
    }

    // Start animations
    this._startDashAnimation();
    this._startCometAnimation();
  }

  /** Remove all layers and sources, cancel animation frames. */
  remove() {
    this._stopAnimations();
    const map = this._map;
    if (!map) return;

    const layers = [
      LAYER_COMET + '-glow',
      LAYER_COMET,
      LAYER_DASH,
      LAYER_CORE,
      LAYER_CASE,
      LAYER_HALO,
    ];
    layers.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    [SOURCE_ID, SOURCE_COMET].forEach((id) => {
      if (map.getSource(id)) map.removeSource(id);
    });
  }

  /** Update route color (e.g. after SSI recalculation). */
  updateColor(color) {
    const map = this._map;
    if (!map) return;
    const glowColor = hexToRgba(color, 0.35);
    if (map.getLayer(LAYER_HALO)) map.setPaintProperty(LAYER_HALO, 'line-color', glowColor);
    if (map.getLayer(LAYER_CORE)) map.setPaintProperty(LAYER_CORE, 'line-color', color);
    if (map.getLayer(LAYER_COMET)) map.setPaintProperty(LAYER_COMET, 'circle-stroke-color', color);
    if (map.getLayer(LAYER_COMET + '-glow')) {
      map.setPaintProperty(LAYER_COMET + '-glow', 'circle-color', color);
      map.setPaintProperty(LAYER_COMET + '-glow', 'circle-stroke-color', color);
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _startDashAnimation() {
    let step = 0;
    let frameCount = 0;
    const FRAMES_PER_STEP = 3; // advance dasharray every 3 frames (~50ms at 60fps)
    const animate = () => {
      frameCount++;
      if (frameCount >= FRAMES_PER_STEP) {
        frameCount = 0;
        step = (step + 1) % DASH_STEPS.length;
        if (this._map?.getLayer(LAYER_DASH)) {
          try {
            this._map.setPaintProperty(LAYER_DASH, 'line-dasharray', DASH_STEPS[step]);
          } catch (_) {}
        }
      }
      this._dashRaf = requestAnimationFrame(animate);
    };
    cancelAnimationFrame(this._dashRaf);
    this._dashRaf = requestAnimationFrame(animate);
  }

  _startCometAnimation() {
    const SPEED = 0.0015; // fraction of route per frame
    const coords = this._coords;
    if (!coords || coords.length < 2) return;

    const totalLen = totalLength(coords);

    const animate = () => {
      this._cometT = (this._cometT + SPEED) % 1;
      const pos = pointAlongRoute(coords, totalLen, this._cometT);

      if (pos && this._map?.getSource(SOURCE_COMET)) {
        try {
          this._map.getSource(SOURCE_COMET).setData({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: pos },
          });
        } catch (_) {}
      }
      this._cometRaf = requestAnimationFrame(animate);
    };
    cancelAnimationFrame(this._cometRaf);
    this._cometRaf = requestAnimationFrame(animate);
  }

  _stopAnimations() {
    cancelAnimationFrame(this._dashRaf);
    cancelAnimationFrame(this._cometRaf);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ssiToColor(ssi) {
  if (ssi >= 85) return '#34d399';
  if (ssi >= 70) return '#22d3ee';
  if (ssi >= 55) return '#fbbf24';
  if (ssi >= 30) return '#f97316';
  return '#ef4444';
}

/** Get the first symbol layer id (route layers rendered beneath labels). */
function getFirstSymbolLayer(map) {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    if (layer.type === 'symbol') return layer.id;
  }
  return undefined;
}

/** Euclidean distance between two [lng, lat] coords (good enough for short segments). */
function segLen([ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Total length of a coordinate array. */
function totalLength(coords) {
  let len = 0;
  for (let i = 1; i < coords.length; i++) {
    len += segLen(coords[i - 1], coords[i]);
  }
  return len;
}

/**
 * Linearly interpolate a point at fraction t (0–1) along a route.
 * @param {[number,number][]} coords
 * @param {number} total  pre-computed total length
 * @param {number} t      0..1
 * @returns {[number,number]}
 */
function pointAlongRoute(coords, total, t) {
  const target = t * total;
  let acc = 0;
  for (let i = 1; i < coords.length; i++) {
    const seg = segLen(coords[i - 1], coords[i]);
    if (acc + seg >= target) {
      const frac = (target - acc) / seg;
      const [ax, ay] = coords[i - 1];
      const [bx, by] = coords[i];
      return [ax + (bx - ax) * frac, ay + (by - ay) * frac];
    }
    acc += seg;
  }
  return coords[coords.length - 1];
}
