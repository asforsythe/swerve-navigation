import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subHours } from 'date-fns';
import { calculateRouteSafety } from '../../utils/safetyEngine';
import useSwerveStore from '../../store/useSwerveStore';

function wmoLabel(code) {
  if (!code) return 'Clear';
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 9) return 'Overcast';
  if (code <= 19) return 'Fog';
  if (code <= 29) return 'Drizzle';
  if (code <= 39) return 'Rain';
  if (code <= 49) return 'Snow';
  if (code <= 59) return 'Sleet';
  if (code <= 69) return 'Heavy Rain';
  if (code <= 79) return 'Heavy Snow';
  if (code <= 84) return 'Rain Showers';
  if (code <= 94) return 'Snow Showers';
  return 'Thunderstorm';
}

function ssiColor(ssi) {
  if (ssi >= 85) return '#34d399';
  if (ssi >= 70) return '#3b82f6';
  if (ssi >= 55) return '#fbbf24';
  if (ssi >= 30) return '#f97316';
  return '#ef4444';
}

export default function WeatherReplayPanel() {
  const { ui, setUiState, weatherHistory, setWeatherHistory } = useSwerveStore();
  const show = ui?.showWeatherReplay;

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [hourIndex, setHourIndex] = useState(0); // 0 = now, 23 = 23h ago
  const [whatIfPrecip, setWhatIfPrecip] = useState(0);
  const [whatIfWind,   setWhatIfWind]   = useState(0);
  const [whatIfMode,   setWhatIfMode]   = useState(false);

  // Fetch 24h history from Open-Meteo archive
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      const { latitude: lat, longitude: lng } = pos.coords;

      const today   = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subHours(new Date(), 25), 'yyyy-MM-dd');

      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${yesterday}&end_date=${today}&hourly=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,weather_code,visibility,relative_humidity_2m&timezone=auto&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Open-Meteo fetch failed');
      const data = await res.json();

      const h = data.hourly;
      // Build last 24 entries ending at current hour
      const now = new Date();
      const entries = [];

      for (let i = 0; i < h.time.length; i++) {
        const t = new Date(h.time[i]);
        if (t <= now) {
          entries.push({
            time: t,
            temp:           h.temperature_2m[i],
            precip:         h.precipitation[i] * 25.4, // inch → mm
            windSpeed:      h.wind_speed_10m[i],
            windGust:       h.wind_gusts_10m[i],
            weatherCode:    h.weather_code[i],
            visibility:     (h.visibility?.[i] ?? 10000) / 1000, // m → km
            relativeHumidity: h.relative_humidity_2m?.[i] ?? 50,
          });
        }
      }

      // Keep last 24 hours, most recent first
      const last24 = entries.slice(-24).reverse();
      setWeatherHistory(last24);
      setHourIndex(0);
    } catch (e) {
      setError(e.message.includes('timeout') ? 'Location unavailable' : 'Could not load weather history');
    } finally {
      setLoading(false);
    }
  }, [setWeatherHistory]);

  useEffect(() => {
    if (show && weatherHistory.length === 0) {
      fetchHistory();
    }
  }, [show, weatherHistory.length, fetchHistory]);

  const close = () => setUiState({ showWeatherReplay: false });

  const current = weatherHistory[hourIndex];

  // Calculate SSI for selected hour (with optional What If overrides)
  const computedSSI = current
    ? (() => {
        const point = {
          temperature_2m: current.temp,
          precipitationIntensity: whatIfMode ? whatIfPrecip : current.precip,
          windGust: whatIfMode ? whatIfWind : current.windGust,
          wind_speed_10m: whatIfMode ? whatIfWind : current.windSpeed,
          weatherCode: current.weatherCode,
          visibility: current.visibility,
          relativeHumidity: current.relativeHumidity,
          lat: 0, lng: 0,
        };
        const result = calculateRouteSafety({ duration: 600, distance: 5000 }, [point]);
        return result;
      })()
    : null;

  const color = computedSSI ? ssiColor(computedSSI.ssi) : '#34d399';

  return (
    <AnimatePresence>
      {show && (
        <>
        <motion.div
          key="wr-backdrop"
          className="sm:hidden fixed inset-0 z-[54] bg-black/55 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
        />
        <motion.div
          key="weather-replay"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="
            fixed sm:absolute z-[55] sm:z-50
            left-0 right-0 bottom-0 sm:left-auto sm:bottom-0 sm:top-0 sm:right-0
            sm:flex sm:items-center sm:pr-4
          "
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="
              w-full sm:w-72
              max-h-[85vh] sm:max-h-[88vh]
              rounded-t-[28px] sm:rounded-[20px]
              border border-white/[0.1] overflow-hidden flex flex-col
            "
            style={{
              background: 'rgba(10,10,14,0.97)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Mobile drag handle + violet hairline */}
            <div className="sm:hidden flex-shrink-0 relative">
              <div
                className="absolute inset-x-0 top-0 h-[1.5px]"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.85), transparent)' }}
              />
              <div className="flex justify-center pt-3 pb-0.5">
                <div className="w-11 h-1 rounded-full" style={{ background: 'rgba(167,139,250,0.6)', boxShadow: '0 0 6px rgba(167,139,250,0.55)' }} />
              </div>
            </div>
            {/* Top bar */}
            <div
              className="h-[3px] flex-shrink-0 hidden sm:block"
              style={{ background: `linear-gradient(90deg, #a78bfa, #a78bfa44, transparent)` }}
            />

            <div className="p-4 overflow-y-auto no-scrollbar">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-violet-400/70">
                    Weather Replay
                  </p>
                  <h3 className="text-white text-sm font-semibold mt-0.5">24-Hour History</h3>
                </div>
                <button
                  onClick={close}
                  className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loading && (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                  <p className="text-white/30 text-xs">Loading 24h history…</p>
                </div>
              )}

              {error && (
                <div className="text-center py-6">
                  <p className="text-rose-400 text-sm">{error}</p>
                  <button
                    onClick={fetchHistory}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-white/[0.06] text-white/60 text-xs hover:bg-white/[0.1] transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!loading && !error && current && (
                <>
                  {/* Time slider */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/40 text-[10px] uppercase tracking-wide">
                        {hourIndex === 0 ? 'Now' : `${hourIndex}h ago`}
                      </span>
                      <span className="text-white/60 text-[11px] font-medium">
                        {format(current.time, 'EEE h:mm a')}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={weatherHistory.length - 1}
                      value={hourIndex}
                      onChange={(e) => setHourIndex(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #a78bfa ${(hourIndex / (weatherHistory.length - 1)) * 100}%, rgba(255,255,255,0.1) 0%)`,
                      }}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-white/20 text-[9px]">Now</span>
                      <span className="text-white/20 text-[9px]">24h ago</span>
                    </div>
                  </div>

                  {/* SSI + conditions */}
                  <div className="flex gap-3 mb-4">
                    <div
                      className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl border border-white/[0.07] w-20 h-20"
                      style={{ background: color + '14' }}
                    >
                      <motion.span
                        key={`ssi-${hourIndex}-${whatIfMode ? whatIfPrecip : 0}`}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-2xl font-bold"
                        style={{ color }}
                      >
                        {computedSSI?.ssi ?? '—'}
                      </motion.span>
                      <span className="text-white/30 text-[9px] mt-0.5">SSI</span>
                      <span className="text-[9px] font-semibold mt-0.5" style={{ color }}>
                        {computedSSI?.category ?? ''}
                      </span>
                    </div>

                    <div className="flex-1 space-y-1.5">
                      {[
                        { label: 'Temp', value: `${Math.round(current.temp)}°F` },
                        { label: 'Precip', value: `${(whatIfMode ? whatIfPrecip : current.precip).toFixed(1)} mm/h` },
                        { label: 'Wind', value: `${Math.round(whatIfMode ? whatIfWind : current.windGust)} mph gusts` },
                        { label: 'Condition', value: wmoLabel(current.weatherCode) },
                      ].map((s) => (
                        <div key={s.label} className="flex justify-between">
                          <span className="text-white/30 text-[11px]">{s.label}</span>
                          <span className="text-white/80 text-[11px] font-medium">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sparkline (mini SSI timeline) */}
                  <div className="mb-4">
                    <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1.5">SSI Timeline</p>
                    <svg viewBox={`0 0 ${weatherHistory.length * 10} 36`} className="w-full h-9" preserveAspectRatio="none">
                      {weatherHistory.map((h, i) => {
                        const pt = { temperature_2m: h.temp, precipitationIntensity: h.precip, windGust: h.windGust, wind_speed_10m: h.windSpeed, weatherCode: h.weatherCode, visibility: h.visibility, relativeHumidity: h.relativeHumidity, lat: 0, lng: 0 };
                        const s = calculateRouteSafety({ duration: 600, distance: 5000 }, [pt]).ssi;
                        const x = i * 10 + 5;
                        const y = 34 - (s / 100) * 30;
                        const c = ssiColor(s);
                        return (
                          <g key={i}>
                            <rect
                              x={i * 10 + 1}
                              y={y}
                              width={8}
                              height={34 - y}
                              fill={c + '33'}
                              rx={2}
                            />
                            {i === hourIndex && (
                              <rect x={i * 10} y={0} width={10} height={36} fill="rgba(255,255,255,0.06)" rx={2} />
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* What If? mode */}
                  <div
                    className="rounded-xl border border-white/[0.07] p-3"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white/70 text-xs font-semibold">What If?</p>
                        <p className="text-white/25 text-[10px]">Adjust conditions, see SSI change</p>
                      </div>
                      <button
                        onClick={() => setWhatIfMode((v) => !v)}
                        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${whatIfMode ? 'bg-violet-500' : 'bg-white/10'}`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${whatIfMode ? 'left-[18px]' : 'left-0.5'}`}
                        />
                      </button>
                    </div>

                    {whatIfMode && (
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-white/40 text-[10px]">Precipitation</span>
                            <span className="text-violet-300 text-[10px] font-medium">{whatIfPrecip.toFixed(1)} mm/h</span>
                          </div>
                          <input
                            type="range" min={0} max={50} step={0.5}
                            value={whatIfPrecip}
                            onChange={(e) => setWhatIfPrecip(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                            style={{ background: `linear-gradient(to right, #a78bfa ${(whatIfPrecip / 50) * 100}%, rgba(255,255,255,0.1) 0%)` }}
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-white/40 text-[10px]">Wind Gusts</span>
                            <span className="text-violet-300 text-[10px] font-medium">{whatIfWind} mph</span>
                          </div>
                          <input
                            type="range" min={0} max={80} step={1}
                            value={whatIfWind}
                            onChange={(e) => setWhatIfWind(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                            style={{ background: `linear-gradient(to right, #a78bfa ${(whatIfWind / 80) * 100}%, rgba(255,255,255,0.1) 0%)` }}
                          />
                        </div>
                        <button
                          onClick={() => { setWhatIfPrecip(0); setWhatIfWind(0); }}
                          className="text-white/25 text-[10px] hover:text-white/50 transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={fetchHistory}
                    className="w-full mt-3 py-2 rounded-xl text-white/30 text-[11px] hover:text-white/50 hover:bg-white/[0.04] transition-colors"
                  >
                    Refresh data
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
