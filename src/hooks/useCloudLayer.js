import { useCallback, useEffect, useRef, useState } from 'react';
import useSwerveStore from '../store/useSwerveStore';

const CLOUD_GRID_STEP = 0.6; // degrees
const MIN_ZOOM_GRID = 6;
const REFRESH_MS = 300000; // 5 min

/**
 * useCloudLayer — Canvas-drawn semi-transparent cloud cover overlay.
 * Fetches Open-Meteo cloud_cover % on a lat/lng grid and renders a grey
 * raster heatmap via Mapbox CustomLayerInterface.
 */
export function useCloudLayer({ mapRef, mapLoaded }) {
    const [isVisible, setIsVisible] = useState(false);
    const visibleRef = useRef(false);
    const gridRef = useRef([]);
    const canvasRef = useRef(null);
    const layerId = 'cloud-cover-layer';

    const weatherLayers = useSwerveStore((state) => state.weatherLayers);

    useEffect(() => {
        const wantsVisible = weatherLayers?.clouds ?? false;
        if (wantsVisible !== visibleRef.current) {
            visibleRef.current = wantsVisible;
            setIsVisible(wantsVisible);
        }
    }, [weatherLayers?.clouds]);

    const fetchCloudGrid = useCallback(async () => {
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

        const step = Math.max(0.2, CLOUD_GRID_STEP / Math.max(1, zoom - 5));
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
            const ratio = Math.ceil(lats.length / 100);
            const fLats = [];
            const fLngs = [];
            for (let i = 0; i < lats.length; i += ratio) {
                fLats.push(lats[i]);
                fLngs.push(lngs[i]);
            }
            lats.length = 0;
            lngs.length = 0;
            lats.push(...fLats);
            lngs.push(...fLngs);
        }

        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lngs.join(',')}&current=cloud_cover`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
            const data = await res.json();
            const results = Array.isArray(data) ? data : [data];
            gridRef.current = results.map((r, i) => ({
                lat: Number(lats[i]),
                lng: Number(lngs[i]),
                cover: r.current?.cloud_cover ?? 0,
            }));
        } catch (e) {
            console.error('[Swerve Clouds] Fetch error:', e);
        }
    }, [mapRef]);

    const customLayer = useRef({
        id: layerId,
        type: 'custom',
        renderingMode: '2d',
        onAdd(map) {
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
        },
        onRemove(map) {
            if (canvasRef.current) {
                map.getCanvasContainer().removeChild(canvasRef.current);
                canvasRef.current = null;
            }
        },
        render() {
            const canvas = canvasRef.current;
            if (!canvas || !mapRef.current) return;
            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);
            if (!visibleRef.current || gridRef.current.length === 0) return;

            const map = mapRef.current;
            for (const p of gridRef.current) {
                const px = map.project([p.lng, p.lat]);
                if (px.x < -30 || px.x > w + 30 || px.y < -30 || px.y > h + 30) continue;
                const radius = Math.max(20, 60 - map.getZoom() * 2);
                const alpha = (p.cover / 100) * 0.35;
                if (alpha < 0.02) continue;
                const grad = ctx.createRadialGradient(px.x, px.y, 0, px.x, px.y, radius);
                grad.addColorStop(0, `rgba(180,180,200,${alpha})`);
                grad.addColorStop(1, `rgba(180,180,200,0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(px.x, px.y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        },
    });

    useEffect(() => {
        if (!mapLoaded || !mapRef.current) return;
        const map = mapRef.current;
        const hasLayer = !!map.getLayer(layerId);

        if (isVisible && !hasLayer) {
            map.addLayer(customLayer.current);
            fetchCloudGrid();
        } else if (!isVisible && hasLayer) {
            map.removeLayer(layerId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVisible, mapLoaded]);

    useEffect(() => {
        if (!isVisible || !mapLoaded) return;
        fetchCloudGrid();
        const id = setInterval(fetchCloudGrid, REFRESH_MS);
        return () => clearInterval(id);
    }, [isVisible, mapLoaded, fetchCloudGrid]);

    useEffect(() => {
        return () => {
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
        fetchCloudGrid();
    }, [mapRef, fetchCloudGrid]);

    const toggleCloudLayer = useCallback(() => {
        useSwerveStore.getState().setWeatherLayer('clouds', !visibleRef.current);
    }, []);

    return { isCloudLayerVisible: isVisible, toggleCloudLayer, refresh };
}
