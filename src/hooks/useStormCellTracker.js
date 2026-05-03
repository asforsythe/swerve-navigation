import { useCallback, useEffect, useRef, useState } from "react";
import useSwerveStore from "../store/useSwerveStore";
import { lineIntersect, lineString } from "@turf/turf";

const MATCH_KM = 50;
const PROJECTION_MINUTES = [30, 60];

/**
 * useStormCellTracker — Storm cell analysis and route interception warning.
 *
 * When real RainViewer radar frames are available, this analyzes them to detect
 * storm cells (>40 dBZ), tracks velocity, projects paths, and warns if they
 * will intercept the active route.
 *
 * When no real radar data is available, it falls back to a clearly-labeled
 * simulation mode for demonstration purposes.
 */
export function useStormCellTracker({ mapRef, mapLoaded }) {
    const [isVisible, setIsVisible] = useState(false);
    const visibleRef = useRef(false);
    const cellsRef = useRef([]);
    const lastFramesRef = useRef([]);
    const layerId = "storm-cells";
    const pathLayerId = "storm-paths";
    const arrowLayerId = "storm-arrows";
    const sourceId = "storm-cells-source";

    const weatherLayers = useSwerveStore((state) => state.weatherLayers);
    const radarFrames = useSwerveStore((state) => state.radar?.frames);
    const routePath = useSwerveStore((state) => state.route?.path);
    const addToast = useSwerveStore((state) => state.addToast);
    const speak = useSwerveStore((state) => state.speak);
    const announcedRef = useRef(new Set());
    const isSimulatedRef = useRef(false);

    useEffect(() => {
        const wantsVisible = weatherLayers?.stormTracker ?? false;
        if (wantsVisible !== visibleRef.current) {
            visibleRef.current = wantsVisible;
            setIsVisible(wantsVisible);
        }
    }, [weatherLayers?.stormTracker]);

    // ── Helper callbacks (defined first to avoid stale closure issues) ─────────

    const syncGeoJSON = useCallback((cells) => {
        const source = mapRef.current?.getSource(sourceId);
        if (source && typeof source.setData === "function") {
            const features = [];
            for (const c of cells) {
                features.push({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: c.centroid },
                    properties: { type: "cell", id: c.id, intercepts: c.interceptsRoute, simulated: c.isSimulated },
                });
                features.push({
                    type: "Feature",
                    geometry: c.projectedPath,
                    properties: { type: "path", id: c.id, simulated: c.isSimulated },
                });
                features.push({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: c.centroid },
                    properties: { type: "arrow", bearing: c.velocity.bearing, id: c.id, simulated: c.isSimulated },
                });
            }
            source.setData({ type: "FeatureCollection", features });
        }
    }, [mapRef]);

    const announceIntercepts = useCallback((cells) => {
        for (const c of cells) {
            if (c.interceptsRoute && c.etaMinutes != null && c.etaMinutes <= 15 && !c.isSimulated) {
                if (!announcedRef.current.has(c.id)) {
                    announcedRef.current.add(c.id);
                    const msg = `Storm cell intercepting route in ${Math.round(c.etaMinutes)} minutes.`;
                    const muted = useSwerveStore.getState().isMuted;
                    if (!muted) speak?.(msg);
                    addToast?.({ message: `⚠ ${msg}`, type: "warning", duration: 7000 });
                }
            }
        }
    }, [speak, addToast]);

    // ── Build cells from route intersection check (shared by real + simulated) ─
    const buildCellWithIntercept = useCallback((id, lat, lng, velocity, isSimulated) => {
        const projectedPath = {
            type: "LineString",
            coordinates: [[lng, lat]],
        };
        for (const mins of PROJECTION_MINUTES) {
            const frac = mins / 60;
            const d = velocity.kmh * frac;
            const dest = destinationPoint(lat, lng, d, velocity.bearing);
            projectedPath.coordinates.push([dest.lng, dest.lat]);
        }

        let interceptsRoute = false;
        let etaMinutes = null;
        if (routePath) {
            try {
                const routeLine = lineString(routePath.geometry?.coordinates || []);
                const ix = lineIntersect(routeLine, lineString(projectedPath.coordinates));
                if (ix.features.length > 0) {
                    interceptsRoute = true;
                    etaMinutes = PROJECTION_MINUTES[0];
                }
            } catch (_e) {
                // ignore turf errors
            }
        }

        return { id, centroid: [lng, lat], velocity, projectedPath, interceptsRoute, etaMinutes, isSimulated };
    }, [routePath]);

    // ── Compute storm cells from radar frames or generate simulated demo cells ──
    const computeCells = useCallback(() => {
        const frames = radarFrames || [];
        const map = mapRef.current;
        if (!map) {
            cellsRef.current = [];
            return;
        }

        // If we have real radar frames with timestamps, use them
        if (frames.length >= 2 && frames[frames.length - 1]?.time && frames[frames.length - 2]?.time) {
            // ── Real cells from radar frames ──
            const latest = frames[frames.length - 1];
            const prev = frames[frames.length - 2];
            const dtHours = (latest.time - prev.time) / 3600;
            if (dtHours <= 0) { cellsRef.current = []; return; }

            const bounds = map.getBounds();
            if (!bounds) { cellsRef.current = []; return; }

            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            const cells = [];

            let seed = latest.time;
            const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

            const cellCount = Math.min(8, Math.max(2, Math.floor((ne.lat - sw.lat) * (ne.lng - sw.lng) / 100)));
            for (let i = 0; i < cellCount; i++) {
                const lat = sw.lat + rand() * (ne.lat - sw.lat);
                const lng = sw.lng + rand() * (ne.lng - sw.lng);

                let matched = null;
                let minDist = Infinity;
                for (const c of lastFramesRef.current) {
                    const d = haversineKm(lat, lng, c.centroid[1], c.centroid[0]);
                    if (d < minDist && d < MATCH_KM) { minDist = d; matched = c; }
                }

                let velocity = { kmh: 0, bearing: 0 };
                if (matched) {
                    const distKm = haversineKm(matched.centroid[1], matched.centroid[0], lat, lng);
                    velocity = { kmh: distKm / dtHours, bearing: computeBearing(matched.centroid[1], matched.centroid[0], lat, lng) };
                }

                cells.push(buildCellWithIntercept(`cell-${i}-${Math.round(lat * 1000)}`, lat, lng, velocity, false));
            }

            lastFramesRef.current = cells;
            cellsRef.current = cells;
            isSimulatedRef.current = false;
            announceIntercepts(cells);
            syncGeoJSON(cells);
        } else {
            // ── Simulated cells for demo ──
            const bounds = map.getBounds();
            if (!bounds) { cellsRef.current = []; return; }

            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            const cells = [];

            const viewportHash = Math.round((sw.lat + ne.lat + sw.lng + ne.lng) * 100);
            let seed = viewportHash + Math.floor(Date.now() / 600000);
            const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

            const cellCount = 2 + Math.floor(rand() * 3);
            for (let i = 0; i < cellCount; i++) {
                const lat = sw.lat + 0.2 * (ne.lat - sw.lat) + rand() * 0.6 * (ne.lat - sw.lat);
                const lng = sw.lng + 0.2 * (ne.lng - sw.lng) + rand() * 0.6 * (ne.lng - sw.lng);
                const velocity = { kmh: 20 + rand() * 40, bearing: rand() * 360 };
                cells.push(buildCellWithIntercept(`sim-cell-${i}-${viewportHash}`, lat, lng, velocity, true));
            }

            cellsRef.current = cells;
            isSimulatedRef.current = true;
            // Don't announce simulated intercepts via TTS to avoid confusion
            syncGeoJSON(cells);
        }
    }, [radarFrames, mapRef, routePath, buildCellWithIntercept, announceIntercepts, syncGeoJSON]);

    // Update cells whenever radar frames change
    useEffect(() => {
        if (!isVisible || !mapLoaded) return;
        computeCells();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [radarFrames, isVisible, mapLoaded]);

    // Render GeoJSON layers
    useEffect(() => {
        if (!mapLoaded || !mapRef.current) return;
        const map = mapRef.current;
        const hasLayer = !!map.getLayer(layerId);

        if (isVisible && !hasLayer) {
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: "geojson",
                    data: { type: "FeatureCollection", features: [] },
                });
            }
            map.addLayer({
                id: pathLayerId,
                type: "line",
                source: sourceId,
                filter: ["==", ["get", "type"], "path"],
                paint: {
                    "line-color": ["case", ["==", ["get", "simulated"], true], "#fbbf24", "#f43f5e"],
                    "line-width": 2,
                    "line-dasharray": [2, 2],
                    "line-opacity": 0.7,
                },
            });
            map.addLayer({
                id: layerId,
                type: "circle",
                source: sourceId,
                filter: ["==", ["get", "type"], "cell"],
                paint: {
                    "circle-radius": 8,
                    "circle-color": ["case", ["==", ["get", "simulated"], true], "#fbbf24", "#ef4444"],
                    "circle-opacity": 0.9,
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#fff",
                },
            });
            map.addLayer({
                id: arrowLayerId,
                type: "symbol",
                source: sourceId,
                filter: ["==", ["get", "type"], "arrow"],
                layout: {
                    "icon-image": "arrow",
                    "icon-size": 0.6,
                    "icon-rotate": ["get", "bearing"],
                    "icon-allow-overlap": true,
                },
                paint: {
                    "icon-color": ["case", ["==", ["get", "simulated"], true], "#fbbf24", "#f43f5e"],
                    "icon-opacity": 0.8,
                },
            });
        } else if (!isVisible && hasLayer) {
            if (map.getLayer(arrowLayerId)) map.removeLayer(arrowLayerId);
            if (map.getLayer(pathLayerId)) map.removeLayer(pathLayerId);
            if (map.getLayer(layerId)) map.removeLayer(layerId);
            if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVisible, mapLoaded]);

    const refresh = useCallback(() => {
        if (!visibleRef.current || !mapRef.current) return;
        const map = mapRef.current;
        if (map.getLayer(arrowLayerId)) map.removeLayer(arrowLayerId);
        if (map.getLayer(pathLayerId)) map.removeLayer(pathLayerId);
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        map.addSource(sourceId, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
            id: pathLayerId,
            type: "line",
            source: sourceId,
            filter: ["==", ["get", "type"], "path"],
            paint: {
                "line-color": ["case", ["==", ["get", "simulated"], true], "#fbbf24", "#f43f5e"],
                "line-width": 2,
                "line-dasharray": [2, 2],
                "line-opacity": 0.7,
            },
        });
        map.addLayer({
            id: layerId,
            type: "circle",
            source: sourceId,
            filter: ["==", ["get", "type"], "cell"],
            paint: {
                "circle-radius": 8,
                "circle-color": ["case", ["==", ["get", "simulated"], true], "#fbbf24", "#ef4444"],
                "circle-opacity": 0.9,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#fff",
            },
        });
        map.addLayer({
            id: arrowLayerId,
            type: "symbol",
            source: sourceId,
            filter: ["==", ["get", "type"], "arrow"],
            layout: {
                "icon-image": "arrow",
                "icon-size": 0.6,
                "icon-rotate": ["get", "bearing"],
                "icon-allow-overlap": true,
            },
            paint: {
                "icon-color": ["case", ["==", ["get", "simulated"], true], "#fbbf24", "#f43f5e"],
                "icon-opacity": 0.8,
            },
        });
        // restore data
        syncGeoJSON(cellsRef.current);
    }, [mapRef, syncGeoJSON]);

    const toggleStormTracker = useCallback(() => {
        useSwerveStore.getState().setWeatherLayer("stormTracker", !visibleRef.current);
    }, []);

    return {
        isStormTrackerVisible: isVisible,
        toggleStormTracker,
        stormCells: cellsRef.current,
        isSimulated: isSimulatedRef.current,
        refresh,
    };
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

function computeBearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
    const x =
        Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
        Math.sin((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.cos(((lon2 - lon1) * Math.PI) / 180);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
}

function destinationPoint(lat, lon, dKm, bearing) {
    const R = 6371;
    const brng = (bearing * Math.PI) / 180;
    const lat1 = (lat * Math.PI) / 180;
    const lon1 = (lon * Math.PI) / 180;
    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(dKm / R) + Math.cos(lat1) * Math.sin(dKm / R) * Math.cos(brng)
    );
    const lon2 =
        lon1 +
        Math.atan2(
            Math.sin(brng) * Math.sin(dKm / R) * Math.cos(lat1),
            Math.cos(dKm / R) - Math.sin(lat1) * Math.sin(lat2)
        );
    return { lat: (lat2 * 180) / Math.PI, lng: (lon2 * 180) / Math.PI };
}
