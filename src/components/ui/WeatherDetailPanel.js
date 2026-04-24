import React, { memo } from 'react';
import useSwerveStore from '../../store/useSwerveStore';
import WeatherIcon, { getWeatherTheme, getWeatherIcon } from '../weather/WeatherIcon';

// ── Day Name Helper ────────────────────────────────────────────────────────────
const getDayName = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
};

// ── Mini Weather Icon (static) ─────────────────────────────────────────────────
const MiniWeatherIcon = memo(({ code, className = 'w-8 h-8' }) => {
    const Icon = getWeatherIcon(code);
    return (
        <div className={className}>
            <Icon />
        </div>
    );
});
MiniWeatherIcon.displayName = 'MiniWeatherIcon';

// ── Daily Forecast Card ────────────────────────────────────────────────────────
const DailyCard = ({ day, index }) => {
    const theme = getWeatherTheme(day.weatherCode);
    const delay = index * 0.05;

    return (
        <div
            className="flex-shrink-0 w-[72px] rounded-2xl p-2.5 flex flex-col items-center gap-1.5 border border-white/[0.04] hover:border-white/[0.1] transition-all duration-200 hover:scale-105 cursor-default animate-fade-in-up"
            style={{
                background: 'rgba(255,255,255,0.02)',
                animationDelay: `${delay}s`,
            }}
        >
            <div className="text-white/50 text-[9px] uppercase tracking-wider font-medium">{getDayName(day.date)}</div>
            <div className="w-8 h-8" style={{ filter: `drop-shadow(0 0 4px ${theme.glow})` }}>
                <MiniWeatherIcon code={day.weatherCode} className="w-full h-full" />
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-white font-mono text-xs font-bold tabular-nums">{Math.round(day.tempMax)}°</span>
                <span className="text-white/30 font-mono text-[10px] tabular-nums">{Math.round(day.tempMin)}°</span>
            </div>
            {day.precipSum > 0 && (
                <div className="text-blue-400 text-[8px] font-mono tabular-nums">{day.precipSum.toFixed(1)}″</div>
            )}
        </div>
    );
};

// ── Hourly Row ─────────────────────────────────────────────────────────────────
const HourlyRow = ({ hour, index }) => {
    const hour12 = hour.time % 12 || 12;
    const ampm = hour.time >= 12 ? 'PM' : 'AM';

    return (
        <div
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.03] transition-colors animate-fade-in"
            style={{ animationDelay: `${index * 0.02}s` }}
        >
            <div className="w-10 text-right">
                <span className="text-white/60 text-[10px] font-mono tabular-nums">{hour12}</span>
                <span className="text-white/30 text-[8px]">{ampm}</span>
            </div>
            <div className="w-6 h-6 shrink-0">
                <MiniWeatherIcon code={hour.weatherCode} className="w-full h-full" />
            </div>
            <div className="flex-1">
                <div className="text-white font-mono text-xs tabular-nums">{Math.round(hour.temp)}°</div>
            </div>
            <div className="w-16">
                {hour.precipProb > 0 && (
                    <div className="flex items-center gap-1">
                        <div className="h-1 rounded-full bg-white/[0.06] flex-1 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-blue-400/60"
                                style={{ width: `${hour.precipProb}%` }}
                            />
                        </div>
                        <span className="text-blue-400 text-[8px] font-mono tabular-nums">{hour.precipProb}%</span>
                    </div>
                )}
            </div>
            <div className="w-12 text-right">
                <span className="text-white/30 text-[9px] font-mono tabular-nums">{Math.round(hour.windSpeed)} <span className="text-white/15">mph</span></span>
            </div>
        </div>
    );
};

// ── Sun/Moon Indicator ─────────────────────────────────────────────────────────
const SunIndicator = ({ sunrise, sunset }) => {
    if (!sunrise || !sunset) return null;

    const sunriseTime = new Date(sunrise).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const sunsetTime = new Date(sunset).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return (
        <div className="flex items-center justify-between bg-white/[0.03] rounded-xl p-3 border border-white/[0.02]">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </div>
                <div>
                    <div className="text-white/40 text-[8px] uppercase tracking-wider">Sunrise</div>
                    <div className="text-white font-mono text-[10px] tabular-nums">{sunriseTime}</div>
                </div>
            </div>
            <div className="h-6 w-px bg-white/[0.06]" />
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                </div>
                <div>
                    <div className="text-white/40 text-[8px] uppercase tracking-wider">Sunset</div>
                    <div className="text-white font-mono text-[10px] tabular-nums">{sunsetTime}</div>
                </div>
            </div>
        </div>
    );
};

