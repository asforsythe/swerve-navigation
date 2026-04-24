import React from 'react';

const NavigationIcon = ({ type, modifier }) => {
    // Map maneuver types to SVG icons
    const getPath = () => {
        switch (type) {
            case 'turn':
                if (modifier?.includes('left')) return 'M7 7l5 5-5 5';
                if (modifier?.includes('right')) return 'M17 7l-5 5 5 5';
                return 'M5 12h14';
            case 'uturn':
                return 'M7 16V4m0 0l4 4m-4-4L3 8';
            case 'arrive':
                return 'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z';
            case 'depart':
                return 'M13 10V3L4 14h7v7l9-11h-7z';
            case 'roundabout':
            case 'rotary':
                return 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15';
            case 'merge':
                return 'M11 16l-4-4m0 0l4-4m-4 4h14';
            case 'on ramp':
                return 'M13 7l5 5m0 0l-5 5m5-5H6';
            case 'off ramp':
                return 'M11 17l-4-4m0 0l4-4m-4 4h14';
            case 'fork':
                return 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8';
            default:
                return 'M5 12h14';
        }
    };

    return (
        <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d={getPath()} />
        </svg>
    );
};

const PreviewStep = ({ step, index, isActive }) => {
    const maneuver = step.maneuver || {};
    const type = maneuver.type || 'continue';
    const modifier = maneuver.modifier || '';
    const distance = step.distance || 0;
    const duration = step.duration || 0;

    const formatSmallDist = (m) => {
        if (m < 304) return `${Math.round(m * 3.28084)} ft`;
        const mi = m * 0.000621371;
        if (mi < 10) return `${mi.toFixed(1)} mi`;
        return `${Math.round(mi)} mi`;
    };

    const formatSmallDur = (s) => {
        if (s < 60) return `${Math.ceil(s)}s`;
        return `${Math.ceil(s / 60)} min`;
    };

    return (
        <div
            className={`flex items-start gap-3 py-2.5 px-3 rounded-xl transition-all duration-300 ${isActive
                    ? 'bg-cyan-500/10 border border-cyan-500/20'
                    : 'border border-transparent hover:bg-white/[0.03]'
                }`}
        >
            <div className="shrink-0 mt-0.5">
                <NavigationIcon type={type} modifier={modifier} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-white/90 text-[11px] font-medium leading-tight truncate">
                    {step.name || 'Continue'}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-white/40 text-[9px] tabular-nums">{formatSmallDist(distance)}</span>
                    <span className="text-white/20 text-[9px]">·</span>
                    <span className="text-white/40 text-[9px] tabular-nums">{formatSmallDur(duration)}</span>
                </div>
            </div>
            {isActive && (
                <div className="shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,211,238,0.6)' }} />
                </div>
            )}
        </div>
    );
};

