import { useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import useSwerveStore from '../store/useSwerveStore';
import { uuidv4 } from '../utils/uuid';

const POLL_MS = 2 * 60 * 1000; // 2 minutes

const HAZARD_COLORS = {
  Flooding:     '#3b82f6', // blue
  Debris:       '#fbbf24', // amber
  Accident:     '#f43f5e', // rose
  Ice:          '#22d3ee', // cyan
  Construction: '#f97316', // orange
  Pothole:      '#a78bfa', // violet
  Animal:       '#34d399', // emerald
};

const HAZARD_ICONS = {
  Flooding:     '🌊',
  Debris:       '🍂',
  Accident:     '💥',
  Ice:          '🧊',
  Construction: '🚧',
  Pothole:      '🕳️',
  Animal:       '🦌',
};

// Persistent client ID (owner tracking)
function getClientId() {
  let id = localStorage.getItem('swerve_client_id');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('swerve_client_id', id);
  }
  return id;
}


export function useCommunityHazards({ mapRef, mapLoaded }) {
  const { setCommunityHazards, communityHazards, awardBadge, swerveScore, addToast } = useSwerveStore();
  const markersRef  = useRef({}); // id → mapboxgl.Marker
  const timerRef    = useRef(null);
  const userLoc     = useRef(null);

  // ── Fetch hazards from backend ──────────────────────────────────────────────
  const fetchHazards = useCallback(async () => {
    try {
      const loc   = userLoc.current;
      const query = loc ? `?lat=${loc[1]}&lng=${loc[0]}&radius=100` : '';
      const res   = await fetch(`/api/hazards${query}`);
      if (!res.ok) return;
      // Guard against HTML proxy error pages (server not running)
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) return;
      const data = await res.json();
      setCommunityHazards(data);
    } catch {
      // Server not reachable — silently swallow, UI degrades gracefully
    }
  }, [setCommunityHazards]);

  // ── Sync Mapbox markers with hazard list ────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const currentIds = new Set(communityHazards.map(h => h.id));

    // Remove stale markers
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add / update markers
    communityHazards.forEach(hazard => {
      if (markersRef.current[hazard.id]) return; // already exists

      const color = HAZARD_COLORS[hazard.type] || '#ffffff';
      const icon  = HAZARD_ICONS[hazard.type]  || '⚠';
      const net   = hazard.upvotes - hazard.downvotes;

      // Diamond-shaped pulsing marker
      const el = document.createElement('div');
      el.style.cssText = `
        width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; position: relative;
      `;
      el.innerHTML = `
        <div style="
          width: 28px; height: 28px;
          background: ${color}22;
          border: 2px solid ${color};
          border-radius: 4px;
          transform: rotate(45deg);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 12px ${color}66;
          animation: hazard-pulse 2s ease-in-out infinite;
        ">
          <span style="transform: rotate(-45deg); font-size: 12px; line-height: 1;">${icon}</span>
        </div>
        ${net > 2 ? `<div style="
          position: absolute; top: -6px; right: -6px;
          width: 16px; height: 16px;
          background: ${color};
          border-radius: 50%;
          font-size: 8px; font-weight: bold; color: #000;
          display: flex; align-items: center; justify-content: center;
        ">${net}</div>` : ''}
      `;

      // Inject keyframe if not present
      if (!document.getElementById('hazard-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'hazard-pulse-style';
        style.textContent = `
          @keyframes hazard-pulse {
            0%, 100% { box-shadow: 0 0 12px ${color}66; }
            50% { box-shadow: 0 0 24px ${color}99, 0 0 8px ${color}44; }
          }
        `;
        document.head.appendChild(style);
      }

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: true, maxWidth: '220px' })
        .setHTML(`
          <div style="font-family: system-ui; color: #fff; background: #0a0a0e; padding: 10px 12px; border-radius: 10px; border: 1px solid ${color}44;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 16px;">${icon}</span>
              <span style="font-weight: 700; color: ${color}; font-size: 13px;">${hazard.type}</span>
            </div>
            ${hazard.description ? `<p style="font-size: 11px; color: rgba(255,255,255,0.6); margin: 0 0 6px;">${hazard.description}</p>` : ''}
            <div style="font-size: 10px; color: rgba(255,255,255,0.3);">
              ${net > 0 ? `👍 ${hazard.upvotes}` : net < 0 ? `👎 ${hazard.downvotes}` : 'No votes yet'} ·
              ${new Date(hazard.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([hazard.lng, hazard.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current[hazard.id] = marker;
    });
  }, [communityHazards, mapLoaded, mapRef]);

  // ── Poll on mount, clear on unmount ────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded) return;
    fetchHazards();
    timerRef.current = setInterval(fetchHazards, POLL_MS);
    return () => {
      clearInterval(timerRef.current);
      Object.values(markersRef.current).forEach(m => m.remove());
      markersRef.current = {};
    };
  }, [mapLoaded, fetchHazards]);

  // ── Public API ──────────────────────────────────────────────────────────────
  const reportHazard = useCallback(async ({ type, lat, lng, description }) => {
    const clientId = getClientId();
    try {
      const res = await fetch('/api/hazards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, lat, lng, description, clientId }),
      });
      if (!res.ok) throw new Error('Failed to submit report');
      await fetchHazards();

      // Award Hazard Scout badge on first report
      const isFirst = !swerveScore?.badges?.includes('hazard-scout');
      if (isFirst) {
        awardBadge('hazard-scout');
        addToast({ message: '🏅 Hazard Scout badge earned!', type: 'success', duration: 5000 });
      } else {
        addToast({ message: `${type} reported — thank you!`, type: 'success' });
      }
      return true;
    } catch (e) {
      addToast({ message: 'Report failed — is the server running?', type: 'error' });
      return false;
    }
  }, [fetchHazards, awardBadge, swerveScore.badges, addToast]);

  const voteHazard = useCallback(async (id, vote) => {
    const clientId = getClientId();
    try {
      await fetch(`/api/hazards/${id}/vote`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote, clientId }),
      });
      await fetchHazards();
    } catch (e) {
      console.warn('[Swerve Hazards] Vote error:', e.message);
    }
  }, [fetchHazards]);

  const deleteHazard = useCallback(async (id) => {
    const clientId = getClientId();
    try {
      await fetch(`/api/hazards/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      await fetchHazards();
    } catch (e) {
      console.warn('[Swerve Hazards] Delete error:', e.message);
    }
  }, [fetchHazards]);

  const setUserLocation = useCallback((loc) => {
    userLoc.current = loc;
  }, []);

  const myClientId = getClientId();

  return {
    hazards: communityHazards,
    reportHazard,
    voteHazard,
    deleteHazard,
    setUserLocation,
    myClientId,
    refresh: fetchHazards,
  };
}
