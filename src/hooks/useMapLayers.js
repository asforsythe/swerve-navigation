import { useCallback, useRef, useEffect } from 'react';
import { applyStyleOverrides } from '../map/style-overrides';

export function useMapLayers({ mapRef, theme }) {
  const themeRef = useRef(theme);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  const addBaseLayers = useCallback(() => {
    if (!mapRef.current) return;

    // Apply cinema-grade style overrides (road colors, fog, building tints)
    applyStyleOverrides(mapRef.current, { theme: themeRef.current });

    // Precipitation radar (RainViewer) — managed by useRadar.js (no-op here).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef]);

  const updateAtmosphere = useCallback((weather) => {
    // Atmosphere reapplied via applyStyleOverrides on style.load.
    // Individual weather-driven fog changes could be added here if needed.
  }, []);

  return { addBaseLayers, updateAtmosphere };
}
