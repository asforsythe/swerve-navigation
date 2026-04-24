import { useEffect, useRef } from 'react';
import along from '@turf/along';
import length from '@turf/length';

export function useRouteScanner({ mapRef, mapLoaded, routeGeometry }) {
    const animationRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current || !mapLoaded || !routeGeometry) return;

        if (!mapRef.current.getSource('route-scanner')) {
            mapRef.current.addSource('route-scanner', {
                type: 'geojson',
                data: { type: 'Point', coordinates: [0, 0] },
            });
            mapRef.current.addLayer({
                id: 'route-scanner-layer',
                type: 'circle',
                source: 'route-scanner',
                paint: {
                    'circle-radius': 10,
                    'circle-color': '#00f2ff',
                    'circle-opacity': 0.9,
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#fff',
                    'circle-stroke-opacity': 0.5,
                },
            });
            // Glow layer
            mapRef.current.addLayer({
                id: 'route-scanner-glow',
                type: 'circle',
                source: 'route-scanner',
                paint: {
                    'circle-radius': 24,
                    'circle-color': '#00f2ff',
                    'circle-opacity': 0.15,
                    'circle-blur': 6,
                },
            });
        }

        let startTime = Date.now();
        const duration = 12000; // 12s full traversal
        const routeLen = length(routeGeometry);

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = (elapsed % duration) / duration;
            const point = along(routeGeometry, progress * routeLen);

            const pulseFactor = Math.abs(Math.sin(elapsed / 200)) * 6;
            const circleRadius = 10 + pulseFactor;
            const opacity = progress < 0.1 ? progress * 10 : progress > 0.9 ? (1 - progress) * 10 : 1;

            if (mapRef.current?.getSource('route-scanner')) {
                mapRef.current.getSource('route-scanner').setData(point);
                mapRef.current.setPaintProperty('route-scanner-layer', 'circle-radius', circleRadius);
                mapRef.current.setPaintProperty('route-scanner-layer', 'circle-opacity', 0.9 * opacity);
                mapRef.current.setPaintProperty('route-scanner-layer', 'circle-stroke-opacity', 0.5 * opacity);
                mapRef.current.setPaintProperty('route-scanner-glow', 'circle-radius', 24 + pulseFactor * 2);
                mapRef.current.setPaintProperty('route-scanner-glow', 'circle-opacity', 0.15 * opacity);
            }
            animationRef.current = requestAnimationFrame(animate);
        };

        animate();
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [routeGeometry, mapLoaded, mapRef]);
}
