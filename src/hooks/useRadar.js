import { useCallback, useEffect, useRef, useState } from 'react';
import useSwerveStore from '../store/useSwerveStore';

const XWEATHER_BASE = 'https://data.api.xweather.com';
const CLIENT_ID = process.env.REACT_APP_XWEATHER_CLIENT_ID;
const CLIENT_SECRET = process.env.REACT_APP_XWEATHER_CLIENT_SECRET;
const REFRESH_INTERVAL_MS = 300000; // 5 minutes

function buildXWeatherUrl(endpoint, location) {
    const params = new URLSearchParams({
        format: 'json',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
    });
    return `${XWEATHER_BASE}${endpoint}/${encodeURIComponent(location)}?${params}`;
}

/**
 * useRadar — now powered by XWeather conditions.
 * Fetches current conditions, road weather, and daily summary.
 * Stores merged data in Zustand weather state.
 * No tile layer injection (XWeather does not serve radar tiles).
 */
export function useRadar({ mapRef, mapLoaded }) {
    const [radarTimestamp, setRadarTimestamp] = useState(null);
    const intervalRef = useRef(null);
    const { setWeather, addToast } = useSwerveStore();

    const fetchXWeather = useCallback(async () => {
        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.warn('[Swerve XWeather] Missing credentials');
            return;
        }
        try {
            // Use map center as location, fallback to Orlando
            let location = 'orlando,fl';
            if (mapRef.current) {
                const center = mapRef.current.getCenter();
                location = `${center.lat},${center.lng}`;
            }

            // Fetch current conditions
            const condRes = await fetch(buildXWeatherUrl('/conditions', location));
            if (!condRes.ok) throw new Error(`XWeather conditions error: ${condRes.status}`);
            const condData = await condRes.json();

            // Fetch daily summary
            const summaryRes = await fetch(buildXWeatherUrl('/conditions/summary', location));
            const summaryData = summaryRes.ok ? await summaryRes.json() : null;

            // Fetch road weather
            const roadRes = await fetch(buildXWeatherUrl('/roadweather', location));
            const roadData = roadRes.ok ? await roadRes.json() : null;

            if (condData.success && condData.response?.[0]?.periods?.[0]) {
                const p = condData.response[0].periods[0];
                const place = condData.response[0].place;
                const profile = condData.response[0].profile;

                const summaryPeriod = summaryData?.response?.[0]?.periods?.[0];
                const roadPeriod = roadData?.response?.[0]?.periods?.[0];

                // NOTE: useWeatherPolling (Open-Meteo) is the canonical source
                // for `weatherCode` (WMO numeric) and `pressure` (hPa). XWeather
                // returns weatherPrimaryCoded as a string ("F", "::T") and
                // pressure in inHg, which would corrupt those fields if written
                // directly. Convert pressure to hPa, and don't overwrite
                // weatherCode here.
                setWeather({
                    current: {
                        temp: p.tempF,
                        roadTemp: p.feelslikeF,
                        precipitationIntensity: p.precipRateIN,
                        windSpeed: p.windSpeedMPH,
                        windGust: p.windGustMPH,
                        humidity: p.humidity,
                        visibility: p.visibilityMI,
                        cloudCover: p.sky,
                        weather: p.weatherPrimary,
                        pressure: p.pressureIN != null ? p.pressureIN * 33.8639 : null,
                        uvIndex: p.uvi,
                        isDay: p.isDay,
                        windDir: p.windDir,
                        windDirDEG: p.windDirDEG,
                        dewpointF: p.dewpointF,
                    },
                    severeAlerts: [],
                    lastUpdated: Date.now(),
                    xweather: {
                        place: `${place.name}, ${place.state}`.toUpperCase(),
                        tz: profile?.tz,
                        tzOffset: profile?.tzoffset,
                        summary: summaryPeriod
                            ? {
                                tempMaxF: summaryPeriod.temp?.maxF,
                                tempMinF: summaryPeriod.temp?.minF,
                                precipTotalIN: summaryPeriod.precip?.totalIN,
                                windMaxMPH: summaryPeriod.windSpeed?.maxMPH,
                                skyCodes: summaryPeriod.sky?.coded,
                            }
                            : null,
                        road: roadPeriod
                            ? {
                                summary: roadPeriod.summary,
                                summaryIndex: roadPeriod.summaryIndex,
                            }
                            : null,
                        raw: condData.response[0],
                    },
                });
                setRadarTimestamp(Date.now());
            }
        } catch (e) {
            console.error('[Swerve XWeather] Fetch error:', e);
            addToast?.({ message: 'XWeather update failed', type: 'warning', duration: 3000 });
        }
    }, [mapRef, setWeather, addToast]);

    useEffect(() => {
        if (!mapLoaded) return;
        fetchXWeather();
        intervalRef.current = setInterval(fetchXWeather, REFRESH_INTERVAL_MS);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [mapLoaded, fetchXWeather]);

    const refreshRadar = useCallback(() => {
        fetchXWeather();
    }, [fetchXWeather]);

    // Frame-related functions are no-ops since XWeather has no frames
    const play = useCallback(() => { }, []);
    const pause = useCallback(() => { }, []);
    const seek = useCallback(() => { }, []);

    return {
        radarTimestamp,
        refreshRadar,
        isPlaying: false,
        play,
        pause,
        seek,
        currentFrameIndex: 0,
        totalFrames: 0,
    };
}
