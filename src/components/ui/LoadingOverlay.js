import React from 'react';

const LoadingOverlay = ({ message = 'Analyzing Weather & Hazards...' }) => {
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-3 shadow-glass-lg">
                <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-white text-sm font-medium">{message}</span>
            </div>
        </div>
    );
};

export default LoadingOverlay;
