import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSwerveStore from '../../store/useSwerveStore';

// ── Tap ripple feedback ───────────────────────────────────────────────────────
const TapBtn = React.forwardRef(({ className, style, title, onClick, children, accentColor }, ref) => (
    <motion.button
        ref={ref}
        onClick={onClick}
        title={title}
        className={className}
        style={style}
        initial={false}
        whileHover={{ scale: 1.07, transition: { type: 'spring', stiffness: 500, damping: 28 } }}
        whileTap={{   scale: 0.88, transition: { type: 'spring', stiffness: 600, damping: 20 } }}
    >
        {children}
        <motion.span
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ background: accentColor ? `${accentColor}30` : 'rgba(255,255,255,0.12)' }}
            initial={{ opacity: 0 }}
            whileTap={{ opacity: [0, 0.6, 0], transition: { duration: 0.32 } }}
        />
    </motion.button>
));
TapBtn.displayName = 'TapBtn';

// ── Stagger variants ──────────────────────────────────────────────────────────
const barVariants = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.045, delayChildren: 0.06 } },
};
const btnVariants = {
    hidden:  { opacity: 0, y: -10, scale: 0.88 },
    visible: { opacity: 1, y: 0,   scale: 1, transition: { type: 'spring', stiffness: 420, damping: 28 } },
};

