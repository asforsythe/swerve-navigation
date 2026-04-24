import React, { useRef, useEffect, useState, useCallback } from 'react';
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const LocationIcon = () => (
    <svg className="w-4 h-4 mt-0.5 text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const formatEta = (seconds) => {
    if (seconds === null || seconds === undefined) return '--';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
};

const DriveIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 17H4a1 1 0 01-1-1v-5l2-4h10l2 4v5a1 1 0 01-1 1h-1M5 17h10M7 17a1 1 0 100 2 1 1 0 000-2zm10 0a1 1 0 100 2 1 1 0 000-2z" />
    </svg>
);

const BikeIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="6" cy="17" r="3" strokeWidth={2} />
        <circle cx="18" cy="17" r="3" strokeWidth={2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 17l5-9 3 5h4M14 8l-2-3h-3" />
    </svg>
);

const WalkIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5a1 1 0 100-2 1 1 0 000 2zM9 19l1-4 3 2 2-7" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l2-1 3 3 2-2" />
    </svg>
);

// Animated input with traveling focus border
const AddressInput = ({ label, placeholder, value, onChange, onFocus, onBlur, isFocused }) => (
    <div className="relative space-y-1">
        <label className="text-white/40 text-[9px] uppercase tracking-tighter ml-1">{label}</label>
        <div className="relative">
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                onFocus={onFocus}
                onBlur={onBlur}
                className="w-full bg-white/[0.04] text-white rounded-xl p-3 border border-white/[0.06] outline-none text-sm placeholder:text-white/25 transition-all duration-300"
                style={
                    isFocused
                        ? {
                            background: 'rgba(255,255,255,0.07)',
                            borderColor: 'rgba(244,63,94,0.45)',
                            boxShadow: '0 0 0 1px rgba(244,63,94,0.15), 0 0 16px rgba(244,63,94,0.08)',
                        }
                        : undefined
                }
            />
            {/* Traveling bottom border on focus */}
            {isFocused && (
                <div
                    className="absolute bottom-0 left-0 h-px rounded-full animate-shimmer"
                    style={{
                        width: '100%',
                        background: 'linear-gradient(90deg, transparent, #f43f5e, #a78bfa, transparent)',
                        backgroundSize: '200% 100%',
                    }}
                />
            )}
        </div>
    </div>
);

