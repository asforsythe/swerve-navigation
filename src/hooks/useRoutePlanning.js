import { useCallback, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { getRoutes, getRouteDuration } from '../services/routingService';
import { getSafetyWeatherForRoute } from '../services/weatherService';
import { calculateRouteSafety } from '../utils/safetyEngine';
import useSwerveStore from '../store/useSwerveStore';

export function useRoutePlanning({ mapRef, speak, addToast, setIsSweeping }) {
    const [isRouting, setIsRouting] = useState(false);
    const [currentRouteGeometry, setCurrentRouteGeometry] = useState(null);
    const hazardMarkersRef = useRef([]);
    const animationRef = useRef(null);
    const { setRouteTelemetry, setModeEtas, saveRoute, weather, setLastRouteReport, captureRouteMoment, setUiState } = useSwerveStore();

    const clearHazardMarkers = useCallback(() => {
        hazardMarkersRef.current.forEach((m) => m.remove());
        hazardMarkersRef.current = [];
    }, []);

    const clearRouteLayers = useCallback(() => {
        if (!mapRef.current) return;
        for (let i = 0; i < 5; i++) {
            const sourceId = `route-${i}`;
            const glowId = `route-glow-${i}`;
            if (mapRef.current.getLayer(sourceId)) mapRef.current.removeLayer(sourceId);
            if (mapRef.current.getSource(sourceId)) mapRef.current.removeSource(sourceId);
            if (mapRef.current.getLayer(glowId)) mapRef.current.removeLayer(glowId);
            if (mapRef.current.getSource(glowId)) mapRef.current.removeSource(glowId);
        }
        clearHazardMarkers();
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }, [mapRef, clearHazardMarkers]);

    const drawRoutes = useCallback(
        (routes) => {
            if (!mapRef.current) return;
            clearRouteLayers();

            const fastest = [...routes].sort((a, b) => a.duration - b.duration)[0];
            const safest = [...routes].sort((a, b) => b.safety.ssi - a.safety.ssi)[0];

            setCurrentRouteGeometry(safest.geometry);
            setRouteTelemetry({
                ssi: safest.safety.ssi,
                traction: safest.safety.traction,
                roadTemp: weather.current?.roadTemp || weather.current?.temp,
                fastestSsi: fastest.safety.ssi,
                duration: safest.duration,
                distance: safest.distance,
            });

            routes.forEach((route, index) => {
                const sourceId = `route-${index}`;
                const glowId = `route-glow-${index}`;

                const isFastest = route.geometry === fastest.geometry;
                const isSafest = route.geometry === safest.geometry;
                const isDangerous = route.safety.ssi < 70;

                let lineColor = isSafest ? '#00f2ff' : '#4b5563';
                let lineWidth = isSafest ? 6 : 3;
                let lineOpacity = isSafest ? 1 : 0.35;
                let glowColor = isSafest ? 'rgba(0, 242, 255, 0.25)' : 'transparent';
                let glowWidth = isSafest ? 16 : 0;

                if (isDangerous && isFastest) {
                    lineColor = '#f59e0b';
                    lineWidth = 3;
                    lineOpacity = 0.7;
                    glowColor = 'rgba(245, 158, 11, 0.15)';
                    glowWidth = 10;
                }

                // Add hazard marker
                if (isDangerous && route.safety.worstPoint) {
                    const el = document.createElement('div');
                    el.className =
                        'marker-pulse flex items-center justify-center w-8 h-8 bg-rose-600 rounded-full border-2 border-white shadow-xl';
                    el.innerHTML =
                        '<svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>';
                    const marker = new mapboxgl.Marker(el)
                        .setLngLat([route.safety.worstPoint.lng, route.safety.worstPoint.lat])
                        .addTo(mapRef.current);
                    hazardMarkersRef.current.push(marker);
                }

                // Glow layer beneath
                if (glowWidth > 0) {
                    mapRef.current.addSource(glowId, { type: 'geojson', data: route.geometry });
                    mapRef.current.addLayer({
                        id: glowId,
                        type: 'line',
                        source: glowId,
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: {
                            'line-color': glowColor,
                            'line-width': glowWidth,
                            'line-opacity': 0.6,
                            'line-blur': 8,
                        },
                    });
                }

                // Main route line
                if (mapRef.current.getSource(sourceId)) {
                    mapRef.current.getSource(sourceId).setData(route.geometry);
                } else {
                    mapRef.current.addSource(sourceId, { type: 'geojson', data: route.geometry });
                    mapRef.current.addLayer({
                        id: sourceId,
                        type: 'line',
                        source: sourceId,
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: {
                            'line-color': lineColor,
                            'line-width': lineWidth,
                            'line-opacity': lineOpacity,
                        },
                    });
                }

                // Animate safest route drawing
                if (isSafest) {
                    let startTime = Date.now();
                    const drawDuration = 1500;

                    const animateDraw = () => {
                        const elapsed = Date.now() - startTime;
                        const progress = Math.min(elapsed / drawDuration, 1);

                        if (mapRef.current.getSource(sourceId)) {
                            mapRef.current.setPaintProperty(sourceId, 'line-width', lineWidth * (0.5 + 0.5 * progress));
                        }

                        if (progress < 1) {
                            animationRef.current = requestAnimationFrame(animateDraw);
                        }
                    };
                    animateDraw();
                }
            });

            // Fit bounds to safest route
            if (safest.geometry?.coordinates?.length > 0) {
                const bounds = new mapboxgl.LngLatBounds();
                safest.geometry.coordinates.forEach((coord) => bounds.extend(coord));
                mapRef.current.fitBounds(bounds, { padding: 100, duration: 1200, pitch: 50 });
            }
        },
        [mapRef, clearRouteLayers, setRouteTelemetry, weather]
    );

    const planRoute = useCallback(
        async (startCoords, destCoords, startLabel, destLabel) => {
            try {
                setIsRouting(true);
                speak('Calculating safest route...');

                const routes = await getRoutes(startCoords, destCoords);
                if (!routes || routes.length === 0) {
                    speak('Could not find a route to the destination.');
                    addToast?.({ message: 'No routes found', type: 'error' });
                    return;
                }

                const analyzedRoutes = [];
                for (const route of routes) {
                    const weatherPoints = await getSafetyWeatherForRoute(route.geometry);
                    const safetyResult = calculateRouteSafety(route, weatherPoints);
                    analyzedRoutes.push({ ...route, safety: safetyResult });
                }

                const safest = [...analyzedRoutes].sort((a, b) => b.safety.ssi - a.safety.ssi)[0];
                const fastest = [...analyzedRoutes].sort((a, b) => a.duration - b.duration)[0];

                setIsSweeping(true);
                drawRoutes(analyzedRoutes);

                // Fetch ETAs for all travel modes in parallel (non-blocking — does not block route display)
                Promise.all([
                    getRouteDuration(startCoords, destCoords, 'driving'),
                    getRouteDuration(startCoords, destCoords, 'cycling'),
                    getRouteDuration(startCoords, destCoords, 'walking'),
                ]).then(([driving, cycling, walking]) => {
                    setModeEtas({
                        driving: driving?.duration ?? null,
                        cycling: cycling?.duration ?? null,
                        walking: walking?.duration ?? null,
                    });
                });

                let finalAnnouncement = safest.safety.ttsMessage;

                if (fastest.safety.ssi < 70 && safest.geometry !== fastest.geometry) {
                    const timeDiff = Math.round((safest.duration - fastest.duration) / 60);
                    const condition =
                        fastest.safety.hazardType === 'Storm Cell' ? 'heavy rain' : 'weather hazards';
                    finalAnnouncement = `Primary route is impacted by ${condition}. Safer bypass is clear and only adds ${timeDiff} minutes to your ETA. Follow the cyan pulse for a safe heading.`;
                } else if (safest.safety.ssi < 70) {
                    finalAnnouncement = `Swerve Safety Warning: All available paths contain weather hazards. Safest path has a score of ${Math.round(safest.safety.ssi)}. ${safest.safety.ttsMessage}`;
                }

                speak(finalAnnouncement);

                // Compute route center for map thumbnails and share cards
                const coords = safest.geometry?.coordinates || [];
                const midCoord = coords[Math.floor(coords.length / 2)] || null;

                // Store full route report for SafetyReportPanel
                const routeReport = {
                    from: startLabel || 'Current Location',
                    to: destLabel,
                    ssi: safest.safety.ssi,
                    category: safest.safety.category,
                    hazardType: safest.safety.hazardType,
                    traction: safest.safety.traction,
                    distance: safest.distance,
                    duration: safest.duration,
                    centerLng: midCoord?.[0] ?? null,
                    centerLat: midCoord?.[1] ?? null,
                    isNight: safest.safety.isNight,
                    timestamp: Date.now(),
                };
                setLastRouteReport(routeReport);
                setUiState({ showSafetyReport: true });

                // Capture moment for extreme routes
                if (safest.safety.ssi >= 95 || safest.safety.ssi <= 60) {
                    captureRouteMoment({
                        ...routeReport,
                        type: safest.safety.ssi >= 95 ? 'perfect' : 'dangerous',
                        label: safest.safety.ssi >= 95 ? 'Perfect Run' : 'Danger Navigated',
                    });
                    setUiState({ showMomentCapture: true });
                }

                if (safest.safety.ssi >= 80) {
                    saveRoute({
                        id: Date.now(),
                        start: startLabel || 'Current Location',
                        dest: destLabel,
                        ssi: safest.safety.ssi,
                        centerLng: midCoord?.[0] ?? null,
                        centerLat: midCoord?.[1] ?? null,
                    });
                    addToast?.({ message: `Route to ${destLabel} saved`, type: 'success' });
                }
            } catch (error) {
                console.error('[Swerve Route] Planning error:', error);
                speak('An error occurred while calculating the route.');
                addToast?.({ message: 'Route calculation failed', type: 'error' });
            } finally {
                setIsRouting(false);
            }
        },
        [speak, drawRoutes, saveRoute, addToast, setIsSweeping, setModeEtas, setLastRouteReport, captureRouteMoment, setUiState]
    );

    return {
        isRouting,
        currentRouteGeometry,
        planRoute,
        clearRouteLayers,
        clearHazardMarkers,
        drawRoutes,
    };
}