const ControlBar = ({
    onVoiceToggle, onThemeToggle, onSavedRoutes,
    onNotifications, onWeatherLayers, onWeatherDetail,
    onWeatherReplay, onHazardReport, onSwerveScore, onLiveShare,
    onChallenges,
}) => {
    const { theme, isMuted, toggleMute, savedRoutes, notifications, voiceCommand, weatherLayers, ui, swerveScore, liveShare, challengeProgress } = useSwerveStore();
    const showWeatherDetail = ui?.showWeatherDetail ?? false;
    const showWeatherReplay = ui?.showWeatherReplay ?? false;
    const showHazardReport  = ui?.showHazardReport  ?? false;
    const showSwerveScore   = ui?.showSwerveScore   ?? false;
    const showLiveShare     = ui?.showLiveShare     ?? false;
    const showChallenges    = ui?.showChallenges    ?? false;
    const completedCount    = Object.values(challengeProgress || {}).filter((p) => p?.completedAt).length;
    const isListening       = voiceCommand?.isListening;
    const unreadCount       = notifications.filter((n) => !n.read).length;
    const anyWeatherActive  = Object.values(weatherLayers || {}).some(Boolean);
    const isLiveActive      = liveShare?.isActive ?? false;

    const LEVEL_COLORS = ['#94a3b8', '#22d3ee', '#a78bfa', '#f59e0b', '#f43f5e'];
    const levelColor = LEVEL_COLORS[Math.min(swerveScore?.level ?? 0, 4)];

    // Mobile-only overflow sheet
    const [showOverflow, setShowOverflow] = useState(false);
    const closeOverflow = () => setShowOverflow(false);
    const wrapOverflow = (handler) => () => {
        closeOverflow();
        handler?.();
    };

    const btnBase = [
        'relative p-2.5 rounded-2xl overflow-hidden',
        'sm:rounded-xl sm:p-2.5',
        'flex items-center justify-center',
        'w-11 h-11 sm:w-auto sm:h-auto',
        'bg-gradient-to-br from-[#0f0f16]/95 to-[#08080c]/95 backdrop-blur-xl',
        'border border-white/[0.10]',
        'text-white/70 shadow-glass',
        'transition-colors duration-150',
        'hover:text-white hover:border-white/[0.18] hover:from-[#0f0f16] hover:to-[#08080c]',
    ].join(' ');

    const dot = (color) => (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
    );

    // ────────────────────────────────────────────────────────────────────────────
    // Each button as its own JSX expression — rendered into one of three layouts:
    //   • desktop horizontal bar (sm+)
    //   • mobile vertical strip (primary 5)
    //   • mobile overflow sheet  (the rest)
    // ────────────────────────────────────────────────────────────────────────────

    const renderVoice = (onTap = onVoiceToggle) => (
        <motion.div variants={btnVariants} className="relative">
            <AnimatePresence>
                {isListening && (
                    <>
                        {[0, 0.18, 0.36].map((delay) => (
                            <motion.div
                                key={delay}
                                className="absolute inset-0 rounded-xl bg-rose-500/20 pointer-events-none"
                                initial={{ opacity: 0.7, scale: 1 }}
                                animate={{ opacity: 0, scale: 1.6 }}
                                transition={{ duration: 1.1, delay, repeat: Infinity }}
                            />
                        ))}
                    </>
                )}
            </AnimatePresence>
            <TapBtn
                onClick={onTap}
                title={isListening ? 'Stop Listening' : 'Voice Command'}
                accentColor="#f43f5e"
                className={`${btnBase} ${isListening ? 'border-rose-500/50 text-rose-300 bg-rose-500/15' : ''}`}
                style={isListening ? { boxShadow: '0 0 18px rgba(244,63,94,0.40), 0 4px 16px rgba(0,0,0,0.3)' } : undefined}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            </TapBtn>
        </motion.div>
    );

    const renderMute = (onTap = toggleMute) => (
        <motion.div variants={btnVariants}>
            <TapBtn
                onClick={onTap}
                title={isMuted ? 'Unmute Voice' : 'Mute Voice'}
                accentColor="#f43f5e"
                className={`${btnBase} ${isMuted ? 'border-rose-500/40 text-rose-300 bg-rose-500/10' : ''}`}
            >
                {isMuted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l3-3m0 0l-3-3m3 3H7" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                )}
            </TapBtn>
        </motion.div>
    );

    const renderTheme = (onTap = onThemeToggle) => (
        <motion.div variants={btnVariants}>
            <TapBtn onClick={onTap} title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} className={btnBase}>
                <motion.span
                    key={theme}
                    initial={{ rotate: -30, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 30, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="block"
                >
                    {theme === 'dark' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    )}
                </motion.span>
            </TapBtn>
        </motion.div>
    );

    const renderTripHistory = (onTap = onSavedRoutes) => (
        <motion.div variants={btnVariants}>
            <TapBtn
                onClick={onTap}
                title="Trip History"
                accentColor="#a78bfa"
                className={`${btnBase} ${savedRoutes.length > 0 ? 'border-violet-400/25' : ''}`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <AnimatePresence>
                    {savedRoutes.length > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white shadow-neon-violet"
                        >
                            {savedRoutes.length}
                        </motion.span>
                    )}
                </AnimatePresence>
            </TapBtn>
        </motion.div>
    );

    const renderChallenges = (onTap = onChallenges) => (
        <motion.div variants={btnVariants} className="relative">
            <TapBtn
                onClick={onTap}
                title="Challenges"
                accentColor="#fcd34d"
                className={`${btnBase} ${showChallenges ? 'border-amber-300/40 text-amber-200 bg-amber-300/10' : ''}`}
                style={showChallenges ? { boxShadow: '0 0 16px rgba(252,211,77,0.25), 0 4px 16px rgba(0,0,0,0.3)' } : undefined}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="3" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                    <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
                </svg>
                {completedCount > 0 && (
                    <span
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-black"
                        style={{ background: '#fcd34d', boxShadow: '0 0 6px rgba(252,211,77,0.7)' }}
                    >
                        {completedCount}
                    </span>
                )}
            </TapBtn>
        </motion.div>
    );

    const renderWeatherLayers = (onTap = onWeatherLayers) => (
        <motion.div variants={btnVariants}>
            <TapBtn
                onClick={onTap}
                title="Weather Layers"
                accentColor="#60a5fa"
                className={`${btnBase} ${anyWeatherActive ? 'border-blue-400/40 text-blue-300' : ''}`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                {anyWeatherActive && dot('#60a5fa')}
            </TapBtn>
        </motion.div>
    );

    const renderWeatherDetail = (onTap = onWeatherDetail) => (
        <motion.div variants={btnVariants}>
            <TapBtn
                onClick={onTap}
                title="Weather Details & Forecast"
                accentColor="#fbbf24"
                className={`${btnBase} ${showWeatherDetail ? 'border-amber-400/40 text-amber-300' : ''}`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {showWeatherDetail && dot('#fbbf24')}
            </TapBtn>
        </motion.div>
    );

    const renderWeatherReplay = (onTap = onWeatherReplay) => (
        <motion.div variants={btnVariants}>
            <TapBtn
                onClick={onTap}
                title="Weather Replay (24h History)"
                accentColor="#a78bfa"
                className={`${btnBase} ${showWeatherReplay ? 'border-violet-400/40 text-violet-300' : ''}`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {showWeatherReplay && dot('#a78bfa')}
            </TapBtn>
        </motion.div>
    );

    const renderHazard = (onTap = onHazardReport) => (
        <motion.div variants={btnVariants}>
            <TapBtn
                onClick={onTap}
                title="Report Road Hazard"
                accentColor="#f43f5e"
                className={`${btnBase} ${showHazardReport ? 'border-rose-500/40 text-rose-300 bg-rose-500/10' : ''}`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {showHazardReport && dot('#f43f5e')}
            </TapBtn>
        </motion.div>
    );

    const renderScore = (onTap = onSwerveScore) => (
        <motion.div variants={btnVariants} className="relative">
            <TapBtn
                onClick={onTap}
                title="Swerve Score"
                accentColor={levelColor}
                className={`${btnBase} ${showSwerveScore ? 'border-amber-300/40 text-amber-200 bg-amber-300/10' : ''}`}
                style={showSwerveScore ? { boxShadow: `0 0 16px ${levelColor}30, 0 4px 16px rgba(0,0,0,0.3)` } : undefined}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                {(swerveScore?.total ?? 0) > 0 && (
                    <span
                        className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                        style={{ background: levelColor, boxShadow: `0 0 6px ${levelColor}` }}
                    />
                )}
            </TapBtn>
        </motion.div>
    );

    const renderLiveShare = (onTap = onLiveShare) => (
        <motion.div variants={btnVariants} className="relative">
            {isLiveActive && (
                <>
                    {[0, 0.22, 0.44].map((delay) => (
                        <motion.div
                            key={delay}
                            className="absolute inset-0 rounded-xl bg-cyan-400/15 pointer-events-none"
                            initial={{ opacity: 0.6, scale: 1 }}
                            animate={{ opacity: 0, scale: 1.7 }}
                            transition={{ duration: 1.4, delay, repeat: Infinity }}
                        />
                    ))}
                </>
            )}
            <TapBtn
                onClick={onTap}
                title={isLiveActive ? 'Live Sharing Active' : 'Track My Drive'}
                accentColor="#22d3ee"
                className={`${btnBase} ${isLiveActive ? 'border-cyan-400/50 text-cyan-300 bg-cyan-400/12' : showLiveShare ? 'border-cyan-400/30 text-cyan-300' : ''}`}
                style={isLiveActive ? { boxShadow: '0 0 18px rgba(34,211,238,0.35), 0 4px 16px rgba(0,0,0,0.3)' } : undefined}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {isLiveActive && dot('#22d3ee')}
            </TapBtn>
        </motion.div>
    );

    const renderNotifications = (onTap = onNotifications) => (
        <motion.div variants={btnVariants}>
            <TapBtn onClick={onTap} title="Notifications" accentColor="#fbbf24" className={btnBase}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.352 2.352 0 0118 15.168V11l-3-3H6l-3 3v5.168c0 .653-.316 1.166-.595 1.405L3 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.3, 1] }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white shadow-neon-rose"
                        >
                            {unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </TapBtn>
        </motion.div>
    );

    // Mobile-only "More" trigger — opens overflow sheet
    const renderMore = () => (
        <motion.div variants={btnVariants}>
            <TapBtn
                onClick={() => setShowOverflow(true)}
                title="More controls"
                accentColor="#94a3b8"
                className={`${btnBase} ${showOverflow ? 'border-white/20 text-white' : ''}`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="5" cy="12" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                    <circle cx="19" cy="12" r="1.5" fill="currentColor" />
                </svg>
            </TapBtn>
        </motion.div>
    );

    return (
        <>
            {/* ════════════════════════════════════════════════════════════════
                DESKTOP (sm+): horizontal bar, all 12 buttons, top-right
            ════════════════════════════════════════════════════════════════ */}
            <motion.div
                className="hidden sm:flex absolute z-40 flex-wrap justify-end gap-1.5 sm:gap-2"
                style={{
                    top: 'calc(var(--safe-top, 0px) + 12px)',
                    right: 'calc(var(--safe-right, 0px) + 12px)',
                }}
                variants={barVariants}
                initial="hidden"
                animate="visible"
            >
                {renderVoice()}
                {renderMute()}
                {renderTheme()}
                {renderTripHistory()}
                {renderChallenges()}
                {renderWeatherLayers()}
                {renderWeatherDetail()}
                {renderWeatherReplay()}
                {renderHazard()}
                {renderScore()}
                {renderLiveShare()}
                {renderNotifications()}
            </motion.div>

            {/* ════════════════════════════════════════════════════════════════
                MOBILE (<sm): vertical strip on right edge — primary 5
                Sits BELOW the TelemetryPill so they don't collide.
                Subtle floor aura behind the strip ties it to the SSI accent.
            ════════════════════════════════════════════════════════════════ */}
            <motion.div
                className="sm:hidden absolute z-40 flex flex-col gap-2 p-1"
                style={{
                    top: 'calc(var(--safe-top, 0px) + 88px)',
                    right: 'calc(var(--safe-right, 0px) + 12px)',
                }}
                variants={barVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Ambient column glow tinted by SSI level */}
                <motion.div
                    aria-hidden
                    className="absolute -inset-1 rounded-[24px] pointer-events-none"
                    style={{
                        background: `radial-gradient(ellipse at center, ${levelColor}26 0%, transparent 65%)`,
                        filter: 'blur(8px)',
                    }}
                    animate={{ opacity: [0.5, 0.85, 0.5] }}
                    transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="relative flex flex-col gap-2">
                    {renderVoice()}
                    {renderWeatherLayers()}
                    {renderHazard()}
                    {renderScore()}
                    {renderMore()}
                </div>
            </motion.div>

            {/* ════════════════════════════════════════════════════════════════
                MOBILE OVERFLOW SHEET — bottom sheet with the remaining 7
            ════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {showOverflow && (
                    <motion.div
                        key="ctrl-overflow"
                        className="sm:hidden fixed inset-0 z-[55]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={closeOverflow}
                        />
                        <motion.div
                            className="absolute left-0 right-0 bottom-0 rounded-t-[28px] overflow-hidden"
                            style={{
                                background: 'rgba(10,10,14,0.95)',
                                backdropFilter: 'blur(28px)',
                                WebkitBackdropFilter: 'blur(28px)',
                                paddingBottom: 'calc(var(--safe-bottom, 0px) + 24px)',
                                boxShadow: '0 -10px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
                            }}
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                        >
                            <div className="relative">
                                <div
                                    className="absolute inset-x-0 top-0 h-[1.5px]"
                                    style={{ background: `linear-gradient(90deg, transparent, ${levelColor}, transparent)` }}
                                />
                                <div className="flex justify-center pt-3 pb-2">
                                    <div className="w-11 h-1 rounded-full" style={{ background: `${levelColor}90`, boxShadow: `0 0 6px ${levelColor}80` }} />
                                </div>
                            </div>
                            <div className="px-5 pb-2 flex items-center justify-between">
                                <div>
                                    <h3 className="text-white text-[18px] font-bold leading-tight">Controls</h3>
                                    <p className="text-white/40 text-[11px] mt-0.5">Tap to open · drag down to close</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeOverflow}
                                    className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.06]"
                                    aria-label="Close"
                                >
                                    <svg className="w-4 h-4 text-white/55" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            {/* 4-column grid of icon buttons + labels */}
                            <div className="px-5 pt-3 pb-2 grid grid-cols-4 gap-3">
                                <OverflowSlot label="Mute" content={renderMute(wrapOverflow(toggleMute))} />
                                <OverflowSlot label={theme === 'dark' ? 'Light' : 'Dark'} content={renderTheme(wrapOverflow(onThemeToggle))} />
                                <OverflowSlot label="Trips" content={renderTripHistory(wrapOverflow(onSavedRoutes))} />
                                <OverflowSlot label="Goals" content={renderChallenges(wrapOverflow(onChallenges))} />
                                <OverflowSlot label="Forecast" content={renderWeatherDetail(wrapOverflow(onWeatherDetail))} />
                                <OverflowSlot label="Replay" content={renderWeatherReplay(wrapOverflow(onWeatherReplay))} />
                                <OverflowSlot label="Live" content={renderLiveShare(wrapOverflow(onLiveShare))} />
                                <OverflowSlot label="Alerts" content={renderNotifications(wrapOverflow(onNotifications))} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

// ─── overflow grid slot: button + label ───────────────────────────────────────
const OverflowSlot = ({ label, content }) => (
    <div className="flex flex-col items-center gap-1.5">
        {content}
        <span className="text-white/55 text-[10px] font-semibold">{label}</span>
    </div>
);

export default ControlBar;
