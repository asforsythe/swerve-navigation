import { useCallback, useEffect, useState } from 'react';
import useSwerveStore from '../store/useSwerveStore';

/** Convert a URL-safe base64 VAPID public key to a Uint8Array for the Push API */
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Derive the route list the server should monitor for this subscription.
 * Uses saved routes with known centers + the last route report as a fallback.
 */
function buildRouteList(savedRoutes, lastRouteReport) {
  const routes = savedRoutes
    .filter((r) => r.centerLat && r.centerLng)
    .map((r) => ({ label: r.dest || r.start || 'Saved Route', centerLat: r.centerLat, centerLng: r.centerLng }));

  // Fallback: use the most recent route center if no saved routes have coords
  if (!routes.length && lastRouteReport?.centerLat) {
    routes.push({
      label: lastRouteReport.to || 'Recent Route',
      centerLat: lastRouteReport.centerLat,
      centerLng: lastRouteReport.centerLng,
    });
  }
  return routes;
}

export function usePushNotifications() {
  const { savedRoutes, lastRouteReport } = useSwerveStore();

  const [isSupported] = useState(
    () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  );
  const [isSubscribed, setIsSubscribed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('swerve-push-subscribed') === 'true'
  );
  const [permission, setPermission] = useState(
    () => typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Re-sync route list with server when savedRoutes changes (if already subscribed)
  useEffect(() => {
    if (!isSubscribed) return;
    const subRaw = localStorage.getItem('swerve-push-subscription');
    if (!subRaw) return;

    const routes = buildRouteList(savedRoutes, lastRouteReport);
    if (!routes.length) return;

    fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: JSON.parse(subRaw), routes }),
    }).catch(() => {/* non-critical — server will use stale routes */});
  }, [savedRoutes]); // eslint-disable-line react-hooks/exhaustive-deps

  const subscribe = useCallback(async () => {
    if (!isSupported) return { error: 'Push not supported in this browser' };

    try {
      // 1. Get VAPID public key from server
      const keyRes = await fetch('/api/push/vapid-public-key');
      if (!keyRes.ok) return { error: 'Push notifications not configured on server' };
      const { publicKey } = await keyRes.json();
      if (!publicKey) return { error: 'VAPID public key missing' };

      // 2. Register (or re-use) service worker
      const reg = await navigator.serviceWorker.ready;

      // 3. Subscribe with VAPID key
      const pushSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(publicKey),
      });

      // 4. Send subscription + monitored routes to server
      const routes = buildRouteList(savedRoutes, lastRouteReport);
      const subJson = pushSub.toJSON();

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subJson, routes }),
      });

      // 5. Persist locally for route re-sync
      localStorage.setItem('swerve-push-subscribed', 'true');
      localStorage.setItem('swerve-push-subscription', JSON.stringify(subJson));

      setIsSubscribed(true);
      setPermission('granted');
      return { success: true };
    } catch (err) {
      console.error('[Push] Subscribe error:', err);
      if (err.name === 'NotAllowedError') {
        setPermission('denied');
        return { error: 'Notification permission denied' };
      }
      return { error: err.message };
    }
  }, [isSupported, savedRoutes, lastRouteReport]);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const pushSub = await reg.pushManager.getSubscription();

      if (pushSub) {
        const endpoint = pushSub.toJSON().endpoint;
        await pushSub.unsubscribe();
        // Tell server to remove the subscription
        fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }

      localStorage.removeItem('swerve-push-subscribed');
      localStorage.removeItem('swerve-push-subscription');
      setIsSubscribed(false);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }, []);

  return { isSubscribed, isSupported, permission, subscribe, unsubscribe };
}