const RouteEnginePanel = ({
    startAddress,
    setStartAddress,
    destAddress,
    setDestAddress,
    onPlanRoute,
    isRouting,
    modeEtas,
    travelMode,
    setTravelMode,
}) => {
    const hasEtas = modeEtas && (modeEtas.driving !== null || modeEtas.cycling !== null || modeEtas.walking !== null);

    const MODES = [
        { key: 'driving', label: 'Drive', Icon: DriveIcon, activeClass: 'bg-rose-500 text-white' },
        { key: 'cycling', label: 'Bike', Icon: BikeIcon, activeClass: 'bg-emerald-500 text-white' },
        { key: 'walking', label: 'Walk', Icon: WalkIcon, activeClass: 'bg-sky-500 text-white' },
    ];

    const [suggestions, setSuggestions] = useState({ start: [], dest: [] });
    const [showSuggestions, setShowSuggestions] = useState({ start: false, dest: false });
    const [focused, setFocused] = useState(null);
    const [ripple, setRipple] = useState(null);
    const startRef = useRef(null);
    const destRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (startRef.current && !startRef.current.contains(e.target))
                setShowSuggestions((prev) => ({ ...prev, start: false }));
            if (destRef.current && !destRef.current.contains(e.target))
                setShowSuggestions((prev) => ({ ...prev, dest: false }));
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = async (query, type) => {
        if (!query || query.length < 3) {
            setSuggestions((prev) => ({ ...prev, [type]: [] }));
            return;
        }
        try {
            const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&types=address,place,poi`
            );
            const data = await res.json();
            setSuggestions((prev) => ({ ...prev, [type]: data.features || [] }));
            setShowSuggestions((prev) => ({ ...prev, [type]: true }));
        } catch (e) {
            console.error('[Swerve Autocomplete] Error:', e);
        }
    };

    const handleSuggestionClick = (suggestion, type) => {
        if (type === 'start') setStartAddress(suggestion.place_name);
        else setDestAddress(suggestion.place_name);
        setSuggestions((prev) => ({ ...prev, [type]: [] }));
        setShowSuggestions((prev) => ({ ...prev, [type]: false }));
    };

    const handlePlanClick = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setTimeout(() => setRipple(null), 700);
        onPlanRoute?.();
    }, [onPlanRoute]);

    const renderSuggestions = (type) => {
        const list = suggestions[type];
        const show = showSuggestions[type];
        if (!show || list.length === 0) return null;
        return (
            <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 bg-[#121218] border border-white/[0.1] rounded-xl overflow-hidden shadow-2xl backdrop-blur-3xl animate-fade-in-up">
                {list.map((s, i) => (
                    <button
                        key={s.id}
                        onClick={() => handleSuggestionClick(s, type)}
                        className={`w-full text-left px-4 py-3 text-sm text-white/80 hover:bg-white/10 transition-all duration-150 flex items-start gap-3 ${i !== list.length - 1 ? 'border-b border-white/[0.03]' : ''}`}
                        style={{
                            transform: 'perspective(600px)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'perspective(600px) rotateX(1deg) translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'perspective(600px)';
                        }}
                    >
                        <LocationIcon />
                        <span className="truncate">{s.place_name}</span>
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="absolute bottom-6 right-6 z-40 w-80 p-5 rounded-[24px] glass-panel animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A2 2 0 013 15.382V6.418a2 2 0 011.106-1.789L9 2m6 18l5.447-2.724A2 2 0 0021 15.382V6.418a2 2 0 00-1.106-1.789L15 2m-6 18V2m6 18V2" />
                </svg>
                <h3 className="text-white font-semibold text-xs tracking-widest uppercase">Route Engine</h3>
            </div>

            {/* Inputs */}
            <div className="flex flex-col gap-3 mb-5">
                <div ref={startRef} className="relative">
                    <AddressInput
                        label="Starting Point"
                        placeholder="Current Location or Address"
                        value={startAddress}
                        onChange={(e) => {
                            setStartAddress(e.target.value);
                            fetchSuggestions(e.target.value, 'start');
                        }}
                        onFocus={() => {
                            setFocused('start');
                            setShowSuggestions((prev) => ({ ...prev, start: suggestions.start.length > 0 }));
                        }}
                        onBlur={() => setFocused(null)}
                        isFocused={focused === 'start'}
                    />
                    {renderSuggestions('start')}
                </div>

                <div ref={destRef} className="relative">
                    <AddressInput
                        label="Destination"
                        placeholder="Where to?"
                        value={destAddress}
                        onChange={(e) => {
                            setDestAddress(e.target.value);
                            fetchSuggestions(e.target.value, 'dest');
                        }}
                        onFocus={() => {
                            setFocused('dest');
                            setShowSuggestions((prev) => ({ ...prev, dest: suggestions.dest.length > 0 }));
                        }}
                        onBlur={() => setFocused(null)}
                        isFocused={focused === 'dest'}
                    />
                    {renderSuggestions('dest')}
                </div>

                {/* Liquid glass plan button */}
                <button
                    onClick={handlePlanClick}
                    disabled={isRouting}
                    className={`mt-1 group relative overflow-hidden rounded-xl py-3 text-sm font-bold text-white w-full
                        border border-rose-400/20
                        active:scale-95 transition-all duration-200
                        focus:outline-none
                        ${isRouting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{
                        background: 'linear-gradient(135deg, rgba(225,29,72,0.95), rgba(244,63,94,0.9))',
                        boxShadow: '0 4px 20px rgba(244,63,94,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                    }}
                    onMouseEnter={(e) => {
                        if (!isRouting) e.currentTarget.style.boxShadow = '0 4px 28px rgba(244,63,94,0.55), inset 0 1px 0 rgba(255,255,255,0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(244,63,94,0.35), inset 0 1px 0 rgba(255,255,255,0.15)';
                    }}
                >
                    {/* Top glint */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
                    {/* Liquid shimmer on hover */}
                    <div className="absolute inset-0 -skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
                    {/* Click ripple */}
                    {ripple && (
                        <div
                            className="absolute rounded-full bg-white/30 pointer-events-none animate-ping"
                            style={{
                                left: ripple.x - 16,
                                top: ripple.y - 16,
                                width: 32,
                                height: 32,
                            }}
                        />
                    )}
                    <span className="relative z-10">
                        {isRouting ? 'Calculating Safest Path...' : 'Plan Safest Route'}
                    </span>
                </button>
            </div>

            {/* ETA Mode Toggle */}
            {hasEtas && (
                <div className="pt-4 border-t border-white/[0.08] mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-white/80 font-medium text-[10px] tracking-wider uppercase">ETA Estimate</h3>
                    </div>
                    <div className="flex gap-1.5">
                        {MODES.map(({ key, label, Icon, activeClass }) => (
                            <button
                                key={key}
                                onClick={() => setTravelMode(key)}
                                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all duration-200 ${travelMode === key
                                    ? `${activeClass} border-white/10`
                                    : 'bg-white/10 text-white/60 border-white/[0.05] hover:bg-white/20 hover:scale-[1.03]'
                                    }`}
                            >
                                <Icon />
                                <span className="text-[10px] font-bold tracking-tight leading-none tabular-nums">
                                    {formatEta(modeEtas[key])}
                                </span>
                                <span className="text-[8px] uppercase tracking-widest opacity-60">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* XWeather + Open-Meteo Status */}
            <div className="pt-4 border-t border-white/[0.08]">
                <div className="flex items-center gap-2 mb-3">
                    <div className="relative">
                        <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-blue-400 rounded-full animate-pulse" />
                    </div>
                    <h3 className="text-white/80 font-medium text-[10px] tracking-wider uppercase">Live Conditions</h3>
                    <div className="ml-auto flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-400 text-[9px] uppercase tracking-wider">XWeather Live</span>
                    </div>
                </div>
                <div className="flex gap-2 p-1 bg-white/[0.03] rounded-2xl border border-white/[0.05]">
                    <div className="flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-tight text-white/40 text-center flex items-center justify-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-400" />
                        XWeather
                        <span className="text-white/20">+</span>
                        <span className="w-1 h-1 rounded-full bg-blue-400" />
                        Open-Meteo
                    </div>
                </div>
                <div className="mt-2 flex items-center justify-center gap-3 text-[8px] text-white/20 uppercase tracking-wider">
                    <span>Lightning</span>
                    <span>·</span>
                    <span>Radar</span>
                    <span>·</span>
                    <span>Alerts</span>
                    <span>·</span>
                    <span>Forecast</span>
                </div>
            </div>
        </div>
    );
};

export default RouteEnginePanel;
