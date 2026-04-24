import React from 'react';
import useSwerveStore from '../../store/useSwerveStore';

const ControlBar = ({ onVoiceToggle, onThemeToggle, onSavedRoutes, onNotifications, onWeatherLayers, onWeatherDetail, onWeatherReplay }) => {
    const { theme, isMuted, toggleMute, savedRoutes, notifications, voiceCommand, weatherLayers, ui } = useSwerveStore();
    const showWeatherDetail = ui?.showWeatherDetail ?? false;
    const showWeatherReplay = ui?.showWeatherReplay ?? false;
    const isListening = voiceCommand?.isListening;
    const unreadCount = notifications.filter((n) => !n.read).length;
    const anyWeatherActive = Object.values(weatherLayers || {}).some(Boolean);

    const btnBase =
        'relative p-2.5 rounded-xl bg-[#0a0a0e]/70 backdrop-blur-md border border-white/[0.08] text-white/70 hover:text-white shadow-lg transition-all duration-200 hover:bg-[#0a0a0e]/90 hover:border-white/[0.15] hover:scale-105 active:scale-95';
    const activeClass = 'bg-rose-500/80 border-rose-400/60 text-white shadow-neon-red';

    return (
        <div className="absolute top-4 right-4 z-40 flex gap-2 animate-slide-in-right">
            {/* Voice button with concentric sound rings */}
            <div className="relative">
                {isListening && (
                    <>
                        <div className="absolute inset-0 rounded-xl animate-ping bg-rose-500/25 pointer-events-none" />
                        <div
                            className="absolute inset-0 rounded-xl animate-ping bg-rose-500/15 pointer-events-none"
                            style={{ animationDelay: '0.18s' }}
                        />
                        <div
                            className="absolute inset-0 rounded-xl animate-ping bg-rose-500/08 pointer-events-none"
                            style={{ animationDelay: '0.36s' }}
                        />
                    </>
                )}
                <button
                    onClick={onVoiceToggle}
                    className={`${btnBase} ${isListening ? activeClass : ''}`}
                    title={isListening ? 'Stop Listening' : 'Voice Command'}
                    style={isListening ? { filter: 'drop-shadow(0 0 8px rgba(244,63,94,0.6))' } : undefined}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </button>
            </div>

            {/* Mute button */}
            <button
                onClick={toggleMute}
                className={`${btnBase} ${isMuted ? activeClass : ''}`}
                title={isMuted ? 'Unmute Voice' : 'Mute Voice'}
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
            </button>

            {/* Theme toggle */}
            <button
                onClick={onThemeToggle}
                className={btnBase}
                title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
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
            </button>

            {/* Saved routes */}
            <button
                onClick={onSavedRoutes}
                className={`${btnBase}`}
                title="Saved Routes"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {savedRoutes.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white shadow-neon-red">
                        {savedRoutes.length}
                    </span>
                )}
            </button>

            {/* Weather layers toggle */}
            <button
                onClick={onWeatherLayers}
                className={`${btnBase} ${anyWeatherActive ? 'border-blue-400/40 text-blue-300' : ''}`}
                title="Weather Layers"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                {anyWeatherActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                )}
            </button>

            {/* Weather detail toggle */}
            <button
                onClick={onWeatherDetail}
                className={`${btnBase} ${showWeatherDetail ? 'border-amber-400/40 text-amber-300' : ''}`}
                title="Weather Details & Forecast"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {showWeatherDetail && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                )}
            </button>

            {/* Weather Replay */}
            <button
                onClick={onWeatherReplay}
                className={`${btnBase} ${showWeatherReplay ? 'border-violet-400/40 text-violet-300' : ''}`}
                title="Weather Replay (24h History)"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {showWeatherReplay && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
                )}
            </button>

            {/* Notifications — bouncing badge on new alerts */}
            <button
                onClick={onNotifications}
                className={`${btnBase}`}
                title="Notifications"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.352 2.352 0 0118 15.168V11l-3-3H6l-3 3v5.168c0 .653-.316 1.166-.595 1.405L3 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span
                        className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white shadow-neon-red animate-bounce"
                    >
                        {unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
};

export default ControlBar;
