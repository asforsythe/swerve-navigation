import { useCallback, useEffect, useRef } from 'react';
import useSwerveStore from '../store/useSwerveStore';
import { uuidv4 } from '../utils/uuid';

// Stable client ID persisted in localStorage
function getClientId() {
  let id = localStorage.getItem('swerve-client-id');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('swerve-client-id', id);
  }
  return id;
}

const UPDATE_INTERVAL_MS = 15_000; // push position update every 15s

export function useLiveShare({ userLocationRef, routeTelemetry, lastRouteReport }) {
  const { liveShare, setLiveShare, clearLiveShare, addToast } = useSwerveStore();
  const intervalRef = useRef(null);

  // ── Start sharing ───────────────────────────────────────────────────────────
  const startShare = useCallback(async () => {
    const clientId = getClientId();
    const loc = userLocationRef?.current; // [lng, lat]

    const body = {
      clientId,
      from: lastRouteReport?.from || 'Current Location',
      to: lastRouteReport?.to || 'Destination',
      centerLat: loc ? loc[1] : (lastRouteReport?.centerLat ?? 0),
      centerLng: loc ? loc[0] : (lastRouteReport?.centerLng ?? 0),
      ssi: routeTelemetry?.ssi ?? 0,
    };

    try {
      const res = await fetch('/api/live-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Server error');
      const { id } = await res.json();
      const shareUrl = `${window.location.origin}/live/${id}`;
      setLiveShare({ id, isActive: true, shareUrl });
      addToast({ message: 'Track My Drive activated', type: 'success', duration: 2500 });
    } catch (e) {
      addToast({ message: 'Could not start live share — is the server running?', type: 'error' });
    }
  }, [userLocationRef, lastRouteReport, routeTelemetry, setLiveShare, addToast]);

  // ── Stop sharing ────────────────────────────────────────────────────────────
  const stopShare = useCallback(async () => {
    if (!liveShare.id) return;
    const clientId = getClientId();
    try {
      await fetch(`/api/live-route/${liveShare.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
    } catch { /* fire and forget */ }
    clearLiveShare();
    addToast({ message: 'Live share ended', type: 'info', duration: 2000 });
  }, [liveShare.id, clearLiveShare, addToast]);

  // ── Position update loop ────────────────────────────────────────────────────
  useEffect(() => {
    if (!liveShare.isActive || !liveShare.id) {
      clearInterval(intervalRef.current);
      return;
    }

    const push = async () => {
      const loc = userLocationRef?.current;
      if (!loc) return;
      const clientId = getClientId();
      try {
        await fetch(`/api/live-route/${liveShare.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            lat: loc[1],
            lng: loc[0],
            ssi: routeTelemetry?.ssi ?? 0,
          }),
        });
      } catch { /* non-fatal */ }
    };

    intervalRef.current = setInterval(push, UPDATE_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [liveShare.isActive, liveShare.id, userLocationRef, routeTelemetry]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return { liveShare, startShare, stopShare };
}
