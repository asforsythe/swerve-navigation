import { useCallback, useEffect, useRef, useState } from 'react';
import useSwerveStore from '../store/useSwerveStore';

// ── Tile sources ──────────────────────────────────────────────────────────
// Iowa State Mesonet — NEXRAD N0Q base reflectivity (US only, ~5-10 min updates)
const NEXRAD_TILES =
    'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png';

// NASA GIBS — MODIS Terra true-color satellite imagery (global, daily)
// Shows actual clouds, land, ocean from space.  TMS scheme required (y-flipped).
const GIBS_TILES =
    'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{x}/{y}.jpg';

const REFRESH_MS = 300000; // 5 minutes

function formatDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

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

    // ── GIBS Clouds (satellite imagery) ──────────────────────────────────
    const injectClouds = useCallback(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        if (map.getLayer(cloudLayerId)) {
            map.setLayoutProperty(cloudLayerId, 'visibility', 'visible');
            return;
        }

        // GIBS MODIS tiles on the 'best' endpoint typically lag by 1-2 days.
        // Use 2 days ago to guarantee availability and avoid 404s.
        const safeDate = new Date();
        safeDate.setDate(safeDate.getDate() - 2);
        const dateStr = formatDate(safeDate);
        const tiles = [GIBS_TILES.replace(/{date}/g, dateStr)];

        if (!map.getSource(cloudSourceId)) {
            map.addSource(cloudSourceId, {
                type: 'raster',
                tiles,
                tileSize: 256,
                scheme: 'tms', // GIBS uses TMS (y-flipped) coordinates
                minzoom: 1,
                maxzoom: 9, // GoogleMapsCompatible_Level9 only serves z0-9
                attribution: 'Clouds: NASA GIBS / MODIS Terra',
            });
        }

        // Insert cloud layer just above land/water but below labels so text stays readable
        const firstSymbol = map.getStyle()?.layers?.find((l) => l.type === 'symbol');

        map.addLayer(
            {
                id: cloudLayerId,
                type: 'raster',
                source: cloudSourceId,
                paint: {
                    'raster-opacity': 0.32,
                    'raster-fade-duration': 400,
                    'raster-saturation': -0.85, // desaturate so it blends with dark theme
                    'raster-contrast': 0.45,
                    'raster-brightness-min': 0.1,
                    'raster-brightness-max': 0.9,
                },
            },
            firstSymbol?.id
        );
        console.log(`[Swerve Radar] Cloud layer added (GIBS date: ${dateStr})`);
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