const NavigationPanel = ({
    isNavigating,
    navState,
    showPreview,
    steps,
    onStart,
    onStop,
    onTogglePreview,
    formatDistance,
    formatDuration,
}) => {
    const hasRoute = steps && steps.length > 0;
    const currentStep = steps?.[navState.currentStepIndex];
    const maneuver = currentStep?.maneuver || {};

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-[420px] max-w-[90vw]">
            {/* Active Navigation Card (when navigating) */}
            {isNavigating && currentStep && (
                <div
                    className="rounded-[20px] glass-panel mb-3 overflow-hidden animate-slide-in-bottom"
                    style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(34,211,238,0.15), inset 0 1px 0 rgba(255,255,255,0.06)' }}
                >
                    {/* Top glow */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

                    <div className="p-4">
                        {/* Current instruction — big and prominent */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                                <NavigationIcon type={maneuver.type} modifier={maneuver.modifier} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-white text-sm font-semibold leading-snug truncate">
                                    {currentStep.name || 'Continue'}
                                </div>
                                <div className="text-cyan-400/80 text-[10px] uppercase tracking-wider mt-0.5">
                                    {maneuver.type === 'arrive'
                                        ? 'Arriving'
                                        : maneuver.modifier
                                            ? `${maneuver.type} ${maneuver.modifier}`
                                            : maneuver.type || 'Continue'}
                                </div>
                            </div>
                        </div>

                        {/* Distance / Time / ETA row */}
                        <div className="flex items-center gap-4 bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                            <div className="flex-1 text-center">
                                <div className="text-white/40 text-[9px] uppercase tracking-wider">Next</div>
                                <div className="text-white font-mono text-base font-bold tabular-nums">
                                    {formatDistance(navState.distanceToNext)}
                                </div>
                            </div>
                            <div className="w-px h-8 bg-white/[0.08]" />
                            <div className="flex-1 text-center">
                                <div className="text-white/40 text-[9px] uppercase tracking-wider">Time</div>
                                <div className="text-white font-mono text-base font-bold tabular-nums">
                                    {formatDuration(navState.durationToNext)}
                                </div>
                            </div>
                            <div className="w-px h-8 bg-white/[0.08]" />
                            <div className="flex-1 text-center">
                                <div className="text-white/40 text-[9px] uppercase tracking-wider">ETA</div>
                                <div className="text-cyan-400 font-mono text-base font-bold tabular-nums">
                                    {navState.durationRemaining ? formatDuration(navState.durationRemaining) : '--'}
                                </div>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-white/30 text-[8px] uppercase tracking-wider">
                                    Step {navState.currentStepIndex + 1} of {navState.totalSteps}
                                </span>
                                <span className="text-white/30 text-[8px] uppercase tracking-wider">
                                    {Math.round(
                                        ((navState.currentStepIndex + 1) / (navState.totalSteps || 1)) * 100
                                    )}%
                                </span>
                            </div>
                            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                                    style={{
                                        width: `${((navState.currentStepIndex + 1) / (navState.totalSteps || 1)) * 100}%`,
                                        boxShadow: '0 0 8px rgba(34,211,238,0.4)',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Off-route warning */}
                        {navState.isOffRoute && (
                            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-pulse">
                                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="text-amber-400 text-[10px] font-medium">Off route — recalculating...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Route Preview Panel (when not navigating but route exists) */}
            {!isNavigating && hasRoute && showPreview && (
                <div
                    className="rounded-[20px] glass-panel mb-3 overflow-hidden max-h-64 animate-fade-in-up"
                    style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)' }}
                >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <div className="p-3">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <div className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A2 2 0 013 15.382V6.418a2 2 0 011.106-1.789L9 2m6 18l5.447-2.724A2 2 0 0021 15.382V6.418a2 2 0 00-1.106-1.789L15 2m-6 18V2m6 18V2" />
                                </svg>
                                <span className="text-white/80 text-[10px] font-semibold tracking-wider uppercase">Route Preview</span>
                            </div>
                            <span className="text-white/30 text-[9px]">{steps.length} steps</span>
                        </div>
                        <div className="space-y-0.5 max-h-44 overflow-y-auto no-scrollbar">
                            {steps.slice(0, 8).map((step, i) => (
                                <PreviewStep key={i} step={step} index={i} isActive={i === 0} />
                            ))}
                            {steps.length > 8 && (
                                <div className="text-center py-2 text-white/20 text-[9px]">
                                    + {steps.length - 8} more steps
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            {hasRoute && (
                <div className="flex gap-2 justify-center">
                    {!isNavigating ? (
                        <>
                            <button
                                onClick={onStart}
                                className="group relative overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold text-white
                                    border border-cyan-400/20 active:scale-95 transition-all duration-200
                                    bg-gradient-to-r from-cyan-500/90 to-emerald-500/90"
                                style={{ boxShadow: '0 4px 20px rgba(34,211,238,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                            >
                                <div className="absolute inset-0 -skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
                                <div className="flex items-center gap-2 relative z-10">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Start Navigation
                                </div>
                            </button>
                            <button
                                onClick={onTogglePreview}
                                className="rounded-xl px-4 py-2.5 text-sm font-medium text-white/70
                                    border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all duration-200"
                            >
                                {showPreview ? 'Hide Preview' : 'Show Preview'}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onStop}
                            className="group relative overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold text-white
                                border border-rose-400/20 active:scale-95 transition-all duration-200
                                bg-gradient-to-r from-rose-500/90 to-orange-500/90"
                            style={{ boxShadow: '0 4px 20px rgba(244,63,94,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                        >
                            <div className="flex items-center gap-2 relative z-10">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                </svg>
                                End Navigation
                            </div>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default NavigationPanel;
