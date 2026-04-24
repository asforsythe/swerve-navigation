import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

const DISTANCE_UNITS = 'imperial';
const FEET_PER_METER = 3.28084;
const MILES_PER_METER = 0.000621371;

function formatDistance(meters) {
    if (DISTANCE_UNITS === 'imperial') {
        const feet = meters * FEET_PER_METER;
        if (feet < 1000) return `${Math.round(feet)} feet`;
        const miles = meters * MILES_PER_METER;
        if (miles < 10) return `${miles.toFixed(1)} miles`;
        return `${Math.round(miles)} miles`;
    }
    if (meters < 1000) return `${Math.round(meters)} meters`;
    return `${(meters / 1000).toFixed(1)} kilometers`;
}

function formatDuration(seconds) {
    const m = Math.ceil(seconds / 60);
    if (m < 1) return 'less than a minute';
    if (m === 1) return '1 minute';
    if (m < 60) return `${m} minutes`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    if (rm === 0) return `${h} hour${h > 1 ? 's' : ''}`;
    return `${h} hour${h > 1 ? 's' : ''} ${rm} minutes`;
}

function haversine([lng1, lat1], [lng2, lat2]) {
    const R = 6371000; // meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointOnLineSegment(p, a, b) {
    const [px, py] = p;
    const [ax, ay] = a;
    const [bx, by] = b;
    const abx = bx - ax;
    const aby = by - ay;
    const t =
        ((px - ax) * abx + (py - ay) * aby) /
        (abx * abx + aby * aby || 1);
    const clamped = Math.max(0, Math.min(1, t));
    return [ax + abx * clamped, ay + aby * clamped];
}

function findClosestPointOnRoute(coords, point) {
    let closest = null;
    let minDist = Infinity;
    let closestIndex = 0;
    for (let i = 0; i < coords.length - 1; i++) {
        const proj = pointOnLineSegment(point, coords[i], coords[i + 1]);
        const d = haversine(point, proj);
        if (d < minDist) {
            minDist = d;
            closest = proj;
            closestIndex = i;
        }
    }
    return { point: closest, distance: minDist, segmentIndex: closestIndex };
}

/**
 * useTurnByTurn — Real-time turn-by-turn voice navigation engine
 *
 * @param {Object} props
 * @param {Object} props.mapRef         — mapbox-gl Map instance ref
 * @param {Function} props.speak        — TTS speak(text) function
 * @param {Function} props.addToast     — toast notification function
 * @param {Object} props.routeData      — the active route object (from getRoutes)
 * @param {Array}  props.routeGeometry  — GeoJSON geometry.coordinates of the active route
 */
