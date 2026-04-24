import React, { useState, useEffect, useMemo } from 'react';
import useSwerveStore from '../../store/useSwerveStore';

const ICONS = {
    success: (
        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    ),
    error: (
        <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    info: (
        <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    warning: (
        <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
};

const TYPE_BORDER = {
    success: 'rgba(52,211,153,0.25)',
    error: 'rgba(244,63,94,0.25)',
    info: 'rgba(96,165,250,0.25)',
    warning: 'rgba(251,191,36,0.25)',
};

const TYPE_PROGRESS = {
    success: '#34d399',
    error: '#f43f5e',
    info: '#60a5fa',
    warning: '#fbbf24',
};

const CONFETTI_COLORS = ['#f43f5e', '#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#f97316'];

// Single confetti piece
const ConfettiPiece = ({ color, left, delay, size }) => (
    <div
        className="absolute pointer-events-none rounded-sm animate-confetti-fall"
        style={{
            left: `${left}%`,
            top: 0,
            width: size,
            height: size * 1.4,
            backgroundColor: color,
            opacity: 0.9,
            animationDelay: `${delay}s`,
            animationFillMode: 'forwards',
        }}
    />
);

// Individual toast component
const Toast = ({ toast, onRemove }) => {
    const [entered, setEntered] = useState(false);
    const [shaking, setShaking] = useState(false);
    const duration = toast.duration || 3000;
    const isError = toast.type === 'error';
    const isSuccess = toast.type === 'success';

    // Stagger entrance slightly with RAF
    useEffect(() => {
        const id = requestAnimationFrame(() => {
            requestAnimationFrame(() => setEntered(true));
        });
        return () => cancelAnimationFrame(id);
    }, []);

    // Shake on error after entrance
    useEffect(() => {
        if (!isError) return;
        const id = setTimeout(() => {
            setShaking(true);
            setTimeout(() => setShaking(false), 600);
        }, 300);
        return () => clearTimeout(id);
    }, [isError]);

    const confetti = useMemo(() => {
        if (!isSuccess) return [];
        return Array.from({ length: 14 }, (_, i) => ({
            id: i,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            left: 5 + (i * 6.8) % 90,
            delay: i * 0.045,
            size: 4 + (i % 3),
        }));
    }, [isSuccess]);

    const borderColor = TYPE_BORDER[toast.type] || TYPE_BORDER.info;
    const progressColor = TYPE_PROGRESS[toast.type] || TYPE_PROGRESS.info;

    return (
        <div
            className="pointer-events-auto relative overflow-hidden"
            style={{
                opacity: entered ? 1 : 0,
                transform: entered ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.94)',
                filter: entered ? 'blur(0px)' : 'blur(4px)',
                transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1), filter 0.4s cubic-bezier(0.16,1,0.3,1)',
                animation: shaking ? 'toastShake 0.5s cubic-bezier(0.36,0.07,0.19,0.97)' : undefined,
            }}
        >
            {/* Confetti overlay (success only) */}
            {isSuccess && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {confetti.map((p) => (
                        <ConfettiPiece key={p.id} {...p} />
                    ))}
                </div>
            )}

            {/* Toast body */}
            <div
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl backdrop-blur-xl shadow-glass-lg"
                style={{
                    background: 'rgba(10,10,14,0.92)',
                    border: `1px solid ${borderColor}`,
                }}
            >
                {ICONS[toast.type] || ICONS.info}
                <span className="text-white/90 text-sm font-medium">{toast.message}</span>
                <button
                    onClick={() => onRemove(toast.id)}
                    className="ml-1 text-white/30 hover:text-white/70 transition-colors"
                    aria-label="Dismiss"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Progress bar */}
            <div
                className="absolute bottom-0 left-0 h-[2px] rounded-full"
                style={{
                    backgroundColor: progressColor,
                    width: '100%',
                    animation: `progressDrain ${duration}ms linear forwards`,
                    boxShadow: `0 0 6px ${progressColor}`,
                }}
            />
        </div>
    );
};

const ToastContainer = () => {
    const { toasts, removeToast } = useSwerveStore();

    if (toasts.length === 0) return null;

    return (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none min-w-[300px]">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
        </div>
    );
};

export default ToastContainer;
