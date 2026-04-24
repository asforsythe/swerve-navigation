import React, { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import useSwerveStore from '../store/useSwerveStore';
import { useTTS } from '../hooks/useTTS';
import { useVoiceCommand } from '../hooks/useVoiceCommand';
import { useWeatherPolling } from '../hooks/useWeatherPolling';
import { useRadar } from '../hooks/useRadar';
import { useRoutePlanning } from '../hooks/useRoutePlanning';
import { useMapLayers } from '../hooks/useMapLayers';
import { useRouteScanner } from '../hooks/useRouteScanner';
import { useWindLayer } from '../hooks/useWindLayer';
import { useCloudLayer } from '../hooks/useCloudLayer';
import { useLightningLayer } from '../hooks/useLightningLayer';
import { useNwsAlerts } from '../hooks/useNwsAlerts';
import { useNexradLayer } from '../hooks/useNexradLayer';
import { useStormCellTracker } from '../hooks/useStormCellTracker';
import TelemetryPanel from './ui/TelemetryPanel';
import RouteEnginePanel from './ui/RouteEnginePanel';
import ControlBar from './ui/ControlBar';
import WeatherLayersPanel from './ui/WeatherLayersPanel';
import WeatherDetailPanel from './ui/WeatherDetailPanel';
import SavedRoutesModal from './ui/SavedRoutesModal';
import StartScreen from './ui/StartScreen';
import LoadingOverlay from './ui/LoadingOverlay';
import ToastContainer from './ui/ToastContainer';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
mapboxgl.accessToken = MAPBOX_TOKEN;
const DEFAULT_CENTER = [-81.3792, 28.5383];

const MapOverlay = () => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const userLocationRef = useRef(null);
  const sweepAnimationRef = useRef(null);
  const weatherCanvasRef = useRef(null);
  const weatherAnimRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [showStartButton, setShowStartButton] = useState(true);
  const [travelMode, setTravelMode] = useState('driving');
  const [isSweeping, setIsSweeping] = useState(false);
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);
  const [startAddress, setStartAddress] = useState('');
  const [destAddress, setDestAddress] = useState('');

  const {
    theme,
    toggleTheme,
    mapTheme,
    weather,
    setWeather,
    addCameraMarker,
    addToast,
    addNotification,
    setNotificationPermission,
    routeTelemetry,
    setUiState,
    ui,
  } = useSwerveStore();

  // Hooks
  const { isReady: isVoiceReady, speak, unlockAudio, flushQueue } = useTTS();
  const { toggleListening } = useVoiceCommand({
    onCommand: (transcript) => handleVoiceCommand(transcript),
    onError: (msg) => addToast({ message: msg, type: 'warning' }),
  });
  useWeatherPolling({ mapLoaded, userLocationRef });
  const {
    refreshRadar,
  } = useRadar({ mapRef, mapLoaded });
  const { isRouting, currentRouteGeometry, planRoute, clearHazardMarkers } = useRoutePlanning({
    mapRef,
    speak,
    addToast: (t) => addToast(t),
    setIsSweeping,
  });
  const { addBaseLayers, updateAtmosphere } = useMapLayers({ mapRef, theme });
  useRouteScanner({ mapRef, mapLoaded, routeGeometry: currentRouteGeometry });

  // Phase 2 weather layer hooks
  const { refresh: refreshWind } = useWindLayer({ mapRef, mapLoaded });
  const { refresh: refreshClouds } = useCloudLayer({ mapRef, mapLoaded });
  const { refresh: refreshLightning, setUserLocation: setLightningUserLoc } = useLightningLayer({ mapRef, mapLoaded });
  const { refresh: refreshNws } = useNwsAlerts({ mapRef, mapLoaded });
  const { refresh: refreshNexrad } = useNexradLayer({ mapRef, mapLoaded });
  const { stormCells, refresh: refreshStormTracker } = useStormCellTracker({ mapRef, mapLoaded });

  // Refs for values used in map init effect (to avoid unstable deps)
  const speakRef = useRef(speak);
  const mapThemeRef = useRef(mapTheme);
  const addBaseLayersRef = useRef(addBaseLayers);
  const refreshRadarRef = useRef(refreshRadar);
  const refreshWindRef = useRef(refreshWind);
  const refreshCloudsRef = useRef(refreshClouds);
  const refreshLightningRef = useRef(refreshLightning);
  const refreshNwsRef = useRef(refreshNws);
  const refreshNexradRef = useRef(refreshNexrad);
  const refreshStormTrackerRef = useRef(refreshStormTracker);
  const clearHazardMarkersRef = useRef(clearHazardMarkers);
  const mapMarkersRef = useRef([]); // tracks mock hazard markers for style-reload lifecycle
  const prevMapThemeRef = useRef(null); // null = first run, skip setStyle
  useEffect(() => { speakRef.current = speak; }, [speak]);
  useEffect(() => { mapThemeRef.current = mapTheme; }, [mapTheme]);
  useEffect(() => { addBaseLayersRef.current = addBaseLayers; }, [addBaseLayers]);
  useEffect(() => { refreshRadarRef.current = refreshRadar; }, [refreshRadar]);
  useEffect(() => { refreshWindRef.current = refreshWind; }, [refreshWind]);
  useEffect(() => { refreshCloudsRef.current = refreshClouds; }, [refreshClouds]);
  useEffect(() => { refreshLightningRef.current = refreshLightning; }, [refreshLightning]);
  useEffect(() => { refreshNwsRef.current = refreshNws; }, [refreshNws]);
  useEffect(() => { refreshNexradRef.current = refreshNexrad; }, [refreshNexrad]);
  useEffect(() => { refreshStormTrackerRef.current = refreshStormTracker; }, [refreshStormTracker]);
  useEffect(() => { clearHazardMarkersRef.current = clearHazardMarkers; }, [clearHazardMarkers]);

  // Theme switch re-add layers — only fires on actual theme change, not initial load
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    // First run: map was already initialized with the correct style; skip setStyle
    if (prevMapThemeRef.current === null) {
      prevMapThemeRef.current = mapTheme;
      return;
    }
    if (prevMapThemeRef.current === mapTheme) return;
    prevMapThemeRef.current = mapTheme;

    // Remove all custom markers before style teardown to prevent fog.js crash
    // (markers access map.style.fog during render loop which is undefined mid-rebuild)
    clearHazardMarkersRef.current?.();
    mapMarkersRef.current.forEach((m) => m.remove());

    const handleStyleLoad = () => {
      addBaseLayersRef.current?.();
      refreshRadarRef.current?.();
      refreshWindRef.current?.();
      refreshCloudsRef.current?.();
      refreshLightningRef.current?.();
      refreshNwsRef.current?.();
      refreshNexradRef.current?.();
      refreshStormTrackerRef.current?.();
      // Re-attach mock markers after style is ready
      mapMarkersRef.current.forEach((m) => m.addTo(mapRef.current));
    };
    mapRef.current.once('style.load', handleStyleLoad);
    mapRef.current.setStyle(mapTheme, { diff: false });
    return () => {
      if (mapRef.current) mapRef.current.off('style.load', handleStyleLoad);
    };
  }, [mapTheme, mapLoaded]); // addBaseLayers intentionally excluded — using ref


  // Atmosphere updates
  useEffect(() => {
    updateAtmosphere(weather);
  }, [weather, updateAtmosphere]);

  // ── Weather particle canvas overlay ───────────────────────────────────────
  useEffect(() => {
    const canvas = weatherCanvasRef.current;
    if (!canvas) return;

    // Respect reduced-motion preference
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    const precip = weather?.current?.precipitationIntensity ?? 0;
    const weatherCode = weather?.current?.weatherCode ?? 0;

    // Only run particles when there's actual precipitation
    if (precip < 0.01 && weatherCode < 51) {
      cancelAnimationFrame(weatherAnimRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const isSnow = weatherCode >= 71 && weatherCode <= 77;
    const particleCount = Math.min(200, Math.round(20 + precip * 300));

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    // Object-pooled particle class
    class Particle {
      constructor() { this.reset(true); }
      reset(initial = false) {
        this.x = Math.random() * canvas.width;
        this.y = initial ? Math.random() * canvas.height : -10;
        if (isSnow) {
          this.vx = (Math.random() - 0.5) * 1.2;
          this.vy = 0.8 + Math.random() * 1.2;
          this.size = 1.5 + Math.random() * 2;
          this.opacity = 0.25 + Math.random() * 0.4;
        } else {
          this.vx = -1 + Math.random() * 0.5;
          this.vy = 10 + Math.random() * 8;
          this.length = 6 + Math.random() * 10;
          this.opacity = 0.12 + Math.random() * 0.22;
        }
      }
      update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.y > canvas.height + 20) this.reset();
        if (this.x < -10) this.x = canvas.width + 10;
        if (this.x > canvas.width + 10) this.x = -10;
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        if (isSnow) {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(200,228,255,1)';
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(160,210,255,1)';
          ctx.lineWidth = 0.8;
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x + this.vx * 2, this.y + this.length);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    const particles = Array.from({ length: particleCount }, () => new Particle());
    let lastTs = 0;

    const animate = (ts) => {
      const dt = Math.min((ts - lastTs) / 16, 3);
      lastTs = ts;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.update(dt);
        p.draw();
      }
      weatherAnimRef.current = requestAnimationFrame(animate);
    };
    weatherAnimRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(weatherAnimRef.current);
      resizeObserver.disconnect();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather?.current?.precipitationIntensity, weather?.current?.weatherCode]);

  // Notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
      });
    }
  }, [setNotificationPermission]);

  const sendNotification = useCallback(
    (title, body) => {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
      addNotification({ title, body, type: 'info' });
    },
    [addNotification]
  );

  // Voice command handler
  const handleVoiceCommand = useCallback(
    (transcript) => {
      const lower = transcript.toLowerCase();
      if (lower.includes('route') || lower.includes('navigate')) {
        speak('Say your destination');
      } else if (lower.includes('save')) {
        speak('Route saved');
      } else if (lower.includes('home')) {
        setDestAddress('Home');
        speak('Setting destination to home');
      } else if (lower.includes('work')) {
        setDestAddress('Work');
        speak('Setting destination to work');
      }
    },
    [speak]
  );

  // Radar sweep effect
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !isSweeping) return;

    const sourceId = 'radar-sweep';
    const layerId = 'radar-sweep-layer';
    const center = userLocationRef.current || DEFAULT_CENTER;

    if (!mapRef.current.getSource(sourceId)) {
      mapRef.current.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Point', coordinates: center } },
      });
      mapRef.current.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 0,
          'circle-color': '#3b82f6',
          'circle-opacity': 0.4,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-stroke-opacity': 0.4,
        },
      });
    }

    let start = Date.now();
    const duration = 2000;

    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = elapsed / duration;

      if (progress < 1) {
        const radius = progress * 600;
        const opacity = 0.4 * (1 - progress);
        if (mapRef.current.getLayer(layerId)) {
          mapRef.current.setPaintProperty(layerId, 'circle-radius', radius);
          mapRef.current.setPaintProperty(layerId, 'circle-opacity', opacity);
          mapRef.current.setPaintProperty(layerId, 'circle-stroke-opacity', opacity);
        }
        sweepAnimationRef.current = requestAnimationFrame(animate);
      } else {
        setIsSweeping(false);
        if (mapRef.current.getLayer(layerId)) mapRef.current.removeLayer(layerId);
        if (mapRef.current.getSource(sourceId)) mapRef.current.removeSource(sourceId);
      }
    };

    animate();
    return () => {
      if (sweepAnimationRef.current) cancelAnimationFrame(sweepAnimationRef.current);
    };
  }, [isSweeping, mapLoaded]);

  // Geocode helper
  const geocodeAddress = async (address) => {
    if (!address) return null;
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      );
      const data = await res.json();
      if (data.features?.length > 0) return data.features[0].center;
    } catch (e) {
      console.error('[Swerve Geocode] Error:', e);
    }
    return null;
  };

  // Manual route handler
  const handleManualRoute = useCallback(async () => {
    if (!startAddress || !destAddress) {
      addToast({ message: 'Please enter both addresses', type: 'warning' });
      return;
    }
    const startCoords = await geocodeAddress(startAddress);
    const destCoords = await geocodeAddress(destAddress);

    if (!startCoords || !destCoords) {
      addToast({ message: 'Could not geocode addresses', type: 'error' });
      speak('Geocoding failed');
      return;
    }

    await planRoute(startCoords, destCoords, startAddress, destAddress);
  }, [startAddress, destAddress, planRoute, speak, addToast]);

  // Context menu route
  const handleRouteRequest = useCallback(
    async (destination) => {
      const start = userLocationRef.current || mapRef.current?.getCenter().toArray() || DEFAULT_CENTER;
      await planRoute(start, [destination.lng, destination.lat], 'Current Location', 'Selected Point');
    },
    [planRoute]
  );
  const handleRouteRequestRef = useRef(handleRouteRequest);
  useEffect(() => {
    handleRouteRequestRef.current = handleRouteRequest;
  }, [handleRouteRequest]);

  // Start ride
  const handleStartRide = useCallback(async () => {
    await unlockAudio();
    flushQueue();

    const { temp, roadTemp, precipitationIntensity } = weather.current || {};
    const alerts =
      weather.severeAlerts?.length > 0
        ? `Alert: ${weather.severeAlerts[0].event}.`
        : 'No active weather alerts.';
    const briefing = `Swerve tracking active. Road temperature is ${roadTemp || temp} degrees. ${precipitationIntensity > 0 ? 'Light rain detected.' : 'Conditions are clear.'
      } ${alerts} Ride safe.`;

    speak(briefing);
    setShowStartButton(false);

    if (mapRef.current) {
      const center = userLocationRef.current || mapRef.current.getCenter().toArray();
      mapRef.current.flyTo({
        center,
        zoom: 15.5,
        pitch: 60,
        bearing: 0,
        duration: 2500,
        essential: true,
      });
    }

    setTimeout(() => {
      if (mapRef.current) mapRef.current.resize();
    }, 150);
  }, [weather, speak, unlockAudio, flushQueue]);

  // Map initialization - stable deps only, matching original pattern
  useEffect(() => {
    if (mapRef.current) return;

    console.log('[Swerve] Initializing map...');

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapThemeRef.current,
      center: DEFAULT_CENTER,
      zoom: 12,
      projection: 'globe',
    });

    mapRef.current.on('load', () => {
      console.log('[Swerve] Map loaded successfully');
      clearTimeout(loadTimeout);
      setMapLoaded(true);
      setTimeout(() => {
        if (mapRef.current) mapRef.current.resize();
      }, 200);

      setWeather({
        current: { temp: 85, roadTemp: 88, precipitationIntensity: 0, windSpeed: 10.8 },
        severeAlerts: [],
      });

      try {
        addBaseLayersRef.current?.();
      } catch (e) {
        console.warn('[Swerve] addBaseLayers error:', e);
      }

      // Mock hazard markers
      const mockHazards = [
        { id: 'cam1', lat: 28.5383, lng: -81.3792, type: 'camera' },
        { id: 'inc1', lat: 28.545, lng: -81.385, type: 'incident' },
      ];

      mockHazards.forEach((item) => {
        addCameraMarker(item);
        const el = document.createElement('div');
        el.className =
          'w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(239,68,68,0.8)] cursor-pointer';
        const marker = new mapboxgl.Marker(el).setLngLat([item.lng, item.lat]).addTo(mapRef.current);
        // Track so they can be removed/re-added cleanly around style changes
        mapMarkersRef.current.push(marker);

        el.addEventListener('click', () => {
          const label = item.type === 'incident' ? 'Incident' : 'Camera';
          speakRef.current?.(`Caution... ${label} reported ahead.`);
        });
      });

      // Geolocate control
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      });
      mapRef.current.addControl(geolocate, 'bottom-right');

      geolocate.on('geolocate', (e) => {
        const loc = [e.coords.longitude, e.coords.latitude];
        userLocationRef.current = loc;
        setLightningUserLoc?.(loc);
      });

      setTimeout(() => geolocate.trigger(), 500);

      // Context menu
      mapRef.current.on('contextmenu', (e) => {
        if (handleRouteRequestRef.current) {
          handleRouteRequestRef.current(e.lngLat);
        }
      });
    });

    mapRef.current.on('error', (e) => {
      // Filter out routine missing-tile / source-tile errors —
      // these are normal for tiled raster sources (e.g. 400/404 tiles at sea or off-boundary)
      const isTileError = e.error?.status === 400 ||
        e.error?.status === 404 ||
        (e.error?.message && /Tile.*does not exist|Tile not found|Bad Request/i.test(e.error.message));
      if (isTileError) return;
      console.error('[Swerve] Map error:', e);
      setMapError(e.error?.message || 'Map failed to load');
      setMapLoaded(true); // Show UI anyway so user isn't stuck
    });

    // Timeout fallback in case load hangs
    const loadTimeout = setTimeout(() => {
      console.warn('[Swerve] Map load timeout - forcing UI');
      setMapLoaded(true);
    }, 8000);

    return () => clearTimeout(loadTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addCameraMarker, setWeather]);


  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Weather particle canvas — sits above map, below all UI (z-index 11) */}
      <canvas
        ref={weatherCanvasRef}
        className="weather-particles absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 11 }}
        aria-hidden="true"
      />

      {/* Toast notifications */}
      <ToastContainer />

      {/* Controls */}
      {mapLoaded && !showStartButton && (
        <>
          <ControlBar
            onVoiceToggle={() => {
              const started = toggleListening();
              if (started) speak('Listening');
            }}
            onThemeToggle={toggleTheme}
            onSavedRoutes={() => setShowSavedRoutes(true)}
            onNotifications={() => {
              if (Notification.permission === 'granted') {
                sendNotification('Swerve', 'Notifications enabled');
              } else if (Notification.permission === 'denied') {
                speak('Notifications blocked. Enable in browser settings.');
              } else {
                Notification.requestPermission().then((p) => {
                  setNotificationPermission(p);
                  speak(p === 'granted' ? 'Notifications enabled' : 'Notifications blocked');
                });
              }
            }}
            onWeatherLayers={() =>
              setUiState({ showWeatherLayers: !ui.showWeatherLayers })
            }
            onWeatherDetail={() =>
              setUiState({ showWeatherDetail: !ui.showWeatherDetail })
            }
          />

          <WeatherLayersPanel />

          <WeatherDetailPanel />

          {/* Storm cell intercept banner */}
          {stormCells.some((c) => c.interceptsRoute) && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-slide-in-top">
              <div
                className="rounded-xl border border-red-500/30 backdrop-blur-2xl px-5 py-2.5 flex items-center gap-2.5"
                style={{
                  background: 'rgba(20,4,6,0.85)',
                  boxShadow: '0 8px 32px rgba(220,38,38,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
              >
                <span className="text-lg">⚠</span>
                <div>
                  <div className="text-red-300 text-[11px] font-semibold tracking-wide uppercase">
                    Storm Intercept Warning
                  </div>
                  <div className="text-white/70 text-[10px]">
                    {stormCells
                      .filter((c) => c.interceptsRoute)
                      .map((c) => `Storm intercept in ${Math.round(c.etaMinutes ?? 0)} min`)
                      .join(' • ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          <TelemetryPanel />

          <RouteEnginePanel
            startAddress={startAddress}
            setStartAddress={setStartAddress}
            destAddress={destAddress}
            setDestAddress={setDestAddress}
            onPlanRoute={handleManualRoute}
            isRouting={isRouting}
            modeEtas={routeTelemetry.modeEtas}
            travelMode={travelMode}
            setTravelMode={setTravelMode}
          />
        </>
      )}

      {/* Loading */}
      {isRouting && <LoadingOverlay />}

      {/* Saved Routes Modal */}
      {showSavedRoutes && <SavedRoutesModal onClose={() => setShowSavedRoutes(false)} speak={speak} />}

      {/* Start Screen */}
      {mapLoaded && showStartButton && <StartScreen isVoiceReady={isVoiceReady} onStart={handleStartRide} />}

      {/* Map Load Error */}
      {mapError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-white text-xl font-semibold mb-2">Map Load Failed</h2>
            <p className="text-white/50 text-sm mb-6">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <p className="text-white/40 text-sm animate-pulse">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapOverlay;
