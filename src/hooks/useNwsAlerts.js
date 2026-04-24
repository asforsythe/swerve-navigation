import { useCallback, useEffect, useRef, useState } from 'react';
import useSwerveStore from '../store/useSwerveStore';
import { booleanPointInPolygon } from '@turf/turf';

const NWS_ALERTS_URL = 'https://api.weather.gov/alerts/active?status=actual&message_type=alert';
const POLL_MS = 60000;
const USER_AGENT = 'Swerve-NeuralCoPilot (contact@bradfordinformedguidance.com)';

const WATCHED_EVENTS = new Set([
    'Tornado Warning',
    'Severe Thunderstorm Warning',
    'Flood Warning',
    'Flash Flood Warning',
    'Winter Storm Warning',
    'Ice Storm Warning',
    'High Wind Warning',
]);

/**
 * useNwsAlerts — Polls NOAA NWS active alerts every 60s.
 * Renders polygons as red pulsing fills with red strokes.
 * Triggers TTS + toast when route intersects an alert polygon.
 */
export function useNwsAlerts({ mapRef, mapLoaded }) {
    const [isVisible, setIsVisible] = useState(false);
    const visibleRef = useRef(false);
    const alertsRef = useRef([]);
    const timerRef = useRef(null);
    const layerId = 'nws-alerts-fill';
    const outlineId = 'nws-alerts-outline';
    const sourceId = 'nws-alerts-source';

    const weatherLayers = useSwerveStore((state) => state.weatherLayers);
    const addToast = useSwerveStore((state) => state.addToast);
    const speak = useSwerveStore((state) => state.speak);
    const routePath = useSwerveStore((state) => state.route?.path);
    const announcedRef = useRef(new Set());

    useEffect(() => {
        const wantsVisible = weatherLayers?.nws ?? false;
        if (wantsVisible !== visibleRef.current) {
            visibleRef.current = wantsVisible;
            setIsVisible(wantsVisible);
        }
    }, [weatherLayers?.nws]);

    const fetchAlerts = useCallback(async () => {
        try {
            const res = await fetch(NWS_ALERTS_URL, {
                headers: { 'User-Agent': USER_AGENT },
            });
            if (!res.ok) throw new Error(`NWS error: ${res.status}`);
            const data = await res.json();
            const features = (data.features || []).filter((f) => {
                const event = f.properties?.event || '';
                return WATCHED_EVENTS.has(event);
            });
            alertsRef.current = features;
            updateLayer();
            checkRouteIntersection(features);
        } catch (e) {
            console.error('[Swerve NWS] Fetch error:', e);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateLayer = useCallback(() => {
        if (!mapRef.current) return;
        const source = mapRef.current.getSource(sourceId);
        if (source && typeof source.setData === 'function') {
            source.setData({
                type: 'FeatureCollection',
                features: alertsRef.current,
            });
        }
    }, [mapRef]);

    const checkRouteIntersection = useCallback(
        (features) => {
            if (!routePath) return;
            const routeCoords = routePath.geometry?.coordinates || [];
            if (routeCoords.length === 0) return;

            for (const f of features) {
                const id = f.properties?.id || f.id;
                const event = f.properties?.event || '';
                if (announcedRef.current.has(id)) continue;

                const geom = f.geometry;
                if (!geom) continue;

                // Check if any route coordinate lies inside the alert polygon
                let intersects = false;
                for (const pt of routeCoords) {
                    try {
                        if (booleanPointInPolygon(pt, f)) {
                            intersects = true;
                            break;
                        }
                    } catch (_e) {
                        // ignore invalid geometry
                    }
                }

                if (intersects) {
                    announcedRef.current.add(id);
                    const isTornado = event.toLowerCase().includes('tornado');
                    const message = isTornado
                        ? `Tornado Warning intersecting your route. Take shelter immediately.`
                        : `${event} intersecting your route.`;
                    const muted = useSwerveStore.getState().isMuted;
                    if (!muted) speak?.(message);
                    addToast?.({
                        message,
                        type: isTornado ? 'error' : 'warning',
                        duration: 8000,
                    });
                }
            }
        },
        [routePath, speak, addToast]
    );

    // Inject / remove layers
    useEffect(() => {
        if (!mapLoaded || !mapRef.current) return;
        const map = mapRef.current;
        const hasLayer = !!map.getLayer(layerId);

        if (isVisible && !hasLayer) {
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] },
                });
            }
            map.addLayer({
                id: layerId,
                type: 'fill',
                source: sourceId,
                paint: {
                    'fill-color': '#ef4444',
                    'fill-opacity': 0.18,
                },
            });
            map.addLayer({
                id: outlineId,
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': '#ef4444',
                    'line-width': 1.5,
                    'line-opacity': 0.7,
                },
            });
            fetchAlerts();
        } else if (!isVisible && hasLayer) {
            if (map.getLayer(outlineId)) map.removeLayer(outlineId);
            if (map.getLayer(layerId)) map.removeLayer(layerId);
            if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVisible, mapLoaded]);

    // Poll every 60s while visible
    useEffect(() => {
        if (!isVisible || !mapLoaded) return;
        fetchAlerts();
        timerRef.current = setInterval(fetchAlerts, POLL_MS);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isVisible, mapLoaded, fetchAlerts]);

    // Re-check when route changes
    useEffect(() => {
        if (!isVisible) return;
        checkRouteIntersection(alertsRef.current);
    }, [routePath, isVisible, checkRouteIntersection]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const refresh = useCallback(() => {
        if (!visibleRef.current || !mapRef.current) return;
        const map = mapRef.current;
        if (map.getLayer(outlineId)) map.removeLayer(outlineId);
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        map.addSource(sourceId, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: alertsRef.current },
        });
        map.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            paint: {
                'fill-color': '#ef4444',
                'fill-opacity': 0.18,
            },
        });
        map.addLayer({
            id: outlineId,
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': '#ef4444',
                'line-width': 1.5,
                'line-opacity': 0.7,
            },
        });
    }, [mapRef]);

    const toggleNwsAlerts = useCallback(() => {
        useSwerveStore.getState().setWeatherLayer('nws', !visibleRef.current);
    }, []);

    return { isNwsAlertsVisible: isVisible, toggleNwsAlerts, alerts: alertsRef.current, refresh };
}
