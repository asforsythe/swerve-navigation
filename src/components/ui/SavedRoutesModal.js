import React, { useEffect } from 'react';
import useSwerveStore from '../../store/useSwerveStore';

const SavedRoutesModal = ({ onClose, speak }) => {
    const { savedRoutes, deleteRoute } = useSwerveStore();

    // Escape key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl animate-fade-in"
            onClick={onClose}
        >
            <div
                className="w-[400px] max-w-[90vw] rounded-[24px] p-6 bg-[#0a0a0e]/95 border border-white/[0.12] shadow-glass-lg animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white text-lg font-semibold">Saved Routes</h3>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.06]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {savedRoutes.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] flex items-center justify-center">
                            <svg className="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </div>
                        <p className="text-white/40 text-sm">No saved routes yet.</p>
                        <p className="text-white/25 text-xs mt-1">Routes with safety 80+ auto-save.</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
                        {savedRoutes.map((route, index) => (
                            <div
                                key={route.id}
                                className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06] hover:bg-white/[0.06] transition-colors animate-fade-in-up"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{route.dest}</p>
                                        <p className="text-white/40 text-xs mt-1 truncate">{route.start}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${route.ssi >= 80
                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                        : 'bg-amber-500/20 text-amber-400'
                                                    }`}
                                            >
                                                {route.ssi}%
                                            </span>
                                            <span className="text-white/30 text-[10px]">{new Date(route.savedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}?route=${route.id}`);
                                                speak?.('Link copied');
                                            }}
                                            className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                                            title="Share Route"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.338m-2.824 1.338a4.555 4.555 0 00-1.516 2.768c.534 1.063.834 2.275.834 3.662 0 2.477-2.018 4.484-4.484 4.484a4.555 4.555 0 003.002-1.516m2.276-1.64a7.453 7.453 0 011.516 2.768 4.555 4.555 0 00-1.516 2.768m-1.64-1.64a7.453 7.453 0 01-1.516-2.768 4.555 4.555 0 001.516-2.768m-2.824 1.338a4.555 4.555 0 00-1.516 2.768c.534 1.063.834 2.275.834 3.662 0 2.477-2.018 4.484-4.484 4.484a4.555 4.555 0 003.002-1.516m2.276-1.64a7.453 7.453 0 011.516 2.768 4.555 4.555 0 00-1.516 2.768m-1.64-1.64a7.453 7.453 0 01-1.516-2.768 4.555 4.555 0 001.516-2.768" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => deleteRoute(route.id)}
                                            className="p-2 text-white/40 hover:text-rose-400 rounded-lg hover:bg-white/[0.06] transition-colors"
                                            title="Delete Route"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SavedRoutesModal;
