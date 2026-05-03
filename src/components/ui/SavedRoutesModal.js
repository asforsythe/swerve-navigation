import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import useSwerveStore from '../../store/useSwerveStore';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

function ssiColor(ssi) {
  if (ssi >= 85) return { text: 'text-emerald-400', bg: 'bg-emerald-500/20', hex: '#34d399' };
  if (ssi >= 70) return { text: 'text-blue-400',    bg: 'bg-blue-500/20',    hex: '#3b82f6' };
  if (ssi >= 55) return { text: 'text-amber-400',   bg: 'bg-amber-500/20',   hex: '#fbbf24' };
  return { text: 'text-rose-400', bg: 'bg-rose-500/20', hex: '#ef4444' };
}

function fmtDate(ts) {
  try { return format(new Date(ts), 'MMM d, h:mm a'); } catch { return ''; }
}

function MapThumb({ route }) {
  const [err, setErr] = useState(false);
  if (!route.centerLng || !route.centerLat || !MAPBOX_TOKEN || err) {
    return (
      <div className="w-full h-full bg-white/[0.04] flex items-center justify-center rounded-lg">
        <svg className="w-5 h-5 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </div>
    );
  }
  return (
    <img
      src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${route.centerLng},${route.centerLat},12/160x100@2x?access_token=${MAPBOX_TOKEN}`}
      alt="Route map"
      className="w-full h-full object-cover rounded-lg"
      onError={() => setErr(true)}
    />
  );
}

export default function SavedRoutesModal({ onClose, speak, onReplayRoute }) {
  const { savedRoutes, deleteRoute, setUiState } = useSwerveStore();
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare]   = useState(false);

  // Escape key
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const compareRoutes = compareIds.map((id) => savedRoutes.find((r) => r.id === id)).filter(Boolean);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl animate-fade-in"
      onClick={onClose}
    >
      <motion.div
        className="w-[440px] max-w-[94vw] rounded-[24px] border border-white/[0.1] overflow-hidden"
        style={{ background: 'rgba(10,10,14,0.97)', backdropFilter: 'blur(28px)', boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-white text-base font-semibold">Trip History</h3>
            <p className="text-white/30 text-xs mt-0.5">{savedRoutes.length} route{savedRoutes.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {savedRoutes.length >= 2 && (
              <button
                onClick={() => setShowCompare((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                  showCompare
                    ? 'bg-violet-500/30 text-violet-300 border border-violet-400/30'
                    : 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1]'
                }`}
              >
                {showCompare ? 'Done' : 'Compare'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-white/30 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Compare view */}
        <AnimatePresence>
          {showCompare && compareRoutes.length === 2 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <p className="text-[10px] uppercase tracking-widest text-violet-400/70 mb-3">Side-by-Side Comparison</p>
                <div className="grid grid-cols-2 gap-3">
                  {compareRoutes.map((r) => {
                    const c = ssiColor(r.ssi);
                    return (
                      <div key={r.id} className="rounded-xl border border-white/[0.07] overflow-hidden">
                        <div className="h-16 overflow-hidden">
                          <MapThumb route={r} />
                        </div>
                        <div className="p-2.5">
                          <p className="text-white text-xs font-semibold truncate">{r.dest}</p>
                          <p className="text-white/35 text-[10px] truncate">{r.start}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>{r.ssi}%</span>
                            <span className="text-white/25 text-[9px]">{fmtDate(r.savedAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Stats comparison */}
                <div className="mt-3 space-y-1.5">
                  {['ssi'].map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-white/25 text-[10px] w-16">Safety</span>
                      <div className="flex-1 flex gap-1">
                        {compareRoutes.map((r, i) => {
                          const c = ssiColor(r.ssi);
                          return (
                            <div key={i} className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${r.ssi}%`, background: c.hex }} />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        {compareRoutes.map((r, i) => {
                          const c = ssiColor(r.ssi);
                          return <span key={i} className={`text-[10px] font-bold ${c.text}`}>{r.ssi}</span>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {showCompare && compareRoutes.length < 2 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-white/[0.06] text-center">
                <p className="text-white/35 text-xs">Select {2 - compareRoutes.length} more route{2 - compareRoutes.length !== 1 ? 's' : ''} below to compare</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Route list */}
        <div className="max-h-[62vh] overflow-y-auto no-scrollbar p-4">
          {savedRoutes.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] flex items-center justify-center">
                <svg className="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <p className="text-white/40 text-sm">No saved routes yet.</p>
              <p className="text-white/25 text-xs mt-1">Routes with SSI 80+ auto-save.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedRoutes.map((route, index) => {
                const c = ssiColor(route.ssi);
                const isSelected = compareIds.includes(route.id);
                return (
                  <motion.div
                    key={route.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className={`rounded-xl border transition-all ${
                      isSelected
                        ? 'border-violet-400/40 bg-violet-500/[0.06]'
                        : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]'
                    }`}
                    onClick={() => showCompare && toggleCompare(route.id)}
                    style={{ cursor: showCompare ? 'pointer' : 'default' }}
                  >
                    {/* Map thumbnail row */}
                    <div className="h-20 overflow-hidden rounded-t-xl">
                      <MapThumb route={route} />
                    </div>

                    <div className="px-3.5 py-3 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{route.dest}</p>
                        <p className="text-white/40 text-xs mt-0.5 truncate">{route.start}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                            {route.ssi}% SSI
                          </span>
                          <span className="text-white/25 text-[10px]">{fmtDate(route.savedAt)}</span>
                        </div>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        {/* Replay */}
                        {onReplayRoute && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onReplayRoute(route); onClose(); speak?.('Replaying route'); }}
                            className="p-2 text-white/30 hover:text-cyan-400 rounded-lg hover:bg-white/[0.06] transition-colors"
                            title="Replay Route"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}

                        {/* Share */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(
                              `🛡 Swerve Route\n${route.start} → ${route.dest}\nSafety: ${route.ssi}/100\n#Swerve`
                            );
                            speak?.('Copied to clipboard');
                          }}
                          className="p-2 text-white/30 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                          title="Copy Route"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteRoute(route.id); }}
                          className="p-2 text-white/30 hover:text-rose-400 rounded-lg hover:bg-white/[0.06] transition-colors"
                          title="Delete Route"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Insurance Report CTA */}
        {savedRoutes.length > 0 && (
          <div className="px-4 pb-4">
            <button
              onClick={() => { onClose(); setUiState({ showInsuranceReport: true }); }}
              className="w-full py-2.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(59,130,246,0.12))',
                border: '1px solid rgba(52,211,153,0.25)',
                color: '#34d399',
              }}
            >
              <span>🛡️</span>
              Generate Safe Driver Report
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
