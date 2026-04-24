import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import useSwerveStore from '../../store/useSwerveStore';

const SSI_COLOR = (ssi) =>
  ssi >= 85 ? '#34d399' :
  ssi >= 70 ? '#3b82f6' :
  ssi >= 55 ? '#fbbf24' :
  ssi >= 30 ? '#f97316' : '#ef4444';

export default function LiveSharePanel({ onStart, onStop }) {
  const { ui, setUiState, liveShare, routeTelemetry, lastRouteReport } = useSwerveStore();
  const show = ui?.showLiveShare ?? false;
  const { isActive, shareUrl } = liveShare || {};

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const ssi   = routeTelemetry?.ssi ?? 0;
  const color  = SSI_COLOR(ssi);
  const ACCENT = '#22d3ee'; // cyan — "live" color

  // Generate QR code when share URL changes
  useEffect(() => {
    if (!shareUrl) { setQrDataUrl(''); return; }
    QRCode.toDataURL(shareUrl, {
      width: 140,
      margin: 1,
      color: { dark: '#ffffff', light: '#00000000' },
    }).then(setQrDataUrl).catch(() => {});
  }, [shareUrl]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback — ignored */ }
  };

  const panelVariants = {
    hidden:  { opacity: 0, y: 28, scale: 0.96 },
    visible: { opacity: 1, y: 0,  scale: 1, transition: { type: 'spring', stiffness: 340, damping: 30 } },
    exit:    { opacity: 0, y: 20, scale: 0.94, transition: { duration: 0.2 } },
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="absolute bottom-6 left-4 z-50 w-72"
          style={{
            background: 'rgba(10,10,14,0.90)',
            backdropFilter: 'blur(28px)',
            border: `1px solid ${isActive ? ACCENT + '30' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 20,
            boxShadow: `0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-6 right-6 h-px rounded-full"
            style={{ background: isActive
              ? `linear-gradient(90deg, transparent, ${ACCENT}80, transparent)`
              : 'transparent' }}
          />

          <div className="p-5">
            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {/* Live pulse dot */}
                <div className="relative w-2.5 h-2.5">
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ background: ACCENT }}
                      animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                    />
                  )}
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: isActive ? ACCENT : 'rgba(255,255,255,0.2)' }}
                  />
                </div>
                <span className="text-white/90 text-sm font-semibold tracking-wide">
                  {isActive ? 'LIVE SHARING' : 'TRACK MY DRIVE'}
                </span>
              </div>
              <button
                onClick={() => setUiState({ showLiveShare: false })}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/35 hover:text-white/70 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!isActive ? (
              /* ── Inactive state ──────────────────────────────────────── */
              <>
                <p className="text-white/45 text-xs leading-relaxed mb-5">
                  Share a live link so family or friends can follow your route and SSI in real time — no install required.
                </p>

                {lastRouteReport && (
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl mb-4"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: `${color}22`, color }}
                    >
                      {Math.round(ssi)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white/80 text-xs font-medium truncate">
                        {lastRouteReport.to || 'Destination'}
                      </div>
                      <div className="text-white/35 text-[10px]">SSI {Math.round(ssi)}</div>
                    </div>
                  </div>
                )}

                <motion.button
                  onClick={onStart}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT}22, ${ACCENT}14)`,
                    border: `1px solid ${ACCENT}40`,
                    color: ACCENT,
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Start Sharing My Drive
                </motion.button>
              </>
            ) : (
              /* ── Active state ────────────────────────────────────────── */
              <>
                {/* Live SSI chip */}
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-xl mb-4"
                  style={{ background: `${color}12`, border: `1px solid ${color}30` }}
                >
                  <span className="text-white/45 text-xs">Live SSI</span>
                  <span className="text-sm font-bold" style={{ color }}>{Math.round(ssi)}</span>
                </div>

                {/* Share URL */}
                <div
                  className="p-3 rounded-xl mb-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="text-[10px] text-white/30 uppercase tracking-wide mb-1.5">Share Link</div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-xs truncate flex-1 font-mono">{shareUrl}</span>
                    <button
                      onClick={handleCopy}
                      className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0 transition-colors"
                      style={{
                        background: copied ? '#34d39922' : 'rgba(255,255,255,0.08)',
                        color: copied ? '#34d399' : 'rgba(255,255,255,0.6)',
                        border: `1px solid ${copied ? '#34d39930' : 'transparent'}`,
                      }}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* QR code */}
                {qrDataUrl && (
                  <div className="flex justify-center mb-4">
                    <div
                      className="p-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <img src={qrDataUrl} alt="Share QR" className="w-24 h-24" />
                    </div>
                  </div>
                )}

                {/* Web Share API button */}
                {navigator.share && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigator.share({ title: 'Track My Drive — Swerve', url: shareUrl })}
                    className="w-full py-2.5 rounded-xl text-sm font-medium mb-3 flex items-center justify-center gap-2"
                    style={{
                      background: `${ACCENT}18`,
                      border: `1px solid ${ACCENT}35`,
                      color: ACCENT,
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share Link
                  </motion.button>
                )}

                {/* Stop sharing */}
                <button
                  onClick={onStop}
                  className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 text-red-400/70 hover:text-red-300 transition-colors"
                  style={{ border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Stop Sharing
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
