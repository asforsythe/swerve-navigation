import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSwerveStore from '../../store/useSwerveStore';

function fmtDistance(m) {
  if (!m) return null;
  return `${(m / 1609.34).toFixed(1)} mi`;
}
function fmtDuration(s) {
  if (!s) return null;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

const PERFECT_COLOR = '#34d399';
const DANGER_COLOR  = '#f97316';

export default function MomentCapturedOverlay() {
  const { moments, ui, setUiState } = useSwerveStore();
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied]   = useState(false);

  const show = ui?.showMomentCapture;
  const moment = moments[0] ?? null; // most recent

  // Auto-dismiss after 10s
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setUiState({ showMomentCapture: false }), 10000);
    return () => clearTimeout(t);
  }, [show, setUiState]);

  const close = () => setUiState({ showMomentCapture: false });

  const isPerfect = moment?.type === 'perfect';
  const accent    = isPerfect ? PERFECT_COLOR : DANGER_COLOR;
  const emoji     = isPerfect ? '✦' : '⚡';
  const headline  = isPerfect ? 'Perfect Run' : 'Danger Navigated';
  const sub       = isPerfect
    ? 'You chose the safest available path.'
    : 'You navigated through hazardous conditions.';

  const handleShareCard = async () => {
    if (!moment) return;
    setSharing(true);
    try {
      const res = await fetch('/api/share-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moment),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);

      if (navigator.share && navigator.canShare?.({ files: [] })) {
        const file = new File([blob], 'swerve-moment.png', { type: 'image/png' });
        await navigator.share({ title: `Swerve — ${headline}`, files: [file] });
      } else {
        const a = document.createElement('a');
        a.href     = url;
        a.download = 'swerve-moment.png';
        a.click();
      }
      URL.revokeObjectURL(url);
    } catch (e) {
      // silent fail — user can retry
    } finally {
      setSharing(false);
    }
  };

  const handleCopyText = () => {
    if (!moment) return;
    const text = `🛡 Swerve ${headline}!\nRoute: ${moment.from} → ${moment.to}\nSafety Score: ${moment.ssi}/100 (${moment.category})\n${fmtDistance(moment.distance) ? `Distance: ${fmtDistance(moment.distance)}` : ''} ${fmtDuration(moment.duration) ? `• ETA: ${fmtDuration(moment.duration)}` : ''}\n#Swerve #WeatherIntelligence`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      {show && moment && (
        <motion.div
          key="moment-overlay"
          className="absolute inset-0 z-[70] flex items-end justify-center pb-32 px-5"
          style={{ pointerEvents: 'none' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop glow */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: `radial-gradient(ellipse at center bottom, ${accent}18 0%, transparent 65%)`,
              pointerEvents: 'none',
            }}
          />

          <motion.div
            initial={{ y: 60, scale: 0.92, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300, delay: 0.1 }}
            className="w-full max-w-sm rounded-[22px] overflow-hidden"
            style={{
              pointerEvents: 'auto',
              background: 'rgba(10,10,14,0.97)',
              backdropFilter: 'blur(28px)',
              border: `1px solid ${accent}33`,
              boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.7), 0 0 40px ${accent}22`,
            }}
          >
            {/* Top accent bar */}
            <div
              className="h-[3px] w-full"
              style={{ background: `linear-gradient(90deg, ${accent}, ${accent}44, transparent)` }}
            />

            <div className="p-5">
              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.25 }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold"
                    style={{ background: accent + '22', color: accent }}
                  >
                    {emoji}
                  </motion.div>
                  <div>
                    <p
                      className="text-sm font-bold tracking-wide"
                      style={{ color: accent }}
                    >
                      {headline.toUpperCase()}
                    </p>
                    <p className="text-white/40 text-[11px]">{sub}</p>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="p-1.5 rounded-lg text-white/25 hover:text-white/60 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Route card */}
              <div
                className="rounded-xl p-3 mb-3 border border-white/[0.06]"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{moment.to}</p>
                    <p className="text-white/35 text-[11px] truncate">from {moment.from}</p>
                  </div>
                  <div className="ml-3 text-right flex-shrink-0">
                    <motion.p
                      className="text-2xl font-bold"
                      style={{ color: accent }}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', delay: 0.4 }}
                    >
                      {moment.ssi}
                    </motion.p>
                    <p className="text-white/30 text-[10px] -mt-0.5">SSI</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-2 pt-2 border-t border-white/[0.05]">
                  {fmtDistance(moment.distance) && (
                    <div>
                      <p className="text-white/70 text-xs font-medium">{fmtDistance(moment.distance)}</p>
                      <p className="text-white/25 text-[9px]">DIST</p>
                    </div>
                  )}
                  {fmtDuration(moment.duration) && (
                    <div>
                      <p className="text-white/70 text-xs font-medium">{fmtDuration(moment.duration)}</p>
                      <p className="text-white/25 text-[9px]">ETA</p>
                    </div>
                  )}
                  {moment.hazardType && moment.hazardType !== 'None' && (
                    <div>
                      <p className="text-rose-400 text-xs font-medium">{moment.hazardType}</p>
                      <p className="text-white/25 text-[9px]">HAZARD</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleShareCard}
                  disabled={sharing}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  style={{
                    background: sharing ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${accent}cc, ${accent}77)`,
                    color: sharing ? 'rgba(255,255,255,0.4)' : '#fff',
                    boxShadow: sharing ? 'none' : `0 4px 16px ${accent}44`,
                  }}
                >
                  {sharing ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  )}
                  {sharing ? 'Generating…' : 'Share Card'}
                </button>

                <button
                  onClick={handleCopyText}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-white/80 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Text
                    </>
                  )}
                </button>
              </div>

              {/* Auto-dismiss hint */}
              <p className="text-white/15 text-[10px] text-center mt-2.5">Auto-dismisses in a few seconds</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
