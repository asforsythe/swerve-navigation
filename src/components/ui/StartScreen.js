import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

// Mobile browsers (iOS Safari in particular) stutter hard when compositing
// dozens of always-animating absolute-positioned elements on top of a
// `backdrop-blur-xl` layer. Drop the count sharply on phones — the effect
// still reads as "rain".
const IS_MOBILE_UA = typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const RAIN_COUNT = IS_MOBILE_UA ? 10 : 28;

// Static rain particle data — generated once, never changes
const RAIN_DROPS = Array.from({ length: RAIN_COUNT }, (_, i) => ({
    id: i,
    left: ((i * 3.7 + Math.sin(i * 2.1) * 12) % 100 + 100) % 100,
    delay: ((i * 0.19) % 2.4).toFixed(2),
    duration: (0.65 + (i % 5) * 0.17).toFixed(2),
    height: 8 + (i % 5) * 5,
    opacity: (0.05 + (i % 4) * 0.05).toFixed(2),
    skew: ((i % 3) - 1) * 4, // subtle angle
}));


// Swerve logo mark with glow ring
const SwerveLogoMark = ({ isReady }) => (
    <div
        className="mx-auto mb-5 relative flex items-center justify-center"
        style={{
            width: '88px',
            height: '88px',
        }}
    >
        {/* Animated glow ring */}
        <div
            className="absolute inset-0 rounded-full"
            style={{
                background: 'conic-gradient(from 0deg, #f43f5e, #a78bfa, #22d3ee, #a78bfa, #f43f5e)',
                padding: '2px',
                opacity: isReady ? 1 : 0.3,
                transition: 'opacity 0.8s ease',
                animation: isReady ? 'logoGlowSpin 4s linear infinite' : 'none',
                filter: isReady ? 'blur(0.5px)' : 'none',
            }}
        >
            <div className="w-full h-full rounded-full bg-black" />
        </div>
        {/* Logo image */}
        <img
            src={`${process.env.PUBLIC_URL}/swerve-logo.jpg`}
            alt="Swerve"
            className="absolute rounded-full object-cover"
            style={{
                width: '80px',
                height: '80px',
                top: '4px',
                left: '4px',
                opacity: isReady ? 1 : 0.6,
                transform: isReady ? 'scale(1)' : 'scale(0.92)',
                transition: 'opacity 0.6s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                filter: isReady
                    ? 'drop-shadow(0 0 12px rgba(167,139,250,0.45))'
                    : 'grayscale(0.5) drop-shadow(0 0 4px rgba(0,0,0,0.6))',
            }}
        />
        {/* Pulse ring on ready */}
        {isReady && (
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    border: '1px solid rgba(167,139,250,0.3)',
                    animation: 'logoPulseRing 2.5s ease-out infinite',
                }}
            />
        )}
    </div>
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
            if (firedRef.current || !holdStartRef.current) return;
            const p = Math.min((now - holdStartRef.current) / HOLD_MS, 1);
            setHoldProgress(p);
            if (p < 1) {
                rafRef.current = requestAnimationFrame(tick);
            }
        };
        rafRef.current = requestAnimationFrame(tick);
    }, [isVoiceReady]);

    const endHold = useCallback(() => {
        if (firedRef.current) return;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        const elapsed = holdStartRef.current ? performance.now() - holdStartRef.current : 0;
        holdStartRef.current = null;

        if (elapsed >= HOLD_MS) {
            // Long hold (Android / desktop)
            firedRef.current = true;
            setIsHolding(false);
            setHoldProgress(1);
            onStart?.();
        } else {
            // Short tap (iOS fallback) — quick charge animation then start
            firedRef.current = true;
            let animStart = performance.now();
            const tick = (now) => {
                const p = Math.min((now - animStart) / 250, 1);
                setHoldProgress(p);
                if (p >= 1) {
                    setIsHolding(false);
                    onStart?.();
                } else {
                    rafRef.current = requestAnimationFrame(tick);
                }
            };
            setIsHolding(true);
            rafRef.current = requestAnimationFrame(tick);
        }
    }, [onStart]);

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

                <SwerveLogoMark isReady={isVoiceReady} />

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
                            onMouseUp={endHold}
                            onMouseLeave={endHold}
                            onTouchStart={startHold}
                            onTouchEnd={endHold}
                            className="group relative w-full py-3.5 rounded-2xl text-base font-bold text-white
                                overflow-hidden cursor-pointer focus:outline-none
                                transition-shadow duration-200"
                            style={{
                                background: 'linear-gradient(135deg, #e11d48, #f43f5e)',
                                boxShadow: isHolding
                                    ? `0 0 0 2px ${ringColor}, 0 4px 32px rgba(244,63,94,0.6), 0 0 24px ${ringColor}50`
                                    : '0 4px 24px rgba(244,63,94,0.4)',
                                transform: isHolding ? 'scale(0.98)' : undefined,
                                WebkitTouchCallout: 'none',
                                WebkitUserSelect: 'none',
                                touchAction: 'manipulation',
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
