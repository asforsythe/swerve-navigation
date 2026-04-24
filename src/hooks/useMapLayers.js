import { useCallback } from 'react';

export function useMapLayers({ mapRef, activeRadar, theme }) {
    const addBaseLayers = useCallback(() => {
        if (!mapRef.current) return;

        // Precipitation radar (RainViewer) — managed by useRadar.js.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateAtmosphere = useCallback(
        (weather) => {
            // Atmosphere updates removed — MapLibre + Carto tiles don't support sky/fog layers
            // (these were Mapbox v2+ premium features)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    return { addBaseLayers, updateAtmosphere };
}
