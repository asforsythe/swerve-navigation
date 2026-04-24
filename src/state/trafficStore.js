/**
 * Swerve Traffic Zustand Store
 *
 * Manages active route, alternative routes, incidents, and derived traffic state.
 * Kept separate from useSwerveStore to avoid bloating the persisted store.
 * This store is NOT persisted — it's rebuilt fresh each navigation session.
 */
import { create } from 'zustand';
import { computeBuckets, dominantCondition } from '../design/traffic';
import { pointToLineDistance, lineString, point } from '@turf/turf';

const ROUTE_INCIDENT_THRESHOLD_M = 80; // incident within 80m of route = on-route

export const useTrafficStore = create((set, get) => ({
  activeRoute:    null,
  alternatives:   [],
  incidents:      [],
  lastRefreshAt:  0,
  isRefreshing:   false,
  rerouteToast:   null, // { reason, newRoute, delta, onAccept, onKeep, timeoutMs }

  // ── Setters ────────────────────────────────────────────────────────────────
  setActiveRoute:  (route)  => set({ activeRoute: route, lastRefreshAt: Date.now() }),
  setAlternatives: (alts)   => set({ alternatives: alts }),
  setIncidents:    (inc)    => set({ incidents: inc }),
  setRefreshing:   (b)      => set({ isRefreshing: b }),
  setRerouteToast: (toast)  => set({ rerouteToast: toast }),
  clearRerouteToast: ()     => set({ rerouteToast: null }),

  // ── Derived selectors ──────────────────────────────────────────────────────

  /** Returns fraction-of-route in each congestion bucket, or null if no data. */
  getBuckets: () => {
    const r = get().activeRoute;
    if (!r) return null;
    return computeBuckets(r.congestion, r.distances);
  },

  /** Dominant traffic condition string ("Mostly clear", "Heavy", etc.) */
  getDominantCondition: () => {
    return dominantCondition(get().getBuckets());
  },

  /**
   * Extra minutes added by traffic vs free-flow.
   * Approximated using 85th-percentile observed speed as free-flow proxy.
   */
  getEtaDeltaSecs: () => {
    const r = get().activeRoute;
    if (!r?.distances?.length || !r?.speeds?.length) return 0;
    const speeds = [...r.speeds].filter((s) => s > 0).sort((a, b) => a - b);
    if (!speeds.length) return 0;
    const freeFlow = speeds[Math.floor(speeds.length * 0.85)] || speeds[speeds.length - 1];
    const freeFlowDuration = r.distances.reduce((sum, d) => sum + d / freeFlow, 0);
    return Math.max(0, Math.round(r.duration - freeFlowDuration));
  },

  /**
   * Returns incidents whose centroid is within threshold of the active route.
   * Uses turf point-to-line-distance for accuracy.
   */
  getIncidentsOnRoute: () => {
    const { activeRoute, incidents } = get();
    if (!activeRoute?.coordinates?.length || !incidents.length) return [];
    try {
      const line = lineString(activeRoute.coordinates);
      return incidents.filter((inc) => {
        try {
          const dist = pointToLineDistance(point(inc.centroid), line, { units: 'meters' });
          return dist <= ROUTE_INCIDENT_THRESHOLD_M;
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  },
}));