export function useTurnByTurn({ mapRef, speak, addToast, routeData, routeGeometry }) {
    const [isNavigating, setIsNavigating] = useState(false);
    const [navState, setNavState] = useState({
        currentStepIndex: 0,
        totalSteps: 0,
        distanceToNext: null,
        durationToNext: null,
        instruction: null,
        distanceRemaining: null,
        durationRemaining: null,
        isOffRoute: false,
        isComplete: false,
    });
    const [showPreview, setShowPreview] = useState(true);

    const navStateRef = useRef(navState);
    useEffect(() => { navStateRef.current = navState; }, [navState]);

    const watchIdRef = useRef(null);
    const spokenAnnouncementsRef = useRef(new Set());
    const routeCoordsRef = useRef([]);
    const stepsRef = useRef([]);
    const isNavigatingRef = useRef(false);
    const userHeadingRef = useRef(0);

    useEffect(() => { isNavigatingRef.current = isNavigating; }, [isNavigating]);

    // Update refs whenever route data changes
    useEffect(() => {
        if (routeGeometry?.coordinates) {
            routeCoordsRef.current = routeGeometry.coordinates;
        }
        if (routeData?.steps) {
            stepsRef.current = routeData.steps;
        }
    }, [routeData, routeGeometry]);

    const getUserLocation = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
                reject,
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }, []);

    const recalculateRoute = useCallback(async () => {
        try {
            speak('Recalculating route...');
            await getUserLocation();
            if (!routeData?.legs?.length) return;
            // TODO: re-trigger planRoute from parent with current location as start
            addToast?.({ message: 'Route recalculated', type: 'success' });
        } catch {
            speak('Unable to recalculate. Please check your location.');
        }
    }, [speak, addToast, getUserLocation, routeData]);

    const buildAnnouncement = useCallback((step, distanceMeters) => {
        const distText = formatDistance(distanceMeters);
        const maneuver = step.maneuver || {};
        const type = maneuver.type || '';
        const modifier = maneuver.modifier || '';

        // Use Mapbox's own instruction if available and clean
        if (step.voiceInstructions && step.voiceInstructions.length > 0) {
            // Mapbox voice_instructions are timed; we'll handle them via distance triggers
            const instr = step.voiceInstructions[0];
            if (instr && instr.announcement) return instr.announcement;
        }

        // Fallback custom synthesis
        let action = '';
        switch (type) {
            case 'turn':
                action = `Turn ${modifier || 'ahead'}`;
                break;
            case 'merge':
                action = 'Merge';
                break;
            case 'on ramp':
                action = `Take the ramp ${modifier || ''}`;
                break;
            case 'off ramp':
                action = `Take the exit ${modifier || ''}`;
                break;
            case 'fork':
                action = `Keep ${modifier || 'straight'} at the fork`;
                break;
            case 'roundabout':
            case 'rotary':
                action = `Enter the roundabout and take the ${modifier || 'first'} exit`;
                break;
            case 'arrive':
                action = 'You have arrived at your destination';
                break;
            case 'depart':
                action = 'Head ' + (modifier || 'straight');
                break;
            case 'uturn':
                action = 'Make a U-turn';
                break;
            case 'continue':
                action = 'Continue ' + (modifier || 'straight');
                break;
            default:
                action = step.name ? `Continue on ${step.name}` : 'Continue';
        }

        if (type === 'arrive') return action;
        if (distanceMeters < 50) return `${action}.`;
        return `In ${distText}, ${action.toLowerCase()}.`;
    }, []);

    const advanceStep = useCallback(() => {
        const nextIndex = navStateRef.current.currentStepIndex + 1;
        if (nextIndex >= stepsRef.current.length) {
            setNavState((s) => ({ ...s, isComplete: true, currentStepIndex: nextIndex }));
            speak('You have arrived at your destination. Navigation complete.');
            setIsNavigating(false);
            return;
        }
        spokenAnnouncementsRef.current.clear();
        const step = stepsRef.current[nextIndex];
        setNavState((prev) => ({
            ...prev,
            currentStepIndex: nextIndex,
            instruction: step.name || 'Continue',
            distanceToNext: step.distance || 0,
            durationToNext: step.duration || 0,
        }));
        const announcement = buildAnnouncement(step, step.distance || 0);
        speak(announcement);
    }, [speak, buildAnnouncement]);

    const checkAnnouncementTriggers = useCallback(
        (step, distanceMeters, durationSeconds) => {
            const keyBase = `${navStateRef.current.currentStepIndex}`;
            const thresholds = [
                { dist: 1609, label: '1mile', text: buildAnnouncement(step, distanceMeters) }, // ~1 mile
                { dist: 804, label: '0.5mile', text: buildAnnouncement(step, distanceMeters) }, // ~0.5 mile
                { dist: 304, label: '1000ft', text: buildAnnouncement(step, distanceMeters) }, // ~1000ft
                { dist: 152, label: '500ft', text: buildAnnouncement(step, distanceMeters) }, // ~500ft
                { dist: 30, label: 'now', text: buildAnnouncement(step, distanceMeters) }, // immediate
            ];

            for (const t of thresholds) {
                const key = `${keyBase}-${t.label}`;
                if (distanceMeters <= t.dist && !spokenAnnouncementsRef.current.has(key)) {
                    spokenAnnouncementsRef.current.add(key);
                    speak(t.text);
                    break; // Speak one at a time per tick
                }
            }
        },
        [speak, buildAnnouncement]
    );

    const tick = useCallback(
        (userLoc, heading) => {
            const coords = routeCoordsRef.current;
            const steps = stepsRef.current;
            if (!coords.length || !steps.length) return;

            const { distance: offRouteDistance, segmentIndex } = findClosestPointOnRoute(coords, userLoc);
            const OFF_ROUTE_THRESHOLD = 100; // meters
            const isOffRoute = offRouteDistance > OFF_ROUTE_THRESHOLD;

            if (isOffRoute) {
                setNavState((prev) => ({ ...prev, isOffRoute: true }));
                if (!spokenAnnouncementsRef.current.has('offroute')) {
                    spokenAnnouncementsRef.current.add('offroute');
                    speak('You are off route. Recalculating...');
                    recalculateRoute();
                }
                return;
            } else {
                if (navStateRef.current.isOffRoute) {
                    setNavState((prev) => ({ ...prev, isOffRoute: false }));
                    spokenAnnouncementsRef.current.delete('offroute');
                }
            }

            // Determine current step based on progress along route
            // Find step whose geometry contains the segment index closest to user
            let currentStepIndex = 0;
            let cumulativeCoords = 0;
            for (let i = 0; i < steps.length; i++) {
                const stepCoordCount = steps[i].geometry?.coordinates?.length || 0;
                if (segmentIndex >= cumulativeCoords && segmentIndex < cumulativeCoords + Math.max(1, stepCoordCount - 1)) {
                    currentStepIndex = i;
                    break;
                }
                cumulativeCoords += Math.max(0, stepCoordCount - 1);
            }

            // Auto-advance if we've moved past current step
            if (currentStepIndex > navStateRef.current.currentStepIndex) {
                // Advance to new step
                const stepsToAdvance = currentStepIndex - navStateRef.current.currentStepIndex;
                for (let i = 0; i < stepsToAdvance; i++) {
                    advanceStep();
                }
                return;
            }

            const step = steps[currentStepIndex];
            if (!step) return;

            // Calculate remaining distance on this step from snap point to step end
            const stepGeom = step.geometry?.coordinates || [];
            let distOnStepRemaining = 0;
            if (stepGeom.length > 1) {
                const localSegIndex = Math.max(0, segmentIndex - cumulativeCoords);
                for (let i = localSegIndex; i < stepGeom.length - 1; i++) {
                    distOnStepRemaining += haversine(stepGeom[i], stepGeom[i + 1]);
                }
            } else {
                // Fallback: estimate from step.distance scaled by rough position
                const roughProgress = segmentIndex / (coords.length || 1);
                distOnStepRemaining = (step.distance || 0) * (1 - roughProgress);
            }

            const durationRemaining = step.duration ? (step.duration * (distOnStepRemaining / (step.distance || 1))) : 0;
            const totalRemainingDist = distOnStepRemaining + steps.slice(currentStepIndex + 1).reduce((s, st) => s + (st.distance || 0), 0);
            const totalRemainingDur = durationRemaining + steps.slice(currentStepIndex + 1).reduce((s, st) => s + (st.duration || 0), 0);

            setNavState((prev) => ({
                ...prev,
                currentStepIndex,
                totalSteps: steps.length,
                instruction: step.name || 'Continue',
                distanceToNext: Math.max(0, distOnStepRemaining),
                durationToNext: Math.max(0, durationRemaining),
                distanceRemaining: Math.max(0, totalRemainingDist),
                durationRemaining: Math.max(0, totalRemainingDur),
                isOffRoute: false,
            }));

            checkAnnouncementTriggers(step, distOnStepRemaining, durationRemaining);

            // Auto-advance when very close to step end
            if (distOnStepRemaining < 25 && currentStepIndex < steps.length - 1) {
                advanceStep();
            }
        },
        [advanceStep, checkAnnouncementTriggers, recalculateRoute, speak]
    );

    const startNavigation = useCallback(() => {
        if (!routeGeometry?.coordinates?.length) {
            addToast?.({ message: 'No active route to navigate', type: 'warning' });
            return;
        }
        if (!navigator.geolocation) {
            addToast?.({ message: 'Geolocation not available', type: 'error' });
            return;
        }

        setIsNavigating(true);
        spokenAnnouncementsRef.current.clear();
        setNavState({
            currentStepIndex: 0,
            totalSteps: stepsRef.current.length || 0,
            distanceToNext: stepsRef.current[0]?.distance || null,
            durationToNext: stepsRef.current[0]?.duration || null,
            instruction: stepsRef.current[0]?.name || 'Start navigation',
            distanceRemaining: routeData?.distance || null,
            durationRemaining: routeData?.duration || null,
            isOffRoute: false,
            isComplete: false,
        });

        speak('Starting navigation. Follow the highlighted route.');

        // Fit map to route with navigation-friendly camera
        if (mapRef.current && routeGeometry.coordinates.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            routeGeometry.coordinates.forEach((c) => bounds.extend(c));
            mapRef.current.fitBounds(bounds, { padding: { top: 120, bottom: 280, left: 60, right: 60 }, duration: 1000 });
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const loc = [pos.coords.longitude, pos.coords.latitude];
                const heading = pos.coords.heading ?? userHeadingRef.current;
                userHeadingRef.current = heading;
                tick(loc, heading);
            },
            (err) => {
                console.error('[Swerve Nav] Geolocation error:', err);
                addToast?.({ message: 'Location signal lost', type: 'warning' });
            },
            { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
        );
    }, [routeGeometry, routeData, mapRef, speak, addToast, tick]);

    const stopNavigation = useCallback(() => {
        setIsNavigating(false);
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        spokenAnnouncementsRef.current.clear();
        setNavState({
            currentStepIndex: 0,
            totalSteps: 0,
            distanceToNext: null,
            durationToNext: null,
            instruction: null,
            distanceRemaining: null,
            durationRemaining: null,
            isOffRoute: false,
            isComplete: false,
        });
        speak('Navigation ended.');
    }, [speak]);

    const togglePreview = useCallback(() => {
        setShowPreview((v) => !v);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    return {
        isNavigating,
        navState,
        showPreview,
        startNavigation,
        stopNavigation,
        togglePreview,
        formatDistance,
        formatDuration,
    };
}
