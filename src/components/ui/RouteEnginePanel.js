import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { slideLeft } from '../../design/motion';
import useSwerveStore from '../../store/useSwerveStore';
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
    predictive,
    routeMode,
    setRouteMode,
}) => {
    const { routeTelemetry } = useSwerveStore();
    const isAdventure = routeMode === 'adventure';
    const hasEtas = modeEtas && (modeEtas.driving !== null || modeEtas.cycling !== null || modeEtas.walking !== null);
    const [showOptimizer, setShowOptimizer] = useState(false);

    const { results: predResults, isLoading: predLoading, error: predError,
        selectedOffset, setSelectedOffset, run: runPredictive,
        centerLat: predCenterLat, centerLng: predCenterLng } = predictive || {};

    const goldenCount = useMemo(
        () => (predResults || []).filter(r => r.isGolden).length,
        [predResults]
    );

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

    // ── Mobile bottom-sheet snap state ─────────────────────────────────────────
    // 'peek'  ~92px — drag handle + Where-to bar
    // 'half'  52dvh — Inputs + Mode toggle + Plan button
    // 'full'  90dvh — adds ETA, Departure Optimizer, Live Conditions
    const [snap, setSnap] = useState('peek');
    const SNAP_HEIGHTS = { peek: 96, half: '52dvh', full: '90dvh' };
    const cycleSnap = () => setSnap((s) => (s === 'peek' ? 'half' : s === 'half' ? 'full' : 'peek'));

    // ── Status-driven accent (one signal flowing through the whole sheet) ──────
    const ssi = routeTelemetry?.ssi;
    const ssiBand = ssi == null ? 'idle' : ssi >= 80 ? 'safe' : ssi >= 70 ? 'caution' : 'danger';
    const accentMap = {
        idle:    { color: '#f43f5e', soft: 'rgba(244,63,94,0.40)' },
        safe:    { color: '#10b981', soft: 'rgba(16,185,129,0.45)' },
        caution: { color: '#f59e0b', soft: 'rgba(245,158,11,0.45)' },
        danger:  { color: '#ef4444', soft: 'rgba(239,68,68,0.50)' },
    };
    const accent = isAdventure
        ? { color: '#f97316', soft: 'rgba(249,115,22,0.50)' }
        : accentMap[ssiBand];

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
        <>
        {/* ════════════════════════════════════════════════════════════════════
            DESKTOP (sm+): original glass card docked bottom-right
        ════════════════════════════════════════════════════════════════════ */}
        <motion.div
            className="hidden sm:block absolute z-40 w-80 p-5 rounded-[24px] glass-panel"
            style={{
                bottom: 'calc(var(--safe-bottom, 0px) + 12px)',
                right: 'calc(var(--safe-right, 0px) + 12px)',
            }}
            variants={slideLeft}
            initial="hidden"
            animate="visible"
        >
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

                {/* Safe / Adventure mode toggle */}
                <div className="flex rounded-xl overflow-hidden border border-white/[0.08] mt-1">
                    <button
                        onClick={() => setRouteMode?.('safe')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-all duration-200 ${!isAdventure
                                ? 'bg-rose-500/90 text-white shadow-inner'
                                : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60'
                            }`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Safe
                    </button>
                    <div className="w-px bg-white/[0.08]" />
                    <button
                        onClick={() => setRouteMode?.('adventure')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-all duration-200 ${isAdventure
                                ? 'text-amber-300'
                                : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60'
                            }`}
                        style={isAdventure ? {
                            background: 'linear-gradient(135deg, rgba(217,119,6,0.4), rgba(249,115,22,0.35))',
                            boxShadow: 'inset 0 1px 0 rgba(255,200,100,0.15)',
                        } : undefined}
                    >
                        <span className="text-base leading-none">🔥</span>
                        Adventure
                    </button>
                </div>

                {/* Liquid glass plan button */}
                <motion.button
                    onClick={handlePlanClick}
                    disabled={isRouting}
                    whileHover={!isRouting ? {
                        scale: 1.02,
                        boxShadow: isAdventure
                            ? '0 6px 32px rgba(249,115,22,0.55), inset 0 1px 0 rgba(255,255,255,0.20)'
                            : '0 6px 32px rgba(244,63,94,0.55), inset 0 1px 0 rgba(255,255,255,0.20)',
                    } : {}}
                    whileTap={!isRouting ? { scale: 0.96 } : {}}
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    className={`group relative overflow-hidden rounded-xl py-3 text-sm font-bold text-white w-full
                        focus:outline-none
                        ${isRouting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        ${isAdventure ? 'border border-amber-500/20' : 'border border-rose-400/20'}`}
                    style={{
                        background: isAdventure
                            ? 'linear-gradient(135deg, rgba(217,119,6,0.95), rgba(249,115,22,0.9))'
                            : 'linear-gradient(135deg, rgba(225,29,72,0.95), rgba(244,63,94,0.9))',
                        boxShadow: isAdventure
                            ? '0 4px 20px rgba(249,115,22,0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
                            : '0 4px 20px rgba(244,63,94,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
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
                        {isRouting
                            ? (isAdventure ? 'Finding Your Thrill Ride...' : 'Calculating Safest Path...')
                            : (isAdventure ? 'Plan Adventure Route' : 'Plan Safest Route')
                        }
                    </span>
                </motion.button>

                {/* Adventure Score result chip */}
                {routeTelemetry?.isAdventureMode && routeTelemetry?.adventureScore != null && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl"
                        style={{
                            background: 'rgba(217,119,6,0.12)',
                            border: '1px solid rgba(249,115,22,0.25)',
                        }}
                    >
                        <span className="text-sm">🔥</span>
                        <span className="text-amber-400 text-[11px] font-bold">
                            AS {Math.round(routeTelemetry.adventureScore)} — {routeTelemetry.adventureCategory}
                        </span>
                    </motion.div>
                )}
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

            {/* Departure Optimizer */}
            {predictive && (
                <div className="pt-4 border-t border-white/[0.08]">
                    <button
                        onClick={() => {
                            setShowOptimizer(v => !v);
                            if (!showOptimizer && !predResults && runPredictive && predCenterLat) {
                                runPredictive(predCenterLat, predCenterLng);
                            }
                        }}
                        className="w-full flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-white/80 font-medium text-[10px] tracking-wider uppercase">Departure Optimizer</span>
                            {goldenCount > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                                    {goldenCount} golden
                                </span>
                            )}
                        </div>
                        <svg
                            className={`w-3.5 h-3.5 text-white/30 transition-transform ${showOptimizer ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    <AnimatePresence>
                        {showOptimizer && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-3 space-y-3">
                                    {/* Run / refresh button */}
                                    <button
                                        onClick={() => runPredictive?.(predCenterLat, predCenterLng)}
                                        disabled={predLoading}
                                        className="w-full py-2 rounded-xl text-[11px] font-semibold border border-violet-400/20 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40"
                                    >
                                        {predLoading ? (
                                            <>
                                                <span className="w-3 h-3 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                                                Analyzing 24h forecast…
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Analyze Departure Windows
                                            </>
                                        )}
                                    </button>

                                    {predError && (
                                        <p className="text-rose-400 text-[10px] text-center">{predError}</p>
                                    )}

                                    {predResults && (
                                        <>
                                            {/* Bar chart sparkline */}
                                            <div>
                                                <p className="text-white/25 text-[9px] uppercase tracking-widest mb-2">SSI by Departure Time</p>
                                                <div className="flex items-end gap-1 h-12">
                                                    {predResults.map((r, i) => (
                                                        <button
                                                            key={r.label}
                                                            onClick={() => setSelectedOffset?.(i)}
                                                            className="flex-1 flex flex-col items-center gap-0.5 group/bar"
                                                            title={`${r.label}: SSI ${r.ssi}`}
                                                        >
                                                            <div className="relative w-full rounded-t-sm transition-all"
                                                                style={{
                                                                    height: `${Math.max(4, (r.ssi / 100) * 36)}px`,
                                                                    background: r.isGolden
                                                                        ? `linear-gradient(to top, ${r.color}cc, ${r.color})`
                                                                        : `${r.color}55`,
                                                                    outline: selectedOffset === i ? `2px solid ${r.color}` : 'none',
                                                                    outlineOffset: '1px',
                                                                }}
                                                            >
                                                                {r.isGolden && (
                                                                    <div
                                                                        className="absolute inset-0 rounded-t-sm animate-pulse"
                                                                        style={{ background: `${r.color}22` }}
                                                                    />
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                                {/* Labels */}
                                                <div className="flex gap-1 mt-0.5">
                                                    {predResults.map((r, i) => (
                                                        <button
                                                            key={r.label}
                                                            onClick={() => setSelectedOffset?.(i)}
                                                            className="flex-1 text-center"
                                                        >
                                                            <span className={`text-[8px] ${selectedOffset === i ? 'text-white' : 'text-white/25'}`}>
                                                                {r.label}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Selected window detail */}
                                            {predResults[selectedOffset] && (() => {
                                                const r = predResults[selectedOffset];
                                                return (
                                                    <div
                                                        className="rounded-xl p-3 border"
                                                        style={{
                                                            background: r.color + '12',
                                                            borderColor: r.color + '33',
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-white/70 text-xs font-semibold">{r.label} departure</p>
                                                                <p className="text-white/35 text-[10px]">
                                                                    {r.temp}°F · {parseFloat(r.precip) >= 0.01
                                                                        ? `${r.precip} in precip`
                                                                        : parseFloat(r.precip) > 0
                                                                            ? 'trace precip'
                                                                            : 'no precip'}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-lg" style={{ color: r.color }}>{r.ssi}</p>
                                                                <p className="text-[9px]" style={{ color: r.color }}>{r.category}</p>
                                                            </div>
                                                        </div>
                                                        {r.isGolden && (
                                                            <p className="text-emerald-400 text-[10px] mt-1.5 flex items-center gap-1">
                                                                <span>✦</span> Golden window — optimal conditions
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
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
        </motion.div>

        {/* ════════════════════════════════════════════════════════════════════
            MOBILE (<sm): bottom sheet with peek / half / full snap points
        ════════════════════════════════════════════════════════════════════ */}
        {/* Backdrop — only when expanded above peek */}
        <AnimatePresence>
            {snap !== 'peek' && (
                <motion.div
                    key="route-sheet-backdrop"
                    className="sm:hidden fixed inset-0 z-30 bg-black/55 backdrop-blur-[2px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setSnap('peek')}
                />
            )}
        </AnimatePresence>

        {/* Sheet */}
        <motion.div
            className="sm:hidden fixed bottom-0 left-0 right-0 z-40 rounded-t-[28px] overflow-hidden"
            initial={false}
            animate={{ height: SNAP_HEIGHTS[snap] }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            style={{
                background: 'rgba(10,10,14,0.92)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                boxShadow: `0 -10px 40px rgba(0,0,0,0.55), 0 0 0 1px ${accent.color}33, inset 0 1px 0 rgba(255,255,255,0.06)`,
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.14}
            dragMomentum={false}
            onDragEnd={(_, info) => {
                const v = info.velocity.y;
                const dy = info.offset.y;
                if (v < -300 || dy < -80) {
                    setSnap((s) => (s === 'peek' ? 'half' : s === 'half' ? 'full' : 'full'));
                } else if (v > 300 || dy > 80) {
                    setSnap((s) => (s === 'full' ? 'half' : s === 'half' ? 'peek' : 'peek'));
                }
            }}
        >
            {/* Top accent rail */}
            <div
                className="absolute inset-x-0 top-0 h-[1px]"
                style={{ background: `linear-gradient(90deg, transparent, ${accent.color}, transparent)` }}
            />

            {/* Drag handle (tap to cycle, drag to snap) */}
            <button
                type="button"
                onClick={cycleSnap}
                className="w-full flex justify-center pt-2.5 pb-1.5 active:opacity-70 transition-opacity"
                aria-label="Toggle route panel"
            >
                <div
                    className="w-11 h-[5px] rounded-full transition-colors duration-300"
                    style={{ background: snap === 'peek' ? 'rgba(255,255,255,0.22)' : `${accent.color}cc` }}
                />
            </button>

            {/* PEEK STATE: where-to bar */}
            <AnimatePresence mode="wait">
                {snap === 'peek' && (
                    <motion.button
                        key="peek"
                        type="button"
                        onClick={() => setSnap('half')}
                        className="w-full px-5 pb-3 flex items-center justify-between text-left"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                style={{ background: `${accent.color}1f`, border: `1px solid ${accent.color}3a` }}
                            >
                                <svg className="w-[18px] h-[18px]" style={{ color: accent.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-white text-[17px] font-bold leading-tight">
                                    {ssi != null ? `Route ready · SSI ${Math.round(ssi)}` : 'Where to?'}
                                </p>
                                <p className="text-white/45 text-[12px] leading-tight mt-0.5">
                                    {isAdventure ? 'Plan a thrill route' : ssi != null ? 'Tap to adjust or replan' : 'Plan a safer route'}
                                </p>
                            </div>
                        </div>
                        <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* HALF + FULL STATE: full route engine */}
            {snap !== 'peek' && (
                <div
                    className="px-5 pb-6 overflow-y-auto no-scrollbar"
                    style={{
                        maxHeight: 'calc(100% - 32px)',
                        paddingBottom: 'calc(var(--safe-bottom, 0px) + 24px)',
                    }}
                >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-white text-[20px] font-bold leading-tight tracking-tight">Plan Route</h3>
                            <p className="text-[11px] mt-0.5 leading-tight" style={{ color: accent.color }}>
                                {isAdventure ? 'Thrill mode' : 'Safety-optimized'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSnap('peek')}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.06] active:bg-white/[0.10] transition-colors"
                            aria-label="Collapse"
                        >
                            <svg className="w-4 h-4 text-white/55" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* BORDERLESS INPUTS — hairline divider, status accent on focus */}
                    <div className="mb-5">
                        <div ref={startRef} className="relative">
                            <div className="flex items-center gap-3 py-3.5 px-1">
                                <svg className="w-[18px] h-[18px] text-white/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <circle cx="12" cy="12" r="3" strokeWidth="2" />
                                    <path strokeLinecap="round" strokeWidth="2" d="M12 6V3m0 18v-3M6 12H3m18 0h-3" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Starting point"
                                    value={startAddress}
                                    onChange={(e) => { setStartAddress(e.target.value); fetchSuggestions(e.target.value, 'start'); }}
                                    onFocus={() => { setFocused('start'); setShowSuggestions((p) => ({ ...p, start: suggestions.start.length > 0 })); if (snap === 'peek') setSnap('half'); }}
                                    onBlur={() => setFocused(null)}
                                    className="flex-1 bg-transparent text-white text-[16px] placeholder:text-white/30 outline-none caret-white"
                                />
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />
                            {focused === 'start' && (
                                <motion.div
                                    layoutId="route-input-focus"
                                    className="absolute bottom-0 left-0 right-0 h-[1.5px]"
                                    style={{ background: accent.color, boxShadow: `0 0 8px ${accent.soft}` }}
                                />
                            )}
                            {renderSuggestions('start')}
                        </div>

                        <div ref={destRef} className="relative">
                            <div className="flex items-center gap-3 py-3.5 px-1">
                                <svg className="w-[18px] h-[18px] shrink-0" style={{ color: accent.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Where to?"
                                    value={destAddress}
                                    onChange={(e) => { setDestAddress(e.target.value); fetchSuggestions(e.target.value, 'dest'); }}
                                    onFocus={() => { setFocused('dest'); setShowSuggestions((p) => ({ ...p, dest: suggestions.dest.length > 0 })); }}
                                    onBlur={() => setFocused(null)}
                                    className="flex-1 bg-transparent text-white text-[16px] placeholder:text-white/30 outline-none caret-white"
                                />
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />
                            {focused === 'dest' && (
                                <motion.div
                                    layoutId="route-input-focus"
                                    className="absolute bottom-0 left-0 right-0 h-[1.5px]"
                                    style={{ background: accent.color, boxShadow: `0 0 8px ${accent.soft}` }}
                                />
                            )}
                            {renderSuggestions('dest')}
                        </div>
                    </div>

                    {/* SEGMENTED CONTROL — sliding pill */}
                    <div className="relative bg-white/[0.05] rounded-full p-1 mb-5 flex">
                        <motion.div
                            layout
                            className="absolute top-1 bottom-1 rounded-full"
                            style={{
                                width: 'calc(50% - 4px)',
                                left: isAdventure ? 'calc(50% + 0px)' : '4px',
                                background: isAdventure
                                    ? 'linear-gradient(135deg, rgba(217,119,6,0.95), rgba(249,115,22,0.85))'
                                    : 'linear-gradient(135deg, rgba(225,29,72,0.95), rgba(244,63,94,0.85))',
                                boxShadow: isAdventure
                                    ? '0 2px 14px rgba(249,115,22,0.45)'
                                    : '0 2px 14px rgba(244,63,94,0.45)',
                            }}
                            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                        />
                        <button
                            type="button"
                            onClick={() => setRouteMode?.('safe')}
                            className="flex-1 relative z-10 py-2.5 text-[13px] font-bold tracking-wide flex items-center justify-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: !isAdventure ? '#fff' : 'rgba(255,255,255,0.45)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span style={{ color: !isAdventure ? '#fff' : 'rgba(255,255,255,0.45)' }}>Safe</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setRouteMode?.('adventure')}
                            className="flex-1 relative z-10 py-2.5 text-[13px] font-bold tracking-wide flex items-center justify-center gap-1.5"
                        >
                            <span className="text-[15px] leading-none">🔥</span>
                            <span style={{ color: isAdventure ? '#fff' : 'rgba(255,255,255,0.45)' }}>Adventure</span>
                        </button>
                    </div>

                    {/* PLAN BUTTON — hero treatment */}
                    <motion.button
                        type="button"
                        onClick={handlePlanClick}
                        disabled={isRouting}
                        whileTap={!isRouting ? { scale: 0.985 } : {}}
                        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                        className="relative w-full overflow-hidden rounded-2xl py-4 text-white font-bold text-[16px] tracking-tight"
                        style={{
                            background: isAdventure
                                ? 'linear-gradient(135deg, rgba(217,119,6,0.96), rgba(249,115,22,0.92))'
                                : 'linear-gradient(135deg, rgba(225,29,72,0.96), rgba(244,63,94,0.92))',
                            boxShadow: isAdventure
                                ? '0 10px 32px rgba(249,115,22,0.45), inset 0 1px 0 rgba(255,255,255,0.20)'
                                : '0 10px 32px rgba(244,63,94,0.45), inset 0 1px 0 rgba(255,255,255,0.20)',
                            opacity: isRouting ? 0.55 : 1,
                            cursor: isRouting ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
                        {ripple && (
                            <span
                                className="absolute rounded-full bg-white/35 pointer-events-none animate-ping"
                                style={{ left: ripple.x - 18, top: ripple.y - 18, width: 36, height: 36 }}
                            />
                        )}
                        <span className="relative z-10">
                            {isRouting
                                ? (isAdventure ? 'Finding your thrill ride…' : 'Calculating safest path…')
                                : (isAdventure ? 'Plan Adventure Route' : 'Plan Safest Route')}
                        </span>
                    </motion.button>

                    {/* Adventure score chip */}
                    {routeTelemetry?.isAdventureMode && routeTelemetry?.adventureScore != null && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-center gap-2 mt-4 py-2 px-3 rounded-xl"
                            style={{ background: 'rgba(217,119,6,0.13)', border: '1px solid rgba(249,115,22,0.28)' }}
                        >
                            <span className="text-sm">🔥</span>
                            <span className="text-amber-400 text-[12px] font-bold">
                                AS {Math.round(routeTelemetry.adventureScore)} — {routeTelemetry.adventureCategory}
                            </span>
                        </motion.div>
                    )}

                    {/* ──── FULL state only: ETA + Departure Optimizer + Live Conditions ──── */}
                    {snap === 'full' && (
                        <>
                            {/* ETA Estimate — borderless */}
                            {hasEtas && (
                                <div className="mt-7">
                                    <div className="h-px bg-white/[0.07] mb-4" />
                                    <p className="text-white/45 text-[10px] uppercase tracking-[0.2em] mb-3 font-semibold">ETA Estimate</p>
                                    <div className="flex gap-2">
                                        {MODES.map(({ key, label, Icon, activeClass }) => (
                                            <button
                                                key={key}
                                                onClick={() => setTravelMode(key)}
                                                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${travelMode === key ? `${activeClass} shadow-lg` : 'bg-white/[0.04] text-white/55 hover:bg-white/[0.06]'}`}
                                            >
                                                <Icon />
                                                <span className="text-[11px] font-bold tabular-nums leading-none mt-0.5">{formatEta(modeEtas[key])}</span>
                                                <span className="text-[8px] uppercase tracking-widest opacity-60 leading-none">{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Departure Optimizer — collapsible, borderless */}
                            {predictive && (
                                <div className="mt-7">
                                    <div className="h-px bg-white/[0.07] mb-4" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowOptimizer((v) => !v);
                                            if (!showOptimizer && !predResults && runPredictive && predCenterLat) {
                                                runPredictive(predCenterLat, predCenterLng);
                                            }
                                        }}
                                        className="w-full flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-violet-400 text-[10px] uppercase tracking-[0.2em] font-semibold">Departure Optimizer</span>
                                            {goldenCount > 0 && (
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                                                    {goldenCount} golden
                                                </span>
                                            )}
                                        </div>
                                        <svg
                                            className={`w-3.5 h-3.5 text-white/35 transition-transform ${showOptimizer ? 'rotate-180' : ''}`}
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <AnimatePresence>
                                        {showOptimizer && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="pt-3 space-y-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => runPredictive?.(predCenterLat, predCenterLng)}
                                                        disabled={predLoading}
                                                        className="w-full py-2 rounded-xl text-[11px] font-semibold border border-violet-400/20 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40"
                                                    >
                                                        {predLoading ? (
                                                            <>
                                                                <span className="w-3 h-3 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                                                                Analyzing 24h forecast…
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                </svg>
                                                                Analyze Departure Windows
                                                            </>
                                                        )}
                                                    </button>
                                                    {predError && <p className="text-rose-400 text-[10px] text-center">{predError}</p>}
                                                    {predResults && (
                                                        <>
                                                            <div>
                                                                <p className="text-white/30 text-[9px] uppercase tracking-widest mb-2 font-semibold">SSI by Departure Time</p>
                                                                <div className="flex items-end gap-1 h-12">
                                                                    {predResults.map((r, i) => (
                                                                        <button
                                                                            key={r.label}
                                                                            onClick={() => setSelectedOffset?.(i)}
                                                                            className="flex-1 flex flex-col items-center gap-0.5"
                                                                            title={`${r.label}: SSI ${r.ssi}`}
                                                                        >
                                                                            <div className="relative w-full rounded-t-sm transition-all"
                                                                                style={{
                                                                                    height: `${Math.max(4, (r.ssi / 100) * 36)}px`,
                                                                                    background: r.isGolden
                                                                                        ? `linear-gradient(to top, ${r.color}cc, ${r.color})`
                                                                                        : `${r.color}55`,
                                                                                    outline: selectedOffset === i ? `2px solid ${r.color}` : 'none',
                                                                                    outlineOffset: '1px',
                                                                                }}
                                                                            >
                                                                                {r.isGolden && (
                                                                                    <div className="absolute inset-0 rounded-t-sm animate-pulse" style={{ background: `${r.color}22` }} />
                                                                                )}
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <div className="flex gap-1 mt-0.5">
                                                                    {predResults.map((r, i) => (
                                                                        <button key={r.label} onClick={() => setSelectedOffset?.(i)} className="flex-1 text-center">
                                                                            <span className={`text-[8px] ${selectedOffset === i ? 'text-white' : 'text-white/30'}`}>
                                                                                {r.label}
                                                                            </span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {predResults[selectedOffset] && (() => {
                                                                const r = predResults[selectedOffset];
                                                                return (
                                                                    <div className="rounded-xl p-3" style={{ background: r.color + '12', border: `1px solid ${r.color}33` }}>
                                                                        <div className="flex items-center justify-between">
                                                                            <div>
                                                                                <p className="text-white/75 text-[12px] font-semibold">{r.label} departure</p>
                                                                                <p className="text-white/40 text-[10px]">
                                                                                    {r.temp}°F · {parseFloat(r.precip) >= 0.01
                                                                                        ? `${r.precip} in precip`
                                                                                        : parseFloat(r.precip) > 0
                                                                                            ? 'trace precip'
                                                                                            : 'no precip'}
                                                                                </p>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <p className="font-bold text-[18px]" style={{ color: r.color }}>{r.ssi}</p>
                                                                                <p className="text-[9px]" style={{ color: r.color }}>{r.category}</p>
                                                                            </div>
                                                                        </div>
                                                                        {r.isGolden && (
                                                                            <p className="text-emerald-400 text-[10px] mt-1.5 flex items-center gap-1">
                                                                                <span>✦</span> Golden window — optimal conditions
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Live Conditions footer — minimalist */}
                            <div className="mt-7">
                                <div className="h-px bg-white/[0.07] mb-3" />
                                <div className="flex items-center justify-center gap-2 text-[10px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-white/40 uppercase tracking-widest font-semibold">XWeather + Open-Meteo Live</span>
                                </div>
                                <div className="mt-2 flex items-center justify-center gap-3 text-[8px] text-white/22 uppercase tracking-widest">
                                    <span>Lightning</span><span>·</span><span>Radar</span><span>·</span><span>Alerts</span><span>·</span><span>Forecast</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </motion.div>
        </>
    );
};

export default RouteEnginePanel;
