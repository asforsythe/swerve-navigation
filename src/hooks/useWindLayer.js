import { useCallback, useEffect, useRef, useState } from 'react';
import useSwerveStore from '../store/useSwerveStore';

const WIND_GRID_STEP = 0.5; // degrees
const MIN_ZOOM_GRID = 8;
const REFRESH_MS = 300000; // 5 min

/**
 * useWindLayer — Canvas-drawn wind particle overlay via Mapbox CustomLayerInterface.
 * Fetches Open-Meteo wind data on a lat/lng grid for the current viewport and
 * renders flowing particles whose speed/direction match the wind field.
 */
export function useWindLayer({ mapRef, mapLoaded }) {
    const [isVisible, setIsVisible] = useState(false);
    const visibleRef = useRef(false);
    const gridRef = useRef([]);
    const animFrameRef = useRef(null);
    const canvasRef = useRef(null);
    const glRef = useRef(null);
    const layerId = 'wind-particle-layer';

    const weatherLayers = useSwerveStore((state) => state.weatherLayers);

    // Keep local visible state in sync with Zustand
    useEffect(() => {
        const wantsVisible = weatherLayers?.wind ?? false;
        if (wantsVisible !== visibleRef.current) {
            visibleRef.current = wantsVisible;
            setIsVisible(wantsVisible);
        }
    }, [weatherLayers?.wind]);

    // Fetch wind grid for current viewport
    const fetchWindGrid = useCallback(async () => {
        if (!mapRef.current) return;
        const bounds = mapRef.current.getBounds();
        if (!bounds) return;
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const zoom = mapRef.current.getZoom();
        if (zoom < MIN_ZOOM_GRID) {
            gridRef.current = [];
            return;
        }

        const step = Math.max(0.15, WIND_GRID_STEP / Math.max(1, zoom - 6));
        const lats = [];
        const lngs = [];
        for (let lat = sw.lat; lat <= ne.lat; lat += step) {
            for (let lng = sw.lng; lng <= ne.lng; lng += step) {
                lats.push(lat.toFixed(4));
                lngs.push(lng.toFixed(4));
            }
        }
        if (lats.length === 0) return;
        if (lats.length > 100) {
            // Downsample to avoid massive URLs
            const ratio = Math.ceil(lats.length / 100);
            const filteredLats = [];
            const filteredLngs = [];
            for (let i = 0; i < lats.length; i += ratio) {
                filteredLats.push(lats[i]);
                filteredLngs.push(lngs[i]);
            }
            lats.length = 0;
            lngs.length = 0;
            lats.push(...filteredLats);
            lngs.push(...filteredLngs);
        }

        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lngs.join(',')}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
            const data = await res.json();
            const results = Array.isArray(data) ? data : [data];
            gridRef.current = results.map((r, i) => {
                const c = r.current || {};
                return {
                    lat: Number(lats[i]),
                    lng: Number(lngs[i]),
                    speed: c.wind_speed_10m || 0,
                    direction: c.wind_direction_10m || 0,
                    gust: c.wind_gusts_10m || 0,
                };
            });
        } catch (e) {
            console.error('[Swerve Wind] Fetch error:', e);
        }
    }, [mapRef]);

    // Mapbox Custom Layer
    const customLayer = useRef({
        id: layerId,
        type: 'custom',
        renderingMode: '2d',
        onAdd(map, gl) {
            const canvas = document.createElement('canvas');
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.width = map.getCanvas().width;
            canvas.height = map.getCanvas().height;
            canvas.style.position = 'absolute';
            canvas.style.pointerEvents = 'none';
            canvas.style.top = '0';
            canvas.style.left = '0';
            map.getCanvasContainer().appendChild(canvas);
            canvasRef.current = canvas;
            glRef.current = gl;
        },
        onRemove(map) {
            if (canvasRef.current) {
                map.getCanvasContainer().removeChild(canvasRef.current);
                canvasRef.current = null;
            }
            glRef.current = null;
        },
        render(_gl, matrix) {
            const canvas = canvasRef.current;
            if (!canvas || !mapRef.current) return;
            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);
            if (!visibleRef.current || gridRef.current.length === 0) return;

            const map = mapRef.current;
            const particles = gridRef.current;
            const now = Date.now() * 0.001;

            for (const p of particles) {
                const px = map.project([p.lng, p.lat]);
                if (px.x < -20 || px.x > w + 20 || px.y < -20 || px.y > h + 20) continue;

                const rad = ((p.direction - 90) * Math.PI) / 180;
                const speedFactor = Math.min(1, p.speed / 40);
                const len = 4 + speedFactor * 16;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);
                const tailX = px.x - cos * len;
                const tailY = px.y - sin * len;

                // Fade trail based on gust
                const alpha = 0.25 + Math.min(0.5, (p.gust || p.speed) / 60) * 0.5;
                const hue = 200 + speedFactor * 60; // cyan to purple

                ctx.beginPath();
                ctx.moveTo(px.x, px.y);
                ctx.lineTo(tailX, tailY);
                ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
                ctx.lineWidth = 1.2 + speedFactor * 1.5;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Animated wiggle at head
                const wiggle = Math.sin(now * 4 + p.lng * 100) * 2;
                ctx.beginPath();
                ctx.arc(px.x + wiggle, px.y + wiggle, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hue}, 90%, 70%, ${alpha + 0.15})`;
                ctx.fill();
            }

            // Trigger next frame if visible
            if (visibleRef.current) {
                animFrameRef.current = requestAnimationFrame(() => {
                    if (map) map.triggerRepaint();
                });
            }
        },
    });

    // Add/remove custom layer on visibility change
    useEffect(() => {
        if (!mapLoaded || !mapRef.current) return;
        const map = mapRef.current;
        const hasLayer = !!map.getLayer(layerId);

        if (isVisible && !hasLayer) {
            map.addLayer(customLayer.current);
            fetchWindGrid();
        } else if (!isVisible && hasLayer) {
            map.removeLayer(layerId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVisible, mapLoaded]);

    // Poll wind data every 5 min while visible
    useEffect(() => {
        if (!isVisible || !mapLoaded) return;
        fetchWindGrid();
        const id = setInterval(fetchWindGrid, REFRESH_MS);
        return () => clearInterval(id);
    }, [isVisible, mapLoaded, fetchWindGrid]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (canvasRef.current && canvasRef.current.parentNode) {
                canvasRef.current.parentNode.removeChild(canvasRef.current);
            }
        };
    }, []);

    const refresh = useCallback(() => {
        if (!visibleRef.current || !mapRef.current) return;
        if (mapRef.current.getLayer(layerId)) {
            mapRef.current.removeLayer(layerId);
        }
        mapRef.current.addLayer(customLayer.current);
        fetchWindGrid();
    }, [mapRef, fetchWindGrid]);

    const toggleWindLayer = useCallback(() => {
        useSwerveStore.getState().setWeatherLayer('wind', !visibleRef.current);
    }, []);

    return { isWindLayerVisible: isVisible, toggleWindLayer, refresh };
}
