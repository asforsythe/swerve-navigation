import { useCallback, useEffect, useRef, useState } from 'react';
import useSwerveStore from '../store/useSwerveStore';

const BLITZ_WS = 'wss://ws1.blitzortung.org';
const MAX_STRIKES = 100;
const FADE_SECONDS = 30;

/**
 * useLightningLayer — Blitzortung WebSocket lightning strikes.
 * Subscribes on connect, renders pulsing yellow dots on a GeoJSON source,
 * auto-fades after 30 seconds, caps at 100 rendered strikes, reconnects on disconnect.
 */
export function useLightningLayer({ mapRef, mapLoaded }) {
    const [isVisible, setIsVisible] = useState(false);
    const [strikeCount, setStrikeCount] = useState(0);
    const visibleRef = useRef(false);
    const wsRef = useRef(null);
    const strikesRef = useRef([]);
    const reconnectTimerRef = useRef(null);
    const layerId = 'lightning-strikes';
    const sourceId = 'lightning-source';

    const weatherLayers = useSwerveStore((state) => state.weatherLayers);
    const addToast = useSwerveStore((state) => state.addToast);
    const speak = useSwerveStore((state) => state.speak);
    const userLocationRef = useRef(null);

    useEffect(() => {
        const wantsVisible = weatherLayers?.lightning ?? false;
        if (wantsVisible !== visibleRef.current) {
            visibleRef.current = wantsVisible;
            setIsVisible(wantsVisible);
        }
    }, [weatherLayers?.lightning]);

    const buildGeoJSON = useCallback(() => {
        const now = Date.now() / 1000;
        const features = strikesRef.current
            .filter((s) => now - s.time < FADE_SECONDS)
            .map((s) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
                properties: { time: s.time },
            }));
        return { type: 'FeatureCollection', features };
    }, []);

    const updateSource = useCallback(() => {
        if (!mapRef.current) return;
        const source = mapRef.current.getSource(sourceId);
        if (source && typeof source.setData === 'function') {
            source.setData(buildGeoJSON());
        }
        setStrikeCount(strikesRef.current.filter((s) => Date.now() / 1000 - s.time < FADE_SECONDS).length);
    }, [mapRef, buildGeoJSON]);

    const connect = useCallback(() => {
        if (wsRef.current) {
            try { wsRef.current.close(); } catch (_) { /* noop */ }
        }
        try {
            const ws = new WebSocket(BLITZ_WS);
            wsRef.current = ws;

            ws.onopen = () => {
                ws.send(JSON.stringify({ a: 111 }));
            };

            ws.onmessage = (evt) => {
                try {
                    const msg = JSON.parse(evt.data);
                    if (!msg.lat || !msg.lon) return;
                    const strike = {
                        time: Date.now() / 1000,
                        lat: msg.lat,
                        lon: msg.lon,
                    };
                    strikesRef.current.push(strike);
                    if (strikesRef.current.length > MAX_STRIKES) {
                        strikesRef.current.shift();
                    }

                    // TTS if within 5 km of user location
                    const userLoc = userLocationRef.current;
                    if (userLoc) {
                        const d = haversineKm(userLoc[1], userLoc[0], strike.lat, strike.lon);
                        if (d < 5) {
                            const muted = useSwerveStore.getState().isMuted;
                            if (!muted) {
                                speak?.('Lightning strike detected within 5 kilometers. Seek shelter.');
                            }
                            addToast?.({
                                message: '⚡ Lightning strike within 5 km — seek shelter',
                                type: 'warning',
                                duration: 6000,
                            });
                        }
                    }

                    updateSource();
                } catch (_e) {
                    // ignore malformed
                }
            };

            ws.onclose = () => {
                if (visibleRef.current) {
                    reconnectTimerRef.current = setTimeout(connect, 5000);
                }
            };

            ws.onerror = (err) => {
                console.error('[Swerve Lightning] WS error:', err);
                ws.close();
            };
        } catch (e) {
            console.error('[Swerve Lightning] Connect error:', e);
        }
    }, [updateSource, speak, addToast]);

    // Fade-out ticker
    useEffect(() => {
        if (!isVisible) return;
        const id = setInterval(() => {
            updateSource();
        }, 1000);
        return () => clearInterval(id);
    }, [isVisible, updateSource]);

    // Inject / remove source + layer
    useEffect(() => {
        if (!mapLoaded || !mapRef.current) return;
        const map = mapRef.current;
        const hasLayer = !!map.getLayer(layerId);

        if (isVisible && !hasLayer) {
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: buildGeoJSON(),
                });
            }
            map.addLayer({
                id: layerId,
                type: 'circle',
                source: sourceId,
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        4, 2,
                        12, 8,
                    ],
                    'circle-color': '#fbbf24',
                    'circle-opacity': [
                        'interpolate',
                        ['linear'],
                        ['-', ['/', ['*', Date.now(), 0.001], 1], ['get', 'time']],
                        0, 1,
                        FADE_SECONDS, 0,
                    ],
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#f59e0b',
                    'circle-stroke-opacity': 0.8,
                },
            });
            connect();
        } else if (!isVisible && hasLayer) {
            if (map.getLayer(layerId)) map.removeLayer(layerId);
            if (map.getSource(sourceId)) map.removeSource(sourceId);
            if (wsRef.current) {
                try { wsRef.current.close(); } catch (_) { /* noop */ }
                wsRef.current = null;
            }
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            strikesRef.current = [];
            setStrikeCount(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVisible, mapLoaded]);

    // Expose user location setter for TTS proximity check
    const setUserLocation = useCallback((loc) => {
        userLocationRef.current = loc;
    }, []);

    useEffect(() => {
        return () => {
            if (wsRef.current) try { wsRef.current.close(); } catch (_) { /* noop */ }
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        };
    }, []);

    const refresh = useCallback(() => {
        if (!visibleRef.current || !mapRef.current) return;
        const map = mapRef.current;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        map.addSource(sourceId, {
            type: 'geojson',
            data: buildGeoJSON(),
        });
        map.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2, 12, 8],
                'circle-color': '#fbbf24',
                'circle-opacity': ['interpolate', ['linear'], ['-', ['/', ['*', Date.now(), 0.001], 1], ['get', 'time']], 0, 1, FADE_SECONDS, 0],
                'circle-stroke-width': 1,
                'circle-stroke-color': '#f59e0b',
                'circle-stroke-opacity': 0.8,
            },
        });
    }, [mapRef, buildGeoJSON]);

    const toggleLightningLayer = useCallback(() => {
        useSwerveStore.getState().setWeatherLayer('lightning', !visibleRef.current);
    }, []);

    return { isLightningLayerVisible: isVisible, toggleLightningLayer, strikeCount, setUserLocation, refresh };
}

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