// ── Air Quality Ring (Simulated - would need AQ API) ───────────────────────────
const AirQualityRing = ({ aqi = 42 }) => {
    const getAQIInfo = (val) => {
        if (val <= 50) return { label: 'Good', color: '#22c55e', pct: val / 50 * 20 };
        if (val <= 100) return { label: 'Moderate', color: '#eab308', pct: 20 + (val - 50) / 50 * 20 };
        if (val <= 150) return { label: 'Unhealthy for Sensitive', color: '#f97316', pct: 40 + (val - 100) / 50 * 20 };
        if (val <= 200) return { label: 'Unhealthy', color: '#ef4444', pct: 60 + (val - 150) / 50 * 20 };
        if (val <= 300) return { label: 'Very Unhealthy', color: '#a855f7', pct: 80 + (val - 200) / 100 * 20 };
        return { label: 'Hazardous', color: '#7f1d1d', pct: 100 };
    };

    const info = getAQIInfo(aqi);
    const circumference = 2 * Math.PI * 18;
    const offset = circumference - (circumference * info.pct) / 100;

    return (
        <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-3 border border-white/[0.02]">
            <div className="relative w-12 h-12 shrink-0">
                <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                    <circle cx="20" cy="20" r="18" stroke="rgba(255,255,255,0.06)" strokeWidth="3" fill="none" />
                    <circle
                        cx="20" cy="20" r="18"
                        stroke={info.color}
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 4px ${info.color}60)` }}
                        className="transition-all duration-700"
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-white font-mono text-[9px] font-bold">{aqi}</span>
            </div>
            <div>
                <div className="text-white/40 text-[8px] uppercase tracking-wider">Air Quality</div>
                <div className="text-[10px] font-bold" style={{ color: info.color }}>{info.label}</div>
                <div className="text-white/25 text-[8px]">US EPA Standard</div>
            </div>
        </div>
    );
};

// ── XWeather Severe Weather Card ───────────────────────────────────────────────
const XWeatherSevereCard = ({ xweather }) => {
    if (!xweather) return null;

    const riskColor = xweather.severeRiskLevel === 'high' ? '#ef4444' : xweather.severeRiskLevel === 'moderate' ? '#fbbf24' : '#22c55e';
    const riskGlow = xweather.severeRiskLevel === 'high' ? 'rgba(239,68,68,0.2)' : xweather.severeRiskLevel === 'moderate' ? 'rgba(251,191,36,0.15)' : 'rgba(34,197,94,0.1)';

    return (
        <div
            className="rounded-xl p-3 border animate-fade-in-up"
            style={{
                background: riskGlow,
                borderColor: `${riskColor}30`,
            }}
        >
            <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4" style={{ color: riskColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: riskColor }}>
                    XWeather Severe Risk
                </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.03] rounded-lg p-2">
                    <div className="text-white/30 text-[8px] uppercase tracking-wider">Risk Level</div>
                    <div className="text-white font-mono text-[10px] font-bold capitalize">{xweather.severeRiskLevel}</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2">
                    <div className="text-white/30 text-[8px] uppercase tracking-wider">Storm Bearing</div>
                    <div className="text-white font-mono text-[10px] font-bold">{xweather.stormBearing}°</div>
                </div>
                {xweather.lightningStrikesNearby > 0 && (
                    <div className="col-span-2 bg-white/[0.03] rounded-lg p-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-amber-400 text-[9px] font-bold">{xweather.lightningStrikesNearby} lightning strikes nearby</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Main Panel ─────────────────────────────────────────────────────────────────
const WeatherDetailPanel = memo(() => {
    const { weather, ui, setUiState } = useSwerveStore();
    const isOpen = ui?.showWeatherDetail ?? false;

    const current = weather.current || {};
    const hourly = weather.hourly || [];
    const daily = weather.daily || [];
    const xweather = weather.xweather;
    const severeAlerts = weather.severeAlerts || [];

    const theme = getWeatherTheme(current.weatherCode ?? 0);

    const today = daily[0];

    if (!isOpen) return null;

    return (
        <div className="absolute top-6 left-[340px] z-40 w-80 max-h-[calc(100vh-48px)] overflow-y-auto no-scrollbar animate-slide-in-left">
            <div
                className="rounded-[20px] border border-white/[0.08] backdrop-blur-2xl overflow-hidden"
                style={{
                    background: 'rgba(10,10,14,0.85)',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
            >
                {/* Top edge glow matching weather theme */}
                <div
                    className="absolute inset-x-0 top-0 h-[1px] animate-edge-pulse"
                    style={{ background: `linear-gradient(90deg, transparent, ${theme.color}60, transparent)` }}
                />

                <div className="p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.color, boxShadow: `0 0 6px ${theme.color}` }} />
                            <h3 className="text-white/90 font-medium text-xs tracking-[0.2em] uppercase">Weather Detail</h3>
                        </div>
                        <button
                            onClick={() => setUiState({ showWeatherDetail: false })}
                            className="text-white/30 hover:text-white/70 transition-colors p-1"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Current Conditions Hero */}
                    <div
                        className="rounded-2xl p-5 mb-5 flex items-center gap-4 border border-white/[0.04]"
                        style={{ background: theme.bg }}
                    >
                        <div className="w-20 h-20 shrink-0" style={{ filter: `drop-shadow(0 0 16px ${theme.glow})` }}>
                            <WeatherIcon code={current.weatherCode ?? 0} className="w-full h-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-mono font-bold text-white tabular-nums tracking-tight">
                                    {Math.round(current.temp ?? 0)}°
                                </span>
                                <span className="text-white/40 text-base">F</span>
                            </div>
                            <div className="text-sm font-medium truncate" style={{ color: theme.color }}>
                                {theme.description}
                            </div>
                            <div className="text-white/30 text-[10px] mt-0.5">
                                Feels like {Math.round(current.feelsLike ?? current.temp ?? 0)}° · Humidity {current.humidity ?? 0}%
                            </div>
                        </div>
                    </div>

                    {/* 7-Day Forecast */}
                    <div className="mb-5">
                        <div className="text-white/40 text-[9px] uppercase tracking-wider mb-3">7-Day Forecast</div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {daily.map((day, i) => (
                                <DailyCard key={day.date} day={day} index={i} />
                            ))}
                        </div>
                    </div>

                    {/* Hourly Forecast */}
                    {hourly.length > 0 && (
                        <div className="mb-5">
                            <div className="text-white/40 text-[9px] uppercase tracking-wider mb-2">Hourly Forecast</div>
                            <div className="bg-white/[0.02] rounded-xl border border-white/[0.03] max-h-[200px] overflow-y-auto no-scrollbar">
                                {hourly.slice(0, 18).map((hour, i) => (
                                    <HourlyRow key={i} hour={hour} index={i} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sun/Moon + Air Quality Grid */}
                    <div className="grid grid-cols-1 gap-2 mb-4">
                        {today && <SunIndicator sunrise={today.sunrise} sunset={today.sunset} />}
                        <AirQualityRing aqi={42} />
                    </div>

                    {/* XWeather Severe Data */}
                    {xweather && <XWeatherSevereCard xweather={xweather} />}

                    {/* Severe Alerts */}
                    {severeAlerts.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {severeAlerts.map((alert, i) => (
                                <div
                                    key={i}
                                    className="bg-red-500/10 rounded-xl p-3 border border-red-500/20 animate-pulse"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-red-400 text-sm">⚠</span>
                                        <span className="text-red-400 text-[10px] font-bold uppercase tracking-wide">{alert.event}</span>
                                    </div>
                                    <div className="text-white/50 text-[9px] leading-relaxed">{alert.headline}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-between">
                        <div className="text-[9px] text-white/20 uppercase tracking-[0.15em]">Open-Meteo + XWeather</div>
                        <div className="text-[9px] text-white/20 uppercase tracking-[0.15em]">
                            {weather.lastUpdated ? new Date(weather.lastUpdated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '--'}
                        </div>
                    </div>
                </div>

                {/* Bottom edge glow */}
                <div
                    className="absolute inset-x-0 bottom-0 h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${theme.color}40, transparent)` }}
                />
            </div>
        </div>
    );
});

WeatherDetailPanel.displayName = 'WeatherDetailPanel';
export default WeatherDetailPanel;
