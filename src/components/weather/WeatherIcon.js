import React, { memo } from 'react';

/**
 * Animated SVG Weather Icons based on WMO Weather Codes
 * Each icon has subtle animations that bring the UI to life
 */

const AnimatedSun = memo(() => (
    <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
            <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>
        </defs>
        {/* Sun rays */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
                key={deg}
                x1="32"
                y1="32"
                x2={32 + 24 * Math.cos((deg - 90) * Math.PI / 180)}
                y2={32 + 24 * Math.sin((deg - 90) * Math.PI / 180)}
                stroke="#fbbf24"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.6"
            >
                <animate attributeName="opacity" values="0.6;0.3;0.6" dur="2s" repeatCount="indefinite" begin={`${deg / 360}s`} />
            </line>
        ))}
        {/* Sun core */}
        <circle cx="32" cy="32" r="14" fill="url(#sunGrad)">
            <animate attributeName="r" values="14;15;14" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="32" cy="32" r="14" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.5">
            <animate attributeName="r" values="14;18;14" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
        </circle>
    </svg>
));

const AnimatedCloud = memo(() => (
    <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
            <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
        </defs>
        <g>
            <ellipse cx="28" cy="34" rx="16" ry="12" fill="url(#cloudGrad)" opacity="0.9">
                <animateTransform attributeName="transform" type="translate" values="0,0; 2,0; 0,0" dur="4s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="40" cy="30" rx="14" ry="10" fill="url(#cloudGrad)" opacity="0.95">
                <animateTransform attributeName="transform" type="translate" values="0,0; -1,0; 0,0" dur="4s" repeatCount="indefinite" begin="0.5s" />
            </ellipse>
            <ellipse cx="32" cy="36" rx="20" ry="10" fill="url(#cloudGrad)">
                <animateTransform attributeName="transform" type="translate" values="0,0; 1,0; 0,0" dur="4s" repeatCount="indefinite" begin="1s" />
            </ellipse>
        </g>
    </svg>
));

const AnimatedPartlyCloudy = memo(() => (
    <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
            <radialGradient id="sunGrad2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>
            <linearGradient id="cloudGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
        </defs>
        {/* Sun behind */}
        <circle cx="22" cy="22" r="10" fill="url(#sunGrad2)" opacity="0.9">
            <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" />
        </circle>
        {/* Cloud in front */}
        <g>
            <ellipse cx="36" cy="38" rx="16" ry="11" fill="url(#cloudGrad2)" opacity="0.95">
                <animateTransform attributeName="transform" type="translate" values="0,0; 1.5,0; 0,0" dur="5s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="46" cy="34" rx="12" ry="9" fill="url(#cloudGrad2)" opacity="0.9">
                <animateTransform attributeName="transform" type="translate" values="0,0; -1,0; 0,0" dur="5s" repeatCount="indefinite" begin="0.5s" />
            </ellipse>
            <ellipse cx="38" cy="40" rx="18" ry="9" fill="url(#cloudGrad2)">
                <animateTransform attributeName="transform" type="translate" values="0,0; 1,0; 0,0" dur="5s" repeatCount="indefinite" begin="1s" />
            </ellipse>
        </g>
    </svg>
));

const AnimatedRain = memo(() => (
    <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
            <linearGradient id="rainCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#475569" />
            </linearGradient>
        </defs>
        {/* Cloud */}
        <g>
            <ellipse cx="28" cy="26" rx="16" ry="11" fill="url(#rainCloudGrad)" />
            <ellipse cx="40" cy="24" rx="13" ry="9" fill="url(#rainCloudGrad)" />
            <ellipse cx="32" cy="28" rx="20" ry="10" fill="url(#rainCloudGrad)" />
        </g>
        {/* Rain drops */}
        {[0, 1, 2, 3, 4].map((i) => (
            <line
                key={i}
                x1={22 + i * 6}
                y1="36"
                x2={20 + i * 6}
                y2="48"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.7"
            >
                <animate
                    attributeName="y1"
                    values="36;44;36"
                    dur={`${0.8 + i * 0.15}s`}
                    repeatCount="indefinite"
                />
                <animate
                    attributeName="y2"
                    values="48;56;48"
                    dur={`${0.8 + i * 0.15}s`}
                    repeatCount="indefinite"
                />
                <animate
                    attributeName="opacity"
                    values="0.7;0;0.7"
                    dur={`${0.8 + i * 0.15}s`}
                    repeatCount="indefinite"
                />
            </line>
        ))}
    </svg>
));

const AnimatedSnow = memo(() => (
    <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
            <linearGradient id="snowCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
        </defs>
        {/* Cloud */}
        <g>
            <ellipse cx="28" cy="26" rx="16" ry="11" fill="url(#snowCloudGrad)" />
            <ellipse cx="40" cy="24" rx="13" ry="9" fill="url(#snowCloudGrad)" />
            <ellipse cx="32" cy="28" rx="20" ry="10" fill="url(#snowCloudGrad)" />
        </g>
        {/* Snowflakes */}
        {[0, 1, 2, 3, 4].map((i) => (
            <circle
                key={i}
                cx={22 + i * 6}
                cy="38"
                r="2"
                fill="white"
                opacity="0.8"
            >
                <animate
                    attributeName="cy"
                    values={`${38 + (i % 2) * 4};${54 + (i % 2) * 4}`}
                    dur={`${1.2 + i * 0.2}s`}
                    repeatCount="indefinite"
                />
                <animate
                    attributeName="cx"
                    values={`${22 + i * 6};${24 + i * 6};${22 + i * 6}`}
                    dur={`${1.2 + i * 0.2}s`}
                    repeatCount="indefinite"
                />
                <animate
                    attributeName="opacity"
                    values="0.8;0;0.8"
                    dur={`${1.2 + i * 0.2}s`}
                    repeatCount="indefinite"
                />
            </circle>
        ))}
    </svg>
));

const AnimatedThunder = memo(() => (
    <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
            <linearGradient id="stormCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
        </defs>
        {/* Dark cloud */}
        <g>
            <ellipse cx="28" cy="26" rx="16" ry="11" fill="url(#stormCloudGrad)" />
            <ellipse cx="40" cy="24" rx="13" ry="9" fill="url(#stormCloudGrad)" />
            <ellipse cx="32" cy="28" rx="20" ry="10" fill="url(#stormCloudGrad)" />
        </g>
        {/* Lightning bolt */}
        <polygon points="30,32 26,42 32,42 28,54 38,38 32,38" fill="#fbbf24">
            <animate attributeName="opacity" values="0;1;0;0;1;0" dur="2s" repeatCount="indefinite" />
        </polygon>
        {/* Rain */}
        {[0, 1, 2, 3].map((i) => (
            <line
                key={i}
                x1={20 + i * 7}
                y1="36"
                x2={18 + i * 7}
                y2="46"
                stroke="#38bdf8"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.5"
            >
                <animate attributeName="opacity" values="0.5;0;0.5" dur="0.6s" repeatCount="indefinite" begin={`${i * 0.1}s`} />
            </line>
        ))}
    </svg>
));

const AnimatedFog = memo(() => (
    <svg viewBox="0 0 64 64" className="w-full h-full">
        <g>
            {[20, 28, 36, 44].map((y, i) => (
                <rect
                    key={i}
                    x="8"
                    y={y}
                    width="48"
                    height="4"
                    rx="2"
                    fill="#94a3b8"
                    opacity="0.4"
                >
                    <animate
                        attributeName="x"
                        values={`${8 + i * 2};${4 + i * 2};${8 + i * 2}`}
                        dur={`${3 + i * 0.5}s`}
                        repeatCount="indefinite"
                    />
                    <animate
                        attributeName="opacity"
                        values={`${0.3 + i * 0.05};${0.5 + i * 0.05};${0.3 + i * 0.05}`}
                        dur={`${3 + i * 0.5}s`}
                        repeatCount="indefinite"
                    />
                </rect>
            ))}
        </g>
    </svg>
));

const AnimatedDrizzle = memo(() => (
    <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
            <linearGradient id="drizzleCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
        </defs>
        <g>
            <ellipse cx="28" cy="26" rx="16" ry="11" fill="url(#drizzleCloudGrad)" />
            <ellipse cx="40" cy="24" rx="13" ry="9" fill="url(#drizzleCloudGrad)" />
            <ellipse cx="32" cy="28" rx="20" ry="10" fill="url(#drizzleCloudGrad)" />
        </g>
        {[0, 1, 2, 3, 4].map((i) => (
            <line
                key={i}
                x1={22 + i * 5}
                y1="36"
                x2={21 + i * 5}
                y2="42"
                stroke="#7dd3fc"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.6"
            >
                <animate attributeName="opacity" values="0.6;0;0.6" dur={`${0.5 + i * 0.1}s`} repeatCount="indefinite" begin={`${i * 0.2}s`} />
            </line>
        ))}
    </svg>
));

/**
 * Get the appropriate animated icon component for a WMO weather code
 * @param {number} code - WMO weather code
 * @returns {React.Component} Animated SVG icon
 */
export const getWeatherIcon = (code) => {
    if (code === 0) return AnimatedSun;
    if (code === 1 || code === 2) return AnimatedPartlyCloudy;
    if (code === 3) return AnimatedCloud;
    if (code === 45 || code === 48) return AnimatedFog;
    if (code >= 51 && code <= 57) return AnimatedDrizzle;
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return AnimatedRain;
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return AnimatedSnow;
    if (code >= 95) return AnimatedThunder;
    return AnimatedCloud;
};

/**
 * Get weather condition description and color theme
 * @param {number} code - WMO weather code
 * @returns {Object} { description, color, glow }
 */
export const getWeatherTheme = (code) => {
    const themes = {
        0: { description: 'Clear Sky', color: '#fbbf24', glow: 'rgba(251,191,36,0.4)', bg: 'rgba(251,191,36,0.08)' },
        1: { description: 'Mainly Clear', color: '#fbbf24', glow: 'rgba(251,191,36,0.35)', bg: 'rgba(251,191,36,0.06)' },
        2: { description: 'Partly Cloudy', color: '#fbbf24', glow: 'rgba(251,191,36,0.3)', bg: 'rgba(251,191,36,0.05)' },
        3: { description: 'Overcast', color: '#94a3b8', glow: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.05)' },
        45: { description: 'Fog', color: '#94a3b8', glow: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.05)' },
        48: { description: 'Rime Fog', color: '#94a3b8', glow: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.05)' },
        51: { description: 'Light Drizzle', color: '#38bdf8', glow: 'rgba(56,189,248,0.3)', bg: 'rgba(56,189,248,0.05)' },
        53: { description: 'Moderate Drizzle', color: '#38bdf8', glow: 'rgba(56,189,248,0.35)', bg: 'rgba(56,189,248,0.06)' },
        55: { description: 'Dense Drizzle', color: '#38bdf8', glow: 'rgba(56,189,248,0.4)', bg: 'rgba(56,189,248,0.07)' },
        56: { description: 'Freezing Drizzle', color: '#7dd3fc', glow: 'rgba(125,211,252,0.35)', bg: 'rgba(125,211,252,0.06)' },
        57: { description: 'Dense Freezing Drizzle', color: '#7dd3fc', glow: 'rgba(125,211,252,0.4)', bg: 'rgba(125,211,252,0.07)' },
        61: { description: 'Slight Rain', color: '#38bdf8', glow: 'rgba(56,189,248,0.35)', bg: 'rgba(56,189,248,0.06)' },
        63: { description: 'Moderate Rain', color: '#38bdf8', glow: 'rgba(56,189,248,0.4)', bg: 'rgba(56,189,248,0.07)' },
        65: { description: 'Heavy Rain', color: '#0ea5e9', glow: 'rgba(14,165,233,0.45)', bg: 'rgba(14,165,233,0.08)' },
        66: { description: 'Freezing Rain', color: '#7dd3fc', glow: 'rgba(125,211,252,0.4)', bg: 'rgba(125,211,252,0.07)' },
        67: { description: 'Heavy Freezing Rain', color: '#7dd3fc', glow: 'rgba(125,211,252,0.45)', bg: 'rgba(125,211,252,0.08)' },
        71: { description: 'Slight Snow', color: '#e2e8f0', glow: 'rgba(226,232,240,0.35)', bg: 'rgba(226,232,240,0.06)' },
        73: { description: 'Moderate Snow', color: '#e2e8f0', glow: 'rgba(226,232,240,0.4)', bg: 'rgba(226,232,240,0.07)' },
        75: { description: 'Heavy Snow', color: '#cbd5e1', glow: 'rgba(203,213,225,0.45)', bg: 'rgba(203,213,225,0.08)' },
        77: { description: 'Snow Grains', color: '#e2e8f0', glow: 'rgba(226,232,240,0.35)', bg: 'rgba(226,232,240,0.06)' },
        80: { description: 'Rain Showers', color: '#38bdf8', glow: 'rgba(56,189,248,0.35)', bg: 'rgba(56,189,248,0.06)' },
        81: { description: 'Heavy Showers', color: '#0ea5e9', glow: 'rgba(14,165,233,0.4)', bg: 'rgba(14,165,233,0.07)' },
        82: { description: 'Violent Showers', color: '#0284c7', glow: 'rgba(2,132,199,0.5)', bg: 'rgba(2,132,199,0.1)' },
        85: { description: 'Snow Showers', color: '#e2e8f0', glow: 'rgba(226,232,240,0.35)', bg: 'rgba(226,232,240,0.06)' },
        86: { description: 'Heavy Snow Showers', color: '#cbd5e1', glow: 'rgba(203,213,225,0.4)', bg: 'rgba(203,213,225,0.07)' },
        95: { description: 'Thunderstorm', color: '#fbbf24', glow: 'rgba(251,191,36,0.5)', bg: 'rgba(251,191,36,0.1)' },
        96: { description: 'Thunderstorm & Hail', color: '#f59e0b', glow: 'rgba(245,158,11,0.55)', bg: 'rgba(245,158,11,0.12)' },
        99: { description: 'Severe Thunderstorm', color: '#ef4444', glow: 'rgba(239,68,68,0.6)', bg: 'rgba(239,68,68,0.15)' },
    };
    return themes[code] || { description: 'Unknown', color: '#94a3b8', glow: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.05)' };
};

/**
 * Main WeatherIcon component that renders the appropriate animated icon
 */
const WeatherIcon = memo(({ code, className = 'w-16 h-16' }) => {
    const Icon = getWeatherIcon(code);
    return (
        <div className={className}>
            <Icon />
        </div>
    );
});

WeatherIcon.displayName = 'WeatherIcon';
export default WeatherIcon;