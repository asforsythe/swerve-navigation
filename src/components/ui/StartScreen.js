import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

// Static rain particle data — generated once, never changes
const RAIN_DROPS = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: ((i * 3.7 + Math.sin(i * 2.1) * 12) % 100 + 100) % 100,
    delay: ((i * 0.19) % 2.4).toFixed(2),
    duration: (0.65 + (i % 5) * 0.17).toFixed(2),
    height: 8 + (i % 5) * 5,
    opacity: (0.05 + (i % 4) * 0.05).toFixed(2),
    skew: ((i % 3) - 1) * 4, // subtle angle
}));

// Self-drawing shield logo
const AnimatedShield = ({ isReady }) => (
    <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        className="mx-auto mb-5"
        aria-hidden="true"
    >
        <defs>
            <linearGradient id="shield-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="50%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
        </defs>
        {/* Shield body */}
        <path
            d="M32 5L9 15v17c0 13.8 9.8 26.7 23 30 13.2-3.3 23-16.2 23-30V15L32 5z"
            stroke="url(#shield-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="rgba(244,63,94,0.07)"
            style={{
                strokeDasharray: '175',
                strokeDashoffset: isReady ? '0' : '175',
                transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                filter: 'drop-shadow(0 0 8px rgba(244,63,94,0.55))',
            }}
        />
        {/* Inner check */}
        <path
            d="M21 33l8 9 14-16"
            stroke="url(#shield-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
                strokeDasharray: '40',
                strokeDashoffset: isReady ? '0' : '40',
                transition: 'stroke-dashoffset 0.5s cubic-bezier(0.16, 1, 0.3, 1) 1s',
            }}
        />
    </svg>
);

// Simple typewriter hook
function useTypewriter(text, speed = 38) {
    const [displayed, setDisplayed] = useState('');
    useEffect(() => {
        setDisplayed('');
        let i = 0;
        const id = setInterval(() => {
            i += 1;
            setDisplayed(text.slice(0, i));
            if (i >= text.length) clearInterval(id);
        }, speed);
        return () => clearInterval(id);
    }, [text, speed]);
    return displayed;
}

const HOLD_MS = 1200;

const StartScreen = ({ isVoiceReady, onStart }) => {
    const [holdProgress, setHoldProgress] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const rafRef = useRef(null);
    const holdStartRef = useRef(null);
    const firedRef = useRef(false);

    const subtitle = useTypewriter(
        isVoiceReady
            ? 'Neural co-pilot online · Hold to begin'
            : 'Loading neural voice model...',
        36
    );

    const ringColor = useMemo(() => {
        if (holdProgress > 0.75) return '#22d3ee';
        if (holdProgress > 0.4) return '#a78bfa';
        return '#f43f5e';
    }, [holdProgress]);

    const startHold = useCallback(() => {
        if (firedRef.current || !isVoiceReady) return;
        setIsHolding(true);
        holdStartRef.current = performance.now();

        const tick = (now) => {
            const p = Math.min((now - holdStartRef.current) / HOLD_MS, 1);
            setHoldProgress(p);
            if (p < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                firedRef.current = true;
                setIsHolding(false);
                onStart?.();
            }
        };
        rafRef.current = requestAnimationFrame(tick);
    }, [isVoiceReady, onStart]);

    const cancelHold = useCallback(() => {
        if (firedRef.current) return;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        setIsHolding(false);
        setHoldProgress(0);
    }, []);

    useEffect(() => () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }, []);

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xl overflow-hidden">
            {/* Rain particles */}
            {RAIN_DROPS.map((drop) => (
                <div
                    key={drop.id}
                    className="absolute top-0 rounded-full pointer-events-none"
                    style={{
                        left: `${drop.left}%`,
                        width: '1px',
                        height: `${drop.height}px`,
                        background: 'linear-gradient(to bottom, transparent, rgba(180,210,255,0.7))',
                        opacity: drop.opacity,
                        transform: `skewX(${drop.skew}deg)`,
                        animation: `rainFall ${drop.duration}s ${drop.delay}s linear infinite`,
                    }}
                />
            ))}

            {/* Glass card */}
            <div
                className="relative w-[340px] max-w-[90vw] rounded-[28px] p-8
                    border border-white/[0.12]
                    shadow-glass-lg backdrop-blur-2xl text-center
                    animate-fade-in-up"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)',
                    boxShadow: isVoiceReady
                        ? '0 12px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(244,63,94,0.18)'
                        : '0 12px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
            >
                {/* Top shimmer line */}
                <div className="absolute inset-x-0 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                <AnimatedShield isReady={isVoiceReady} />

                <h2 className="text-white text-xl font-semibold tracking-tight mb-2">
                    {isVoiceReady ? 'Ready to Roll' : 'Initializing'}
                </h2>

                {/* Typewriter subtitle */}
                <p className="text-white/50 text-sm mb-7 min-h-[1.25rem]">
                    {subtitle}
                    <span className="inline-block w-0.5 h-3 bg-rose-400 ml-0.5 animate-pulse align-middle" />
                </p>

                {isVoiceReady ? (
                    <div className="relative select-none">
                        {/* Hold-to-start button */}
                        <button
                            onMouseDown={startHold}
                            onMouseUp={cancelHold}
                            onMouseLeave={cancelHold}
                            onTouchStart={(e) => { e.preventDefault(); startHold(); }}
                            onTouchEnd={cancelHold}
                            className="group relative w-full py-3.5 rounded-2xl text-base font-bold text-white
                                overflow-hidden cursor-pointer focus:outline-none
                                transition-shadow duration-200"
                            style={{
                                background: 'linear-gradient(135deg, #e11d48, #f43f5e)',
                                boxShadow: isHolding
                                    ? `0 0 0 2px ${ringColor}, 0 4px 32px rgba(244,63,94,0.6), 0 0 24px ${ringColor}50`
                                    : '0 4px 24px rgba(244,63,94,0.4)',
                                transform: isHolding ? 'scale(0.98)' : undefined,
                            }}
                            aria-label="Hold to start your ride"
                        >
                            {/* Progress fill (left→right) */}
                            <div
                                className="absolute inset-0 pointer-events-none transition-none"
                                style={{
                                    width: `${holdProgress * 100}%`,
                                    background: `linear-gradient(90deg, rgba(167,139,250,0.35), rgba(34,211,238,0.25))`,
                                    borderRadius: 'inherit',
                                }}
                            />
                            {/* Shimmer */}
                            <span className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
                                <span
                                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                                        transition-transform duration-700 ease-in-out
                                        bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                />
                            </span>
                            {/* Top glint */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

                            <span className="relative z-10">
                                {isHolding
                                    ? (holdProgress > 0.82 ? '🚀 Launching...' : 'Hold...')
                                    : 'Hold to Start'}
                            </span>
                        </button>

                        {/* Progress ring label */}
                        {isHolding && (
                            <p className="mt-2 text-[10px] text-white/30 tracking-widest uppercase">
                                {Math.round(holdProgress * 100)}% charged
                            </p>
                        )}
                    </div>
                ) : (
                    /* Loading bar */
                    <div className="relative h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 w-2/3 rounded-full
                                bg-gradient-to-r from-rose-500 via-violet-500 to-rose-500
                                animate-shimmer"
                            style={{ backgroundSize: '200% 100%' }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default StartScreen;
