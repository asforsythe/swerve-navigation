import { useCallback, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { getRoutes, getRouteDuration, getAdventureRoutes } from '../services/routingService';
import { getSafetyWeatherForRoute } from '../services/weatherService';
import { calculateRouteSafety, calculateAdventureScore } from '../utils/safetyEngine';
import { RouteLine } from '../map/RouteLine';
import { routeCamera } from '../map/style-overrides';
import useSwerveStore from '../store/useSwerveStore';

export function useRoutePlanning({ mapRef, speak, addToast, setIsSweeping }) {
    const [isRouting, setIsRouting] = useState(false);
    const [currentRouteGeometry, setCurrentRouteGeometry] = useState(null);
    const hazardMarkersRef = useRef([]);
    const animationRef = useRef(null);
    const routeLineRef = useRef(null); // cinema RouteLine instance
    const { setRouteTelemetry, setModeEtas, saveRoute, weather, setLastRouteReport, captureRouteMoment, setUiState, awardRoutePoints } = useSwerveStore();

    const clearHazardMarkers = useCallback(() => {
        hazardMarkersRef.current.forEach((m) => m.remove());
        hazardMarkersRef.current = [];
    }, []);

    const clearRouteLayers = useCallback(() => {
        if (!mapRef.current) return;
        // Remove cinema RouteLine
        if (routeLineRef.current) {
            routeLineRef.current.remove();
            routeLineRef.current = null;
        }
        // Remove alternative-route layers (indices 1+)
        for (let i = 0; i < 5; i++) {
            const sourceId = `route-alt-${i}`;
            const glowId = `route-alt-glow-${i}`;
            if (mapRef.current.getLayer(sourceId)) mapRef.current.removeLayer(sourceId);
            if (mapRef.current.getSource(sourceId)) mapRef.current.removeSource(sourceId);
            if (mapRef.current.getLayer(glowId)) mapRef.current.removeLayer(glowId);
            if (mapRef.current.getSource(glowId)) mapRef.current.removeSource(glowId);
        }
        clearHazardMarkers();
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }, [mapRef, clearHazardMarkers]);

    const drawRoutes = useCallback(
        /**
         * @param {Array}  routes        — all analyzed routes with .safety attached
         * @param {Object} [opts]
         * @param {Object} [opts.primaryRoute]  — override which route is featured (adventure)
         * @param {string} [opts.primaryColor]  — override route line color (e.g. '#f97316' for adventure)
         */
        (routes, { primaryRoute, primaryColor } = {}) => {
            if (!mapRef.current) return;
            clearRouteLayers();

            const fastest = [...routes].sort((a, b) => a.duration - b.duration)[0];
            const safest  = [...routes].sort((a, b) => b.safety.ssi - a.safety.ssi)[0];
            const primary = primaryRoute || safest;

            setCurrentRouteGeometry(primary.geometry);
            setRouteTelemetry({
                ssi:       primary.safety.ssi,
                traction:  primary.safety.traction,
                roadTemp:  weather.current?.roadTemp || weather.current?.temp,
                fastestSsi: fastest.safety.ssi,
                duration:  primary.duration,
                distance:  primary.distance,
            });

            // ── Alternative routes (thin, muted) ───────────────────────────────
            routes
                .filter((r) => r.geometry !== primary.geometry)
                .forEach((route, altIdx) => {
                    const isDangerous = route.safety.ssi < 70;
                    const sourceId = `route-alt-${altIdx}`;
                    const lineColor = isDangerous ? '#f97316' : '#374151';
                    const lineOpacity = isDangerous ? 0.60 : 0.28;

                    // Add hazard marker for dangerous alternatives
                    if (isDangerous && route.safety.worstPoint) {
                        const el = document.createElement('div');
                        el.className = 'marker-pulse flex items-center justify-center w-8 h-8 bg-rose-600 rounded-full border-2 border-white shadow-xl';
                        el.innerHTML = '<svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>';
                        const marker = new mapboxgl.Marker(el)
                            .setLngLat([route.safety.worstPoint.lng, route.safety.worstPoint.lat])
                            .addTo(mapRef.current);
                        hazardMarkersRef.current.push(marker);
                    }

                    if (!mapRef.current.getSource(sourceId)) {
                        mapRef.current.addSource(sourceId, { type: 'geojson', data: route.geometry });
                    } else {
                        mapRef.current.getSource(sourceId).setData(route.geometry);
                    }
                    if (!mapRef.current.getLayer(sourceId)) {
                        mapRef.current.addLayer({
                            id: sourceId, type: 'line', source: sourceId,
                            layout: { 'line-join': 'round', 'line-cap': 'round' },
                            paint: { 'line-color': lineColor, 'line-width': 3, 'line-opacity': lineOpacity },
                        });
                    }
                });

            // ── Primary route — cinema RouteLine ───────────────────────────────
            const rl = new RouteLine(mapRef.current);
            rl.draw(primary.geometry, { ssi: primary.safety.ssi, color: primaryColor });
            routeLineRef.current = rl;

            // ── Camera choreography ────────────────────────────────────────────
            if (primary.geometry?.coordinates?.length > 0) {
                const coords = primary.geometry.coordinates;
                const mid = coords[Math.floor(coords.length / 2)];
                const end = coords[coords.length - 1];
                const bearing = Math.atan2(end[0] - mid[0], end[1] - mid[1]) * (180 / Math.PI);
                routeCamera(mapRef.current, mid, { bearing, zoom: 14.5 });
            }
        },
        [mapRef, clearRouteLayers, setRouteTelemetry, weather]
    );

    const planRoute = useCallback(
        /**
         * @param {Array}  startCoords
         * @param {Array}  destCoords
         * @param {string} startLabel
         * @param {string} destLabel
         * @param {Object} [opts]
         * @param {'safe'|'adventure'} [opts.mode='safe']
         */
        async (startCoords, destCoords, startLabel, destLabel, { mode = 'safe' } = {}) => {
            const isAdventure = mode === 'adventure';
            try {
                setIsRouting(true);
                speak(isAdventure ? 'Swerve Adventure Mode: plotting the most thrilling path...' : 'Calculating safest route...');

                const routes = isAdventure
                    ? await getAdventureRoutes(startCoords, destCoords)
                    : await getRoutes(startCoords, destCoords);

                if (!routes || routes.length === 0) {
                    speak('Could not find a route to the destination.');
                    addToast?.({ message: 'No routes found', type: 'error' });
                    return;
                }

                // ── Analyze all routes (weather + safety) ────────────────────────
                const analyzedRoutes = [];
                for (const route of routes) {
                    const weatherPoints = await getSafetyWeatherForRoute(route.geometry);
                    const safetyResult = calculateRouteSafety(route, weatherPoints);
                    analyzedRoutes.push({ ...route, safety: safetyResult });
                }

                const fastest = [...analyzedRoutes].sort((a, b) => a.duration - b.duration)[0];

                // ── Select primary route ─────────────────────────────────────────
                let primary, finalAnnouncement;

                if (isAdventure) {
                    // Score each route for adventure
                    analyzedRoutes.forEach((r) => {
                        r.adventure = calculateAdventureScore(r, r.safety.ssi, fastest.distance);
                    });

                    const eligible = analyzedRoutes.filter((r) => !r.adventure.disqualified);

                    if (eligible.length === 0) {
                        // All routes SSI < 40 — safety override
                        primary = [...analyzedRoutes].sort((a, b) => b.safety.ssi - a.safety.ssi)[0];
                        addToast?.({ message: 'Conditions too dangerous for adventure — using safest path.', type: 'warning', duration: 4000 });
                        finalAnnouncement = `Safety override: conditions are critical on all paths. Routing you safely with SSI ${Math.round(primary.safety.ssi)}.`;
                    } else {
                        primary = eligible.sort((a, b) => b.adventure.as - a.adventure.as)[0];
                        const { as, adventureCategory, sinuosity } = primary.adventure;
                        const distMi = (primary.distance / 1609.34).toFixed(1);
                        finalAnnouncement = `Adventure route locked in. ${distMi} miles of ${adventureCategory.toLowerCase()} roads with a sinuosity factor of ${sinuosity}. Safety score ${Math.round(primary.safety.ssi)}. Follow the amber pulse — ride the thrill.`;
                    }

                    setIsSweeping(true);
                    drawRoutes(analyzedRoutes, {
                        primaryRoute: primary,
                        primaryColor: '#f97316', // amber-orange adventure line
                    });
                    // Merge adventure metrics into telemetry (drawRoutes set ssi/traction/etc already)
                    setRouteTelemetry({
                        adventureScore: primary.adventure?.as ?? null,
                        adventureCategory: primary.adventure?.adventureCategory ?? null,
                        isAdventureMode: true,
                    });

                } else {
                    // ── Safe mode (original behavior) ────────────────────────────
                    const safest = [...analyzedRoutes].sort((a, b) => b.safety.ssi - a.safety.ssi)[0];
                    primary = safest;

                    setIsSweeping(true);
                    drawRoutes(analyzedRoutes);
                    setRouteTelemetry({ adventureScore: null, adventureCategory: null, isAdventureMode: false });

                    finalAnnouncement = safest.safety.ttsMessage;
                    if (fastest.safety.ssi < 70 && safest.geometry !== fastest.geometry) {
                        const timeDiff = Math.round((safest.duration - fastest.duration) / 60);
                        const condition = fastest.safety.hazardType === 'Storm Cell' ? 'heavy rain' : 'weather hazards';
                        finalAnnouncement = `Primary route is impacted by ${condition}. Safer bypass is clear and only adds ${timeDiff} minutes to your ETA. Follow the cyan pulse for a safe heading.`;
                    } else if (safest.safety.ssi < 70) {
                        finalAnnouncement = `Swerve Safety Warning: All available paths contain weather hazards. Safest path has a score of ${Math.round(safest.safety.ssi)}. ${safest.safety.ttsMessage}`;
                    }
                }

                speak(finalAnnouncement);

                // Fetch ETAs for all travel modes (non-blocking)
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

                // ── Route center for thumbnails / share cards ─────────────────
                const coords  = primary.geometry?.coordinates || [];
                const midCoord = coords[Math.floor(coords.length / 2)] || null;

                // ── Route report (SafetyReportPanel) ─────────────────────────
                const routeReport = {
                    from: startLabel || 'Current Location',
                    to: destLabel,
                    ssi: primary.safety.ssi,
                    category: primary.safety.category,
                    hazardType: primary.safety.hazardType,
                    traction: primary.safety.traction,
                    distance: primary.distance,
                    duration: primary.duration,
                    centerLng: midCoord?.[0] ?? null,
                    centerLat: midCoord?.[1] ?? null,
                    isNight: primary.safety.isNight,
                    timestamp: Date.now(),
                    adventureScore: isAdventure ? (primary.adventure?.as ?? null) : null,
                    adventureCategory: isAdventure ? (primary.adventure?.adventureCategory ?? null) : null,
                    isAdventureMode: isAdventure,
                };
                setLastRouteReport(routeReport);
                setUiState({ showSafetyReport: true });

                // Capture moment for extreme SSI
                if (primary.safety.ssi >= 95 || primary.safety.ssi <= 60) {
                    captureRouteMoment({
                        ...routeReport,
                        type: primary.safety.ssi >= 95 ? 'perfect' : 'dangerous',
                        label: primary.safety.ssi >= 95 ? 'Perfect Run' : 'Danger Navigated',
                    });
                    setUiState({ showMomentCapture: true });
                }

                // Auto-save high-SSI routes
                if (primary.safety.ssi >= 80) {
                    saveRoute({
                        id: Date.now(),
                        start: startLabel || 'Current Location',
                        dest: destLabel,
                        ssi: primary.safety.ssi,
                        centerLng: midCoord?.[0] ?? null,
                        centerLat: midCoord?.[1] ?? null,
                    });
                    addToast?.({ message: `Route to ${destLabel} saved`, type: 'success' });
                }

                // Award points (adventure mode earns a bonus)
                const pointResult = awardRoutePoints({
                    ssi: primary.safety.ssi,
                    distance: primary.distance,
                    isGoldenDeparture: false,
                });
                if (pointResult?.earned) {
                    const adventureBonus = isAdventure ? ' (adventure bonus included)' : '';
                    addToast?.({
                        message: `+${pointResult.earned} pts${pointResult.leveledUp ? ' — Level Up! 🎉' : ''}${adventureBonus}`,
                        type: 'success',
                        duration: 2500,
                    });
                    if (pointResult.newBadgeIds?.length) {
                        const BADGE_NAMES = {
                            'first-route': 'First Route 🚗', 'safe-driver': 'Safe Driver 🛡️',
                            'storm-chaser': 'Storm Chaser ⛈️', 'streak-3': '3-Day Streak 🔥',
                            'streak-7': 'Week Warrior ⚡', 'golden-window': 'Golden Window ⭐',
                            'centurion': 'Road Centurion 💯', 'scout-rank': 'Scout Rank 🔵',
                            'ranger-rank': 'Ranger Rank 💜', 'guardian-rank': 'Guardian Rank 🌟',
                            'legend-rank': 'Legend 🏆',
                        };
                        pointResult.newBadgeIds.forEach((id) => {
                            addToast?.({ message: `Badge unlocked: ${BADGE_NAMES[id] || id}`, type: 'success', duration: 3500 });
                        });
                    }
                }
            } catch (error) {
                console.error('[Swerve Route] Planning error:', error);
                speak('An error occurred while calculating the route.');
                addToast?.({ message: 'Route calculation failed', type: 'error' });
            } finally {
                setIsRouting(false);
            }
        },
        [speak, drawRoutes, saveRoute, addToast, setIsSweeping, setModeEtas, setLastRouteReport, captureRouteMoment, setUiState, awardRoutePoints, setRouteTelemetry]
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
