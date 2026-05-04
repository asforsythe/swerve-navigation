import React, { useState } from 'react';
import useSwerveStore from '../../store/useSwerveStore';

const ToggleRow = ({ label, sublabel, active, onToggle, pulseColor }) => (
    <div className="flex items-center justify-between py-2.5">
        <div className="flex items-center gap-2.5">
            {active && (
                <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: pulseColor }}
                />
            )}
            <div>
                <div className="text-white/90 text-[11px] font-medium">{label}</div>
                {sublabel && <div className="text-white/30 text-[9px]">{sublabel}</div>}
            </div>
        </div>
        <button
            onClick={onToggle}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${active ? 'bg-blue-500' : 'bg-white/10'
                }`}
        >
            <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${active ? 'translate-x-4' : 'translate-x-0'
                    }`}
            />
        </button>
    </div>
);

const WeatherLayersPanel = () => {
    const [attributionOpen, setAttributionOpen] = useState(false);
    const { ui, weatherLayers, setWeatherLayer } = useSwerveStore();
    const isOpen = ui?.showWeatherLayers ?? false;

    const toggle = (key) => setWeatherLayer(key, !weatherLayers[key]);

    if (!isOpen) return null;

    const close = () => useSwerveStore.getState().setUiState({ showWeatherLayers: false });

    return (
        <>
            <div
                className="sm:hidden fixed inset-0 z-[54] bg-black/55 backdrop-blur-[2px] animate-fade-in"
                onClick={close}
            />
            <div
                className="
                    fixed sm:absolute z-[55] sm:z-50
                    left-0 right-0 bottom-0 sm:left-auto sm:bottom-auto sm:top-16 sm:right-4
                    w-full sm:w-72
                    sm:animate-slide-in-right
                "
                style={{ paddingBottom: 'calc(var(--safe-bottom, 0px) + 4px)' }}
            >
            <div
                className="rounded-t-[28px] sm:rounded-2xl border border-white/[0.10] backdrop-blur-2xl overflow-hidden"
                style={{
                    background: 'rgba(10,10,14,0.92)',
                    boxShadow: '0 -12px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
            >
                {/* Mobile drag handle + blue hairline */}
                <div className="sm:hidden">
                    <div
                        className="absolute inset-x-0 top-0 h-[1.5px]"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.85), transparent)' }}
                    />
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-11 h-1 rounded-full" style={{ background: 'rgba(96,165,250,0.6)', boxShadow: '0 0 6px rgba(96,165,250,0.55)' }} />
                    </div>
                </div>
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 relative">
                            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                            </svg>
                            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                        </div>
                        <h3 className="text-white font-semibold text-xs tracking-widest uppercase">Weather Layers</h3>
                    </div>
                    <button
                        onClick={() => useSwerveStore.getState().setUiState({ showWeatherLayers: false })}
                        className="text-white/30 hover:text-white/70 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Divider */}
                <div className="mx-4 h-px bg-white/[0.06]" />

                {/* Toggles */}
                <div className="px-4 py-2 space-y-0.5">
                    <ToggleRow
                        label="Precipitation Radar (NEXRAD)"
                        sublabel="US-only NOAA MRMS"
                        active={weatherLayers?.precip}
                        onToggle={() => toggle('precip')}
                        pulseColor="#60a5fa"
                    />
                    <div className="h-px bg-white/[0.03]" />
                    <ToggleRow
                        label="Wind & Gusts"
                        sublabel="Open-Meteo grid"
                        active={weatherLayers?.wind}
                        onToggle={() => toggle('wind')}
                        pulseColor="#22d3ee"
                    />
                    <div className="h-px bg-white/[0.03]" />
                    <ToggleRow
                        label="Cloud Cover"
                        sublabel="Open-Meteo grid"
                        active={weatherLayers?.clouds}
                        onToggle={() => toggle('clouds')}
                        pulseColor="#a78bfa"
                    />
                    <div className="h-px bg-white/[0.03]" />
                    <ToggleRow
                        label="Lightning Strikes"
                        sublabel="LIVE — Blitzortung"
                        active={weatherLayers?.lightning}
                        onToggle={() => toggle('lightning')}
                        pulseColor="#fbbf24"
                    />
                    <div className="h-px bg-white/[0.03]" />
                    <ToggleRow
                        label="NWS Alerts & Warnings"
                        sublabel="US only — NOAA"
                        active={weatherLayers?.nws}
                        onToggle={() => toggle('nws')}
                        pulseColor="#ef4444"
                    />
                    <div className="h-px bg-white/[0.03]" />
                    <ToggleRow
                        label="NEXRAD HD Radar"
                        sublabel="US — NOAA MRMS"
                        active={weatherLayers?.nexrad}
                        onToggle={() => toggle('nexrad')}
                        pulseColor="#34d399"
                    />
                    <div className="h-px bg-white/[0.03]" />
                    <ToggleRow
                        label="Storm Cell Tracker ⚡"
                        sublabel="Velocity + intercept projection"
                        active={weatherLayers?.stormTracker}
                        onToggle={() => toggle('stormTracker')}
                        pulseColor="#f43f5e"
                    />
                </div>

                {/* Divider */}
                <div className="mx-4 h-px bg-white/[0.06]" />

                {/* Attribution collapsible */}
                <div className="px-4 py-2">
                    <button
                        onClick={() => setAttributionOpen((v) => !v)}
                        className="flex items-center gap-1.5 text-white/30 text-[9px] uppercase tracking-wider hover:text-white/50 transition-colors"
                    >
                        <svg
                            className={`w-3 h-3 transition-transform duration-200 ${attributionOpen ? 'rotate-90' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Data Attribution
                    </button>
                    {attributionOpen && (
                        <div className="mt-2 space-y-1 animate-fade-in">
                            <div className="text-white/25 text-[9px]">Conditions: <span className="text-white/40">XWeather</span></div>
                            <div className="text-white/25 text-[9px]">Wind & Clouds: <span className="text-white/40">Open-Meteo</span></div>
                            <div className="text-white/25 text-[9px]">Lightning: <span className="text-white/40">Blitzortung.org</span></div>
                            <div className="text-white/25 text-[9px]">NWS Alerts & NEXRAD: <span className="text-white/40">NOAA / National Weather Service</span></div>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </>
    );
};

export default WeatherLayersPanel;
