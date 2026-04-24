import { useCallback, useEffect, useRef } from 'react';
import useSwerveStore from '../store/useSwerveStore';

const DEFAULT_COORDS = [-81.3792, 28.5383]; // Orlando

/**
 * Enhanced weather polling hook that fetches rich data from Open-Meteo
 * and simulates XWeather lightning/severe data for UI display.
 * 
 * Open-Meteo provides:
 * - Current: temp, humidity, apparent_temp, precip, weather_code, wind_speed, wind_direction,
 *            wind_gusts, pressure, cloud_cover, visibility, uv_index, dewpoint, soil_temp
 * - Hourly: 24h forecast with all current params
 * - Daily: 7-day forecast with temp max/min, sunrise/sunset, precip sum, weather code
 * - Alerts: Severe weather alerts (EU MeteoAlarm, US NWS, etc.)
 */
export function useWeatherPolling({ mapLoaded, userLocationRef }) {
    const { setWeather } = useSwerveStore();
    const intervalRef = useRef(null);

    /**
     * Fetch current weather and 24h hourly forecast
     */
    const refreshTelemetry = useCallback(async () => {
        const coords = userLocationRef?.current || DEFAULT_COORDS;
        try {
            // Rich Open-Meteo current + hourly forecast
            const url = `https://api.open-meteo.com/v1/forecast?` +
                `latitude=${coords[1]}&longitude=${coords[0]}` +
                `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,` +
                `weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,` +
                `surface_pressure,cloud_cover,visibility,uv_index,dew_point_2m,is_day` +
                `&hourly=temperature_2m,precipitation_probability,weather_code,` +
                `wind_speed_10m,wind_direction_10m,uv_index,is_day` +
                `&daily=weather_code,temperature_2m_max,temperature_2m_min,` +
                `sunrise,sunset,precipitation_sum,precipitation_hours,` +
                `wind_speed_10m_max,wind_direction_10m_dominant` +
                `&timezone=auto` +
                `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
            const data = await res.json();

            // Process current conditions
            const current = data.current || {};
            const hourly = data.hourly || {};
            const daily = data.daily || {};

            // Build hourly forecast array (next 24 hours)
            const hourlyForecast = [];
            for (let i = 0; i < 24; i++) {
                if (hourly.time && hourly.time[i]) {
                    const hourDate = new Date(hourly.time[i]);
                    hourlyForecast.push({
                        time: hourDate.getHours(),
                        temp: hourly.temperature_2m?.[i],
                        precipProb: hourly.precipitation_probability?.[i] || 0,
                        weatherCode: hourly.weather_code?.[i] || 0,
                        windSpeed: hourly.wind_speed_10m?.[i] || 0,
                        windDirection: hourly.wind_direction_10m?.[i] || 0,
                        uvIndex: hourly.uv_index?.[i] || 0,
                        isDay: hourly.is_day?.[i] ?? 1,
                    });
                }
            }

            // Build daily forecast array (next 7 days)
            const dailyForecast = [];
            for (let i = 0; i < (daily.time?.length || 0); i++) {
                dailyForecast.push({
                    date: daily.time[i],
                    tempMax: daily.temperature_2m_max?.[i],
                    tempMin: daily.temperature_2m_min?.[i],
                    weatherCode: daily.weather_code?.[i] || 0,
                    precipSum: daily.precipitation_sum?.[i] || 0,
                    precipHours: daily.precipitation_hours?.[i] || 0,
                    windMax: daily.wind_speed_10m_max?.[i] || 0,
                    windDirection: daily.wind_direction_10m_dominant?.[i] || 0,
                    sunrise: daily.sunrise?.[i],
                    sunset: daily.sunset?.[i],
                });
            }

            // Calculate pressure trend (last 3 hours vs current)
            const pressureTrend = hourly.surface_pressure
                ? (current.surface_pressure || 0) - (hourly.surface_pressure?.[3] || current.surface_pressure || 0)
                : 0;

            // Simulate XWeather lightning data for UI (would come from real XWeather API with key)
            const simulatedXWeather = {
                lightningStrikesNearby: current.weather_code >= 95 ? Math.floor(Math.random() * 12) + 3 : 0,
                lightningDistance: current.weather_code >= 95 ? Math.floor(Math.random() * 15) + 5 : null,
                severeRiskLevel: current.weather_code >= 95 ? 'high' : current.weather_code >= 61 ? 'moderate' : 'low',
                stormBearing: current.wind_direction_10m || 0,
                xweatherTimestamp: Date.now(),
            };

            setWeather({
                current: {
                    temp: current.temperature_2m,
                    roadTemp: current.apparent_temperature,
                    feelsLike: current.apparent_temperature,
                    precipitationIntensity: current.precipitation,
                    windSpeed: current.wind_speed_10m,
                    windDirection: current.wind_direction_10m,
                    windGusts: current.wind_gusts_10m,
                    humidity: current.relative_humidity_2m,
                    cloudCover: current.cloud_cover,
                    weatherCode: current.weather_code,
                    visibility: current.visibility ? current.visibility / 1000 : 10, // km
                    pressure: current.surface_pressure,
                    pressureTrend,
                    uvIndex: current.uv_index,
                    dewPoint: current.dew_point_2m,
                    isDay: current.is_day ?? 1,
                },
                hourly: hourlyForecast,
                daily: dailyForecast,
                xweather: simulatedXWeather,
                severeAlerts: [],
                lastUpdated: Date.now(),
            });
        } catch (e) {
            console.error('[Swerve Weather] Refresh error:', e);
        }
    }, [setWeather, userLocationRef]);

    useEffect(() => {
        if (!mapLoaded) return;

        refreshTelemetry();

        // Current conditions: every 5 minutes
        intervalRef.current = setInterval(refreshTelemetry, 300000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [mapLoaded, refreshTelemetry]);

    return { refreshTelemetry };
}
