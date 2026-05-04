import React, { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSwerveStore from '../../store/useSwerveStore';
import WeatherIcon, { getWeatherTheme } from '../weather/WeatherIcon';
import { ssiTheme } from '../../design/tokens';
import { slideRight } from '../../design/motion';

// ── Animated Rolling Number ────────────────────────────────────────────────────
const RollingNumber = ({ value, className = '', suffix = '' }) => {
    const rounded = Math.round(value);
    const prev = useRef(rounded);
    const dir = rounded >= prev.current ? 1 : -1;
    useEffect(() => { prev.current = rounded; }, [rounded]);

    return (
        <span className={`relative inline-block overflow-hidden ${className}`} style={{ lineHeight: 1 }}>
            <AnimatePresence mode="popLayout" custom={dir}>
                <motion.span
                    key={rounded}
                    custom={dir}
                    variants={{
                        enter: (d) => ({ y: d > 0 ? '60%' : '-60%', opacity: 0 }),
                        center: { y: 0, opacity: 1 },
                        exit: (d) => ({ y: d > 0 ? '-60%' : '60%', opacity: 0 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                    className="inline-block"
                >
                    {rounded}{suffix}
                </motion.span>
            </AnimatePresence>
        </span>
    );
};

// ── Mini Sparkline with Area Fill ──────────────────────────────────────────────
const AreaSparkline = ({ values, color, width = 56, height = 22 }) => {
    if (!values || values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values, min + 1);
    const pts = values.map((v, i) => ({
        x: (i / (values.length - 1)) * width,
        y: height - ((v - min) / (max - min)) * (height - 4) - 2,
    }));
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaD = `${d} L${width},${height} L0,${height} Z`;
    const last = pts[pts.length - 1];
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <defs>
                <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />
            <path d={d} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={last.x} cy={last.y} r="2.5" fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
        </svg>
    );
};

// ── Wind Compass Rose ──────────────────────────────────────────────────────────
const WindCompass = ({ direction = 0, speed = 0, gusts = 0 }) => {
    const size = 56;
    const cx = size / 2;
    const r = size / 2 - 6;
    const cardinal = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="text-white/40 text-[9px] uppercase tracking-wider">Wind</div>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Outer ring */}
                <circle cx={cx} cy={cx} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none" />
                <circle cx={cx} cy={cx} r={r - 4} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" fill="none" />
                {/* Cardinal ticks */}
                {cardinal.map((label, i) => {
                    const deg = i * 45;
                    const rad = (deg - 90) * Math.PI / 180;
                    const isMain = i % 2 === 0;
                    const tickLen = isMain ? 4 : 2;
                    const x1 = cx + (r - tickLen) * Math.cos(rad);
                    const y1 = cx + (r - tickLen) * Math.sin(rad);
                    const x2 = cx + r * Math.cos(rad);
                    const y2 = cx + r * Math.sin(rad);
                    return (
                        <g key={label}>
                            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth="0.75" />
                            {isMain && (
                                <text
                                    x={cx + (r - 11) * Math.cos(rad)}
                                    y={cx + (r - 11) * Math.sin(rad)}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fill="rgba(255,255,255,0.25)"
                                    fontSize="5"
                                    fontWeight="600"
                                >
                                    {label}
                                </text>
                            )}
                        </g>
                    );
                })}
                {/* Wind arrow */}
                {speed > 0 && (
                    <g transform={`rotate(${direction}, ${cx}, ${cx})`}>
                        <polygon
                            points={`${cx},${cx - r + 4} ${cx - 3},${cx + 2} ${cx + 3},${cx + 2}`}
                            fill={speed > 25 ? '#ef4444' : speed > 15 ? '#fbbf24' : '#22d3ee'}
                            opacity="0.9"
                        >
                            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-1; 0,0" dur={`${Math.max(0.5, 2 - speed / 30)}s`} repeatCount="indefinite" />
                        </polygon>
                        <line x1={cx} y1={cx - r + 4} x2={cx} y2={cx + 2} stroke={speed > 25 ? '#ef4444' : speed > 15 ? '#fbbf24' : '#22d3ee'} strokeWidth="1" />
                    </g>
                )}
                {/* Center */}
                <circle cx={cx} cy={cx} r="2" fill="rgba(255,255,255,0.4)" />
            </svg>
            <div className="flex flex-col items-center">
                <span className="text-white font-mono text-[10px] tabular-nums">{speed.toFixed(1)} <span className="text-white/40">mph</span></span>
                {gusts > speed + 5 && (
                    <span className="text-amber-400 text-[8px] font-mono tabular-nums">G {gusts.toFixed(0)}</span>
                )}
            </div>
        </div>
    );
};

// ── Visibility Bar ─────────────────────────────────────────────────────────────
const VisibilityBar = ({ visibility = 10 }) => {
    // visibility arrives in km from useWeatherPolling — convert to miles for display
    const visMiles = visibility * 0.621371;
    const pct = Math.min(100, (visMiles / 10) * 100);
    const color = visMiles >= 6 ? '#22c55e' : visMiles >= 3 ? '#eab308' : '#ef4444';
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
                <span className="text-white/40 text-[9px] uppercase tracking-wider">Visibility</span>
                <span className="text-white font-mono text-[10px] tabular-nums">{visMiles.toFixed(1)} <span className="text-white/40">mi</span></span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}80, ${color})`,
                        boxShadow: `0 0 6px ${color}40`,
                    }}
                />
            </div>
        </div>
    );
};

// ── UV Index Badge ─────────────────────────────────────────────────────────────
const UVBadge = ({ uv = 0 }) => {
    const getUVInfo = (u) => {
        if (u <= 2) return { label: 'Low', color: '#22c55e' };
        if (u <= 5) return { label: 'Mod', color: '#eab308' };
        if (u <= 7) return { label: 'High', color: '#f97316' };
        if (u <= 10) return { label: 'Very High', color: '#ef4444' };
        return { label: 'Extreme', color: '#a855f7' };
    };
    const info = getUVInfo(uv);
    return (
        <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
                <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
                    <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.06)" strokeWidth="3" fill="none" />
                    <circle
                        cx="16" cy="16" r="12"
                        stroke={info.color}
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 12}`}
                        strokeDashoffset={`${2 * Math.PI * 12 * (1 - Math.min(uv, 11) / 11)}`}
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 4px ${info.color}60)` }}
                        className="transition-all duration-700"
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-white font-mono text-[9px] font-bold">{Math.round(uv)}</span>
            </div>
            <div>
                <div className="text-white/40 text-[9px] uppercase tracking-wider">UV Index</div>
                <div className="text-[10px] font-bold" style={{ color: info.color }}>{info.label}</div>
            </div>
        </div>
    );
};

// ── Pressure Indicator ─────────────────────────────────────────────────────────
const PressureGauge = ({ pressure = 1013, trend = 0 }) => {
    const trendIcon = trend > 0.5 ? '↗' : trend < -0.5 ? '↘' : '→';
    const trendColor = trend > 0.5 ? '#22c55e' : trend < -0.5 ? '#ef4444' : '#94a3b8';
    return (
        <div className="flex items-center gap-2">
            <div className="text-white/40 text-[9px] uppercase tracking-wider">Pressure</div>
            <div className="flex items-baseline gap-1">
                <span className="text-white font-mono text-[10px] tabular-nums">{Math.round(pressure)}</span>
                <span className="text-white/30 text-[8px]">hPa</span>
                <span className="text-[10px] ml-0.5" style={{ color: trendColor }}>{trendIcon}</span>
            </div>
        </div>
    );
};

// ── Hourly Temperature Mini-Chart ──────────────────────────────────────────────
const HourlyChart = ({ hourly = [], color = '#22d3ee' }) => {
    if (!hourly?.length) return null;
    const temps = hourly.slice(0, 12).map((h) => h.temp).filter(Boolean);
    if (temps.length < 2) return null;

    const width = 220;
    const height = 40;
    const min = Math.min(...temps);
    const max = Math.max(...temps, min + 1);
    const padding = 4;

    const pts = temps.map((t, i) => ({
        x: (i / (temps.length - 1)) * (width - padding * 2) + padding,
        y: height - padding - ((t - min) / (max - min)) * (height - padding * 2),
    }));

    const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaD = `${lineD} L${width - padding},${height} L${padding},${height} Z`;

    return (
        <div className="flex flex-col gap-1.5">
            <div className="text-white/40 text-[9px] uppercase tracking-wider">12-Hour Trend</div>
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                <defs>
                    <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaD} fill="url(#hourlyGrad)" />
                <path d={lineD} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                {/* Hour markers */}
                {pts.filter((_, i) => i % 3 === 0).map((p, i) => (
                    <g key={i}>
                        <circle cx={p.x} cy={p.y} r="2" fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
                        <text x={p.x} y={height - 1} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="6">
                            {((hourly[i * 3]?.time ?? 0) % 12 || 12)}{hourly[i * 3]?.time >= 12 ? 'p' : 'a'}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

// ── Dewpoint Comfort Indicator ─────────────────────────────────────────────────
const DewpointIndicator = ({ dewPoint, humidity }) => {
    const comfort = dewPoint < 55 ? 'Comfortable' : dewPoint < 65 ? 'Sticky' : dewPoint < 70 ? 'Uncomfortable' : 'Oppressive';
    const color = dewPoint < 55 ? '#22c55e' : dewPoint < 65 ? '#eab308' : dewPoint < 70 ? '#f97316' : '#ef4444';
    return (
        <div className="flex items-center justify-between">
            <div>
                <div className="text-white/40 text-[9px] uppercase tracking-wider">Humidity</div>
                <div className="text-white font-mono text-[10px] tabular-nums">{humidity}%</div>
            </div>
            <div className="text-right">
                <div className="text-white/40 text-[9px] uppercase tracking-wider">Dewpoint</div>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
                    <span className="text-white font-mono text-[10px] tabular-nums">{Math.round(dewPoint)}°F</span>
                </div>
                <div className="text-[8px]" style={{ color }}>{comfort}</div>
            </div>
        </div>
    );
};

// ── XWeather Lightning Badge ───────────────────────────────────────────────────
const LightningBadge = ({ xweather }) => {
    if (!xweather?.lightningStrikesNearby) return null;
    return (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <svg className="w-3.5 h-3.5 text-amber-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            <div>
                <div className="text-amber-400 text-[9px] font-bold uppercase tracking-wide">
                    ⚡ {xweather.lightningStrikesNearby} strikes nearby
                </div>
                {xweather.lightningDistance && (
                    <div className="text-white/40 text-[8px]">Closest: {xweather.lightningDistance} mi away</div>
                )}
            </div>
        </div>
    );
};

// ── Main Panel ─────────────────────────────────────────────────────────────────
const TelemetryPanel = memo(() => {
    const { routeTelemetry, weather } = useSwerveStore();
    const ssi = routeTelemetry?.ssi ?? 100;
    const fastestSsi = routeTelemetry?.fastestSsi ?? 100;
    const traction = routeTelemetry?.traction ?? 100;
    const roadTemp = routeTelemetry?.roadTemp ?? weather.current?.roadTemp ?? weather.current?.temp ?? '--';

    const current = weather.current || {};
    const windSpeed = current.windSpeed ?? 0;
    const windDirection = current.windDirection ?? 0;
    const windGusts = current.windGusts ?? 0;
    const precipIntensity = current.precipitationIntensity ?? 0;
    const weatherCode = current.weatherCode ?? 0;
    const visibility = current.visibility ?? 10;
    const humidity = current.humidity ?? 50;
    const dewPoint = current.dewPoint ?? 60;
    const uvIndex = current.uvIndex ?? 0;
    const pressure = current.pressure ?? 1013;
    const pressureTrend = current.pressureTrend ?? 0;
    const hourly = weather.hourly || [];
    const xweather = weather.xweather;
    const severeAlerts = weather.severeAlerts || [];

    const [isExpanded, setIsExpanded] = useState(false);
    const [ssiHistory, setSsiHistory] = useState([100, 100, 100]);
    const [tractionHistory, setTractionHistory] = useState([100, 100, 100]);

    const theme = getWeatherTheme(weatherCode);

    useEffect(() => {
        setSsiHistory((prev) => [...prev.slice(-6), ssi]);
    }, [ssi]);

    useEffect(() => {
        setTractionHistory((prev) => [...prev.slice(-6), traction]);
    }, [traction]);

    const isAdventureMode = routeTelemetry?.isAdventureMode ?? false;
    const adventureScore = routeTelemetry?.adventureScore ?? null;
    const adventureCategory = routeTelemetry?.adventureCategory ?? null;

    const { color: ssiRingColor, glow: ringGlowRaw, label: ssiLabel } = ssiTheme(ssi);
    const ringColor = isAdventureMode ? '#f97316' : ssiRingColor;
    const ringGlow = isAdventureMode ? 'rgba(249,115,22,0.6)' : ringGlowRaw;
    const edgeColor = ringColor + '70';
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (circumference * ssi) / 100;

    const sparkColor = ringColor;

    // ── Status word (the expressive label that anchors the pill) ─────────────
    // "All Clear" / "Cruising" / "Caution" / "Heads Up" / "Danger" / "🔥 Adventure"
    const statusWord = isAdventureMode
        ? '🔥 ADVENTURE'
        : ssi >= 85 ? 'ALL CLEAR'
        : ssi >= 70 ? 'CRUISING'
        : ssi >= 55 ? 'CAUTION'
        : ssi >= 30 ? 'HEADS UP'
        : 'DANGER';

    // Mobile: pill at the top, expands into a top-slide sheet on tap.
    // Desktop (sm+): the original glass panel docked top-left, always rendered.
    const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

    // Body content reused by both desktop panel and mobile sheet.
    // `forceExpanded` lets the mobile sheet always show the full detail block.
    const renderBody = (forceExpanded = false) => {
        const showExpanded = forceExpanded || isExpanded;
        return (
            <div className="p-5">
                {/* Header — single status anchor, no competing badges */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <motion.div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: ringColor, boxShadow: `0 0 8px ${ringColor}` }}
                            animate={{ opacity: [1, 0.45, 1] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <h3 className="text-white/90 font-semibold text-[11px] tracking-[0.22em] uppercase">Telemetry</h3>
                    </div>
                    <div className="flex gap-2 items-center">
                        {fastestSsi < ssi && (
                            <div className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md animate-pulse"
                                style={{ background: 'rgba(96,165,250,0.10)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.22)' }}>
                                Bypass Suggested
                            </div>
                        )}
                        <span
                            className="text-[10px] font-bold uppercase tracking-[0.18em]"
                            style={{ color: ringColor, textShadow: `0 0 10px ${ringGlow}` }}
                        >
                            {statusWord}
                        </span>
                        <svg
                            className={`w-3 h-3 text-white/30 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                {/* Weather Icon + Temp + Condition */}
                <div className="flex items-center gap-4 mb-5">
                    <div className="w-16 h-16 shrink-0" style={{ filter: `drop-shadow(0 0 12px ${theme.glow})` }}>
                        <WeatherIcon code={weatherCode} className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-mono font-bold text-white tabular-nums tracking-tight">
                                {Math.round(current.temp ?? roadTemp)}°
                            </span>
                            <span className="text-white/40 text-sm">F</span>
                        </div>
                        <div className="text-[11px] font-medium truncate" style={{ color: theme.color }}>
                            {theme.description}
                        </div>
                        <div className="text-white/30 text-[10px]">
                            Feels like {Math.round(current.feelsLike ?? current.temp ?? roadTemp)}°
                            {current.cloudCover > 30 && ` · ${current.cloudCover}% cloud`}
                        </div>
                    </div>
                </div>

                {/* Safety Ring — hero anchor */}
                <div className="flex flex-col items-center justify-center mb-5">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                        {/* Outer breathing aura */}
                        <motion.div
                            className="absolute inset-[-10px] rounded-full pointer-events-none"
                            style={{ background: `radial-gradient(circle, ${ringGlow} 0%, transparent 65%)`, filter: 'blur(6px)' }}
                            animate={{ opacity: [0.45, 0.85, 0.45], scale: [0.95, 1.04, 0.95] }}
                            transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <defs>
                                <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={ringColor} stopOpacity="0.35" />
                                    <stop offset="100%" stopColor={ringColor} />
                                </linearGradient>
                            </defs>
                            <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="transparent" />
                            <circle
                                cx="50" cy="50" r="40"
                                stroke="url(#ringGradient)"
                                strokeWidth="6"
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                                style={{ filter: `drop-shadow(0 0 12px ${ringGlow})` }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span
                                className="font-bold text-white tabular-nums leading-none"
                                style={{
                                    fontSize: 52,
                                    letterSpacing: '-0.05em',
                                    textShadow: `0 0 18px ${ringGlow}`,
                                }}
                            >
                                <RollingNumber value={ssi} />
                            </span>
                            <span
                                className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.22em]"
                                style={{ color: ringColor, textShadow: `0 0 8px ${ringGlow}` }}
                            >
                                {statusWord}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Adventure Score row — only in adventure mode */}
                {isAdventureMode && adventureScore != null && (
                    <div className="flex items-center justify-center gap-2 mb-3 py-1.5 px-3 rounded-xl"
                        style={{ background: 'rgba(217,119,6,0.10)', border: '1px solid rgba(249,115,22,0.20)' }}>
                        <span className="text-base leading-none">🔥</span>
                        <span className="text-amber-400 font-mono text-sm font-bold tabular-nums">
                            AS {Math.round(adventureScore)}
                        </span>
                        <span className="text-amber-400/70 text-[11px]">— {adventureCategory}</span>
                    </div>
                )}

                {/* SSI + Traction Sparklines */}
                <div className="flex items-center justify-between mb-4 px-1">
                    <div>
                        <div className="text-white/30 text-[9px] uppercase tracking-wider mb-1">SSI Trend</div>
                        <AreaSparkline values={ssiHistory} color={sparkColor} />
                    </div>
                    <div className="text-right">
                        <div className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Traction Trend</div>
                        <AreaSparkline values={tractionHistory} color="#22d3ee" />
                    </div>
                </div>

                {/* Original Path Risk — minimal, status-toned */}
                {fastestSsi < 80 && fastestSsi !== ssi && (
                    <div className="mb-4 flex items-center justify-between py-2 border-y border-rose-500/15 animate-fade-in">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-4 rounded-full" style={{ background: '#f43f5e', boxShadow: '0 0 6px #f43f5e' }} />
                            <div className="text-rose-300/90 text-[10px] font-bold uppercase tracking-[0.18em]">Original Path Risk</div>
                        </div>
                        <div className="text-rose-300 font-bold text-base tabular-nums" style={{ letterSpacing: '-0.03em' }}>
                            {Math.round(fastestSsi)}<span className="text-rose-400/60 text-xs">%</span>
                        </div>
                    </div>
                )}

                {/* ─── Conditions section: typography rhythm + dividers ─── */}
                <div className="mb-4">
                    <div className="text-[9px] uppercase tracking-[0.22em] text-white/30 mb-3">Conditions</div>
                    {/* Hero stat row: Road Temp | Traction — confident numerals, no borders */}
                    <div className="grid grid-cols-2 gap-4 pb-3 border-b border-white/[0.06]">
                        <div>
                            <div className="text-white/35 text-[10px] uppercase tracking-wider">Road Temp</div>
                            <div className="mt-0.5 flex items-baseline gap-1">
                                <span className="text-white font-bold tabular-nums" style={{ fontSize: 26, letterSpacing: '-0.03em' }}>
                                    {Math.round(roadTemp)}
                                </span>
                                <span className="text-white/40 text-sm">°F</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-white/35 text-[10px] uppercase tracking-wider">Traction</div>
                            <div className="mt-0.5 flex items-baseline justify-end gap-1">
                                <span
                                    className="font-bold tabular-nums"
                                    style={{
                                        fontSize: 26,
                                        letterSpacing: '-0.03em',
                                        color: traction >= 80 ? '#34d399' : traction >= 60 ? '#fbbf24' : '#f43f5e',
                                    }}
                                >
                                    {traction}
                                </span>
                                <span className="text-white/40 text-sm">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Precip + Wind row — wind compass is its own visual hero */}
                    <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
                        <div>
                            <div className="text-white/35 text-[10px] uppercase tracking-wider">Precip · past hr</div>
                            <div className="mt-0.5 flex items-baseline gap-1">
                                {precipIntensity >= 0.01 ? (
                                    <>
                                        <span className="text-white font-bold tabular-nums" style={{ fontSize: 22, letterSpacing: '-0.03em' }}>
                                            {precipIntensity.toFixed(2)}
                                        </span>
                                        <span className="text-white/40 text-xs">in</span>
                                    </>
                                ) : precipIntensity > 0 ? (
                                    <span className="text-white/65 text-base">Trace</span>
                                ) : (
                                    <span className="text-white/35 text-base">None</span>
                                )}
                            </div>
                        </div>
                        <WindCompass direction={windDirection} speed={windSpeed} gusts={windGusts} />
                    </div>

                    {/* Visibility + UV + Pressure rows */}
                    <div className="pt-3 space-y-3">
                        <VisibilityBar visibility={visibility} />
                        <div className="flex items-center justify-between pt-0.5">
                            <UVBadge uv={uvIndex} />
                            <PressureGauge pressure={pressure} trend={pressureTrend} />
                        </div>
                    </div>
                </div>

                {/* Expanded Content */}
                {showExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/[0.05] animate-fade-in-up space-y-4">
                        {/* Hourly Chart */}
                        <HourlyChart hourly={hourly} color={theme.color} />

                        {/* Humidity / Dewpoint */}
                        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.02]">
                            <DewpointIndicator dewPoint={dewPoint} humidity={humidity} />
                        </div>

                        {/* XWeather Lightning */}
                        {xweather?.lightningStrikesNearby > 0 && (
                            <LightningBadge xweather={xweather} />
                        )}

                        {/* Severe Alerts Banner */}
                        {severeAlerts.length > 0 && (
                            <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20 animate-pulse">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-red-400 text-lg">⚠</span>
                                    <span className="text-red-400 text-[10px] font-bold uppercase tracking-wide">{severeAlerts[0].event}</span>
                                </div>
                                <div className="text-white/50 text-[9px] leading-relaxed">{severeAlerts[0].headline}</div>
                            </div>
                        )}

                        {/* Segment Analysis */}
                        <div className="space-y-2">
                            <div className="text-white/30 text-[9px] uppercase tracking-wider">Segment Analysis</div>
                            {[
                                { label: 'Visibility', value: visibility < 3 ? 'Poor' : visibility < 6 ? 'Reduced' : 'Clear', ok: visibility >= 6 },
                                { label: 'Road Surface', value: precipIntensity > 0.05 ? 'Wet' : precipIntensity > 0.001 ? 'Damp' : 'Dry', ok: precipIntensity < 0.001 },
                                { label: 'Wind Hazard', value: windSpeed > 35 ? 'Extreme' : windSpeed > 25 ? 'High' : windSpeed > 15 ? 'Moderate' : 'Low', ok: windSpeed <= 15 },
                                { label: 'UV Exposure', value: uvIndex > 7 ? 'Very High' : uvIndex > 5 ? 'High' : uvIndex > 2 ? 'Moderate' : 'Low', ok: uvIndex <= 5 },
                            ].map(({ label, value, ok }) => (
                                <div key={label} className="flex items-center justify-between">
                                    <span className="text-white/40 text-[10px]">{label}</span>
                                    <span className={`text-[10px] font-bold ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-white/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <div className="text-[9px] text-white/25 uppercase tracking-[0.15em]">Open-Meteo</div>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="text-[9px] text-white/25 uppercase tracking-[0.15em]">XWeather Live</div>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="text-[9px] text-white/25 uppercase tracking-[0.15em]">Live Scan</div>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* ── DESKTOP: original glass panel docked top-left ─────────────────── */}
            <motion.div
                className="hidden sm:block absolute z-40 w-80 rounded-[20px] glass-panel overflow-hidden cursor-pointer"
                style={{
                    top: 'calc(var(--safe-top, 0px) + 12px)',
                    left: 'calc(var(--safe-left, 0px) + 12px)',
                    boxShadow: `0 0 0 1px ${edgeColor}, 0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)`,
                    transition: 'box-shadow 1.5s ease',
                }}
                variants={slideRight}
                initial="hidden"
                animate="visible"
                onClick={() => setIsExpanded((v) => !v)}
                title="Click to expand"
            >
                <div
                    className="absolute inset-x-0 top-0 h-[1px] animate-edge-pulse"
                    style={{ background: `linear-gradient(90deg, transparent, ${edgeColor}, transparent)` }}
                />
                {renderBody(false)}
                <div
                    className="absolute inset-x-0 bottom-0 h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${edgeColor}80, transparent)` }}
                />
            </motion.div>

            {/* ── MOBILE: hero pill — Flighty-grade single-color discipline ─────── */}
            <motion.button
                type="button"
                onClick={() => setMobileSheetOpen(true)}
                className="sm:hidden absolute z-40 left-3 right-3 rounded-[22px] overflow-hidden text-left active:scale-[0.985] transition-transform"
                style={{
                    top: 'calc(var(--safe-top, 0px) + 10px)',
                    background: 'linear-gradient(180deg, rgba(15,15,22,0.94) 0%, rgba(8,8,12,0.96) 100%)',
                    backdropFilter: 'blur(28px)',
                    WebkitBackdropFilter: 'blur(28px)',
                    boxShadow: `
                        0 0 0 1px ${ringColor}33,
                        0 0 28px ${ringGlow},
                        0 14px 36px rgba(0,0,0,0.5),
                        inset 0 1px 0 rgba(255,255,255,0.06)
                    `,
                }}
                variants={slideRight}
                initial="hidden"
                animate="visible"
                aria-label="Open Telemetry"
            >
                {/* Aurora — slow-breathing radial behind the SSI hero, tinted by status */}
                <motion.div
                    className="absolute pointer-events-none"
                    style={{
                        right: -40,
                        top: -30,
                        width: 200,
                        height: 200,
                        background: `radial-gradient(circle, ${ringColor}38 0%, ${ringColor}10 35%, transparent 70%)`,
                        filter: 'blur(8px)',
                    }}
                    animate={{ opacity: [0.65, 1, 0.65], scale: [1, 1.08, 1] }}
                    transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Subtle counter-aurora on the left */}
                <motion.div
                    className="absolute pointer-events-none"
                    style={{
                        left: -50,
                        bottom: -40,
                        width: 180,
                        height: 180,
                        background: `radial-gradient(circle, ${theme.glow} 0%, transparent 60%)`,
                        filter: 'blur(10px)',
                        opacity: 0.5,
                    }}
                    animate={{ opacity: [0.35, 0.55, 0.35] }}
                    transition={{ duration: 6.8, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Animated status hairline at top */}
                <div
                    className="absolute inset-x-0 top-0 h-[1.5px] overflow-hidden"
                    style={{ background: `linear-gradient(90deg, transparent, ${ringColor}, transparent)` }}
                >
                    <motion.div
                        className="absolute top-0 bottom-0 w-1/3"
                        style={{ background: `linear-gradient(90deg, transparent, white, transparent)`, mixBlendMode: 'overlay' }}
                        animate={{ x: ['-150%', '350%'] }}
                        transition={{ duration: 4.2, repeat: Infinity, ease: 'linear' }}
                    />
                </div>

                <div className="relative flex items-center gap-3 px-4 py-3">
                    {/* ─ Weather icon (compact hero) ─ */}
                    <div
                        className="w-11 h-11 shrink-0"
                        style={{ filter: `drop-shadow(0 0 10px ${theme.glow})` }}
                    >
                        <WeatherIcon code={weatherCode} className="w-full h-full" />
                    </div>

                    {/* ─ Temp + condition stacked ─ */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 leading-none">
                            <span
                                className="font-bold text-white tabular-nums"
                                style={{
                                    fontSize: 32,
                                    letterSpacing: '-0.04em',
                                    fontFeatureSettings: '"tnum" 1',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                                }}
                            >
                                {Math.round(current.temp ?? roadTemp)}°
                            </span>
                        </div>
                        <div className="mt-1 truncate text-[12px] font-semibold tracking-tight" style={{ color: theme.color }}>
                            {theme.description}
                        </div>
                        <div className="text-white/35 text-[10px] mt-0.5 truncate">
                            Feels {Math.round(current.feelsLike ?? current.temp ?? roadTemp)}° · {humidity}% RH
                        </div>
                    </div>

                    {/* ─ SSI hero — confident numeral + status word, single accent ─ */}
                    <div className="relative shrink-0 flex flex-col items-end pl-2">
                        <span
                            className="font-bold tabular-nums leading-none"
                            style={{
                                fontSize: 34,
                                color: ringColor,
                                letterSpacing: '-0.04em',
                                fontFeatureSettings: '"tnum" 1',
                                textShadow: `0 0 14px ${ringGlow}, 0 0 28px ${ringGlow}`,
                            }}
                        >
                            <RollingNumber value={ssi} />
                        </span>
                        <div
                            className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.18em]"
                            style={{ color: ringColor, opacity: 0.95 }}
                        >
                            {statusWord}
                        </div>
                        <div
                            className="mt-0.5 h-[2px] rounded-full"
                            style={{
                                width: `${Math.max(18, Math.min(48, (ssi / 100) * 48))}px`,
                                background: `linear-gradient(90deg, transparent, ${ringColor})`,
                                boxShadow: `0 0 6px ${ringGlow}`,
                            }}
                        />
                    </div>
                </div>
            </motion.button>

            {/* ── MOBILE: expanded sheet (slide down from top) ───────────────────── */}
            <AnimatePresence>
                {mobileSheetOpen && (
                    <motion.div
                        key="telemetry-sheet"
                        className="sm:hidden fixed inset-0 z-50 flex flex-col"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Backdrop */}
                        <motion.div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setMobileSheetOpen(false)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                        {/* Sheet */}
                        <motion.div
                            className="relative rounded-b-[28px] glass-panel overflow-hidden mx-2"
                            style={{
                                paddingTop: 'calc(var(--safe-top, 0px) + 6px)',
                                maxHeight: 'calc(100dvh - 80px)',
                                overflowY: 'auto',
                                boxShadow: `0 0 0 1px ${edgeColor}, 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
                            }}
                            initial={{ y: '-100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '-100%' }}
                            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                        >
                            {/* Drag handle */}
                            <div className="flex justify-center pt-2 pb-1">
                                <div className="w-12 h-1 rounded-full bg-white/20" />
                            </div>
                            {renderBody(true)}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
});

TelemetryPanel.displayName = 'TelemetryPanel';
export default TelemetryPanel;