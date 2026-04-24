import { useCallback, useEffect, useRef, useState } from 'react';
import useSwerveStore from '../store/useSwerveStore';

// ── Tile sources ──────────────────────────────────────────────────────────
// Iowa State Mesonet — NEXRAD N0Q base reflectivity (US only, ~5-10 min updates)
const NEXRAD_TILES =
    'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png';

// OpenWeatherMap — cloud cover tiles (global, ~10-min updates, no tile gaps)
// Replaces GIBS MODIS which 404s on unimaged swath tiles and uses TMS vs XYZ.
const OWM_CLOUD_TILES = `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${process.env.REACT_APP_OWM_KEY}`;

const REFRESH_MS = 300000; // 5 minutes

export function useNexradLayer({ mapRef, mapLoaded }) {
    const [isNexradVisible, setIsNexradVisible] = useState(false);
    const [isCloudVisible, setIsCloudVisible] = useState(false);
    const nexradVisibleRef = useRef(false);
    const cloudVisibleRef = useRef(false);

    const radarLayerId = 'nexrad-radar';
    const radarSourceId = 'nexrad-source';
    const cloudLayerId = 'gibs-clouds';
    const cloudSourceId = 'gibs-source';

    const intervalRef = useRef(null);

    const weatherLayers = useSwerveStore((state) => state.weatherLayers);

    // Track independent toggles
    useEffect(() => {
        const wantsNexrad = weatherLayers?.nexrad ?? false;
        const wantsPrecip = weatherLayers?.precip ?? false;

        if (wantsNexrad !== nexradVisibleRef.current) {
            nexradVisibleRef.current = wantsNexrad;
            setIsNexradVisible(wantsNexrad);
            console.log(`[Swerve Radar] NEXRAD toggle: ${wantsNexrad ? 'ON' : 'OFF'}`);
        }
        if (wantsPrecip !== cloudVisibleRef.current) {
            cloudVisibleRef.current = wantsPrecip;
            setIsCloudVisible(wantsPrecip);
            console.log(`[Swerve Radar] Cloud toggle: ${wantsPrecip ? 'ON' : 'OFF'}`);
        }
    }, [weatherLayers?.nexrad, weatherLayers?.precip]);

    // ── NEXRAD (precipitation / storms) ──────────────────────────────────
    const injectNexrad = useCallback(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        if (map.getLayer(radarLayerId)) {
            map.setLayoutProperty(radarLayerId, 'visibility', 'visible');
            return;
        }

        if (!map.getSource(radarSourceId)) {
            map.addSource(radarSourceId, {
                type: 'raster',
                tiles: [NEXRAD_TILES],
                tileSize: 256,
                attribution: 'Radar: NOAA NEXRAD via Iowa State Mesonet',
            });
        }

        map.addLayer({
            id: radarLayerId,
            type: 'raster',
            source: radarSourceId,
            paint: {
                'raster-opacity': 0.78,
                'raster-fade-duration': 250,
                'raster-contrast': 0.35,
                'raster-brightness-min': 0.05,
                'raster-brightness-max': 1.0,
            },
        });
        console.log('[Swerve Radar] NEXRAD layer added');
    }, [mapRef]);

    const removeNexrad = useCallback(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        if (map.getLayer(radarLayerId)) map.removeLayer(radarLayerId);
        if (map.getSource(radarSourceId)) map.removeSource(radarSourceId);
    }, [mapRef]);

    // ── OWM Clouds ────────────────────────────────────────────────────────
    const injectClouds = useCallback(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        if (map.getLayer(cloudLayerId)) {
            map.setLayoutProperty(cloudLayerId, 'visibility', 'visible');
            return;
        }

        if (!map.getSource(cloudSourceId)) {
            map.addSource(cloudSourceId, {
                type: 'raster',
                tiles: [OWM_CLOUD_TILES],
                tileSize: 256,
                attribution: 'Clouds: OpenWeatherMap',
            });
        }

        const firstSymbol = map.getStyle()?.layers?.find((l) => l.type === 'symbol');

        map.addLayer(
            {
                id: cloudLayerId,
                type: 'raster',
                source: cloudSourceId,
                paint: {
                    'raster-opacity': 0.55,
                    'raster-fade-duration': 400,
                    'raster-saturation': -0.60,
                    'raster-contrast': 0.25,
                },
            },
            firstSymbol?.id
        );
        console.log('[Swerve Radar] Cloud layer added (OWM)');
    }, [mapRef]);

    const removeClouds = useCallback(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        if (map.getLayer(cloudLayerId)) map.removeLayer(cloudLayerId);
        if (map.getSource(cloudSourceId)) map.removeSource(cloudSourceId);
    }, [mapRef]);

    // ── Visibility effect ────────────────────────────────────────────────
    useEffect(() => {
        if (!mapLoaded || !mapRef.current) return;

        if (nexradVisibleRef.current) injectNexrad();
        else removeNexrad();

        if (cloudVisibleRef.current) injectClouds();
        else removeClouds();

        // Auto-refresh both layers every 5 min while any is visible
        if (nexradVisibleRef.current || cloudVisibleRef.current) {
            intervalRef.current = setInterval(() => {
                if (nexradVisibleRef.current) {
                    removeNexrad();
                    injectNexrad();
                }
                if (cloudVisibleRef.current) {
                    removeClouds();
                    injectClouds();
                }
            }, REFRESH_MS);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isNexradVisible, isCloudVisible, mapLoaded, injectNexrad, removeNexrad, injectClouds, removeClouds, mapRef]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const refresh = useCallback(() => {
        if (!mapRef.current) return;
        if (nexradVisibleRef.current) {
            removeNexrad();
            injectNexrad();
        }
        if (cloudVisibleRef.current) {
            removeClouds();
            injectClouds();
        }
    }, [mapRef, injectNexrad, removeNexrad, injectClouds, removeClouds]);

    const toggleNexradLayer = useCallback(() => {
        useSwerveStore.getState().setWeatherLayer('nexrad', !nexradVisibleRef.current);
    }, []);

    return {
        isNexradLayerVisible: isNexradVisible,
        isCloudLayerVisible: isCloudVisible,
        toggleNexradLayer,
        refresh,
    };
}
