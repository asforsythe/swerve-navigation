import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import useSwerveStore from '../../store/useSwerveStore';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const SSI_COLORS = {
  Optimal: '#34d399',
  Fair: '#3b82f6',
  Caution: '#fbbf24',
  Severe: '#f97316',
  Critical: '#ef4444',
};

function ssiColor(category) {
  return SSI_COLORS[category] || '#34d399';
}

function fmtDistance(meters) {
  if (!meters) return '—';
  return `${(meters / 1609.34).toFixed(1)} mi`;
}

function fmtDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function SafetyReportPanel() {
  const { lastRouteReport, ui, setUiState } = useSwerveStore();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');

  const show = ui?.showSafetyReport && lastRouteReport;

  // Generate QR code
  useEffect(() => {
    if (!lastRouteReport) return;
    const text = `Swerve Route Report\nFrom: ${lastRouteReport.from}\nTo: ${lastRouteReport.to}\nSSI: ${lastRouteReport.ssi} (${lastRouteReport.category})\nHazard: ${lastRouteReport.hazardType}\nDistance: ${fmtDistance(lastRouteReport.distance)}\nETA: ${fmtDuration(lastRouteReport.duration)}`;
    QRCode.toDataURL(text, {
      width: 120,
      margin: 1,
      color: { dark: '#ffffff', light: '#00000000' },
    }).then(setQrDataUrl).catch(() => {});
  }, [lastRouteReport]);

  const handleShareCard = async () => {
    if (!lastRouteReport) return;
    setSharing(true);
    setShareError('');
    try {
      const res = await fetch('/api/share-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lastRouteReport),
      });
      if (!res.ok) throw new Error('Server error');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (navigator.share && navigator.canShare?.({ files: [] })) {
        const file = new File([blob], 'swerve-route.png', { type: 'image/png' });
        await navigator.share({ title: 'My Swerve Route', files: [file] });
      } else {
        // Download fallback
        const a = document.createElement('a');
        a.href = url;
        a.download = 'swerve-route.png';
        a.click();
      }
      URL.revokeObjectURL(url);
    } catch (e) {
      setShareError('Share failed — is the Swerve server running?');
    } finally {
      setSharing(false);
    }
  };

  const close = () => setUiState({ showSafetyReport: false });

  const color = lastRouteReport ? ssiColor(lastRouteReport.category) : '#34d399';
  const ssiVal = lastRouteReport?.ssi ?? 0;
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference * (1 - ssiVal / 100);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="safety-report"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="absolute bottom-0 left-0 right-0 z-50 px-4 pb-4"
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="rounded-[20px] border border-white/[0.1] overflow-hidden"
            style={{
              background: 'rgba(10,10,14,0.97)',
              backdropFilter: 'blur(24px)',
              boxShadow: `0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
            }}
          >
            {/* Accent top border */}
            <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}44, transparent)` }} />

            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-0.5">Safety Report</p>
                  <h3 className="text-white text-base font-semibold leading-tight">
                    {lastRouteReport.to}
                  </h3>
                  <p className="text-white/40 text-xs mt-0.5">from {lastRouteReport.from}</p>
                </div>
                <button
                  onClick={close}
                  className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-4">
                {/* SSI ring */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
                      <motion.circle
                        cx="40" cy="40" r="36" fill="none"
                        stroke={color} strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: dashOffset }}
                        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-white font-bold text-xl leading-none">{ssiVal}</span>
                      <span className="text-white/35 text-[9px] tracking-wide">SSI</span>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                    style={{ color, background: color + '22' }}
                  >
                    {lastRouteReport.category}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="flex-1 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Distance', value: fmtDistance(lastRouteReport.distance) },
                    { label: 'ETA', value: fmtDuration(lastRouteReport.duration) },
                    { label: 'Traction', value: lastRouteReport.traction != null ? `${lastRouteReport.traction}%` : '—' },
                    {
                      label: 'Hazard',
                      value: lastRouteReport.hazardType || 'None',
                      wide: true,
                      accent: lastRouteReport.hazardType !== 'None',
                    },
                    { label: 'Time of Day', value: lastRouteReport.isNight ? 'Night' : 'Day' },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`bg-white/[0.04] rounded-xl p-2.5 border border-white/[0.05] ${s.wide ? 'col-span-2' : ''}`}
                    >
                      <p className={`text-sm font-semibold ${s.accent ? 'text-rose-400' : 'text-white'} truncate`}>{s.value}</p>
                      <p className="text-white/30 text-[10px] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Thumbnail + QR + actions */}
              <div className="flex gap-3 mt-4 items-stretch">
                {/* Mapbox static thumbnail */}
                {lastRouteReport.centerLng != null && (
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/[0.08] flex-shrink-0">
                    <img
                      src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${lastRouteReport.centerLng},${lastRouteReport.centerLat},12/192x192@2x?access_token=${MAPBOX_TOKEN}`}
                      alt="Route map"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* QR code */}
                {qrDataUrl && (
                  <div className="flex flex-col items-center justify-center bg-white/[0.04] rounded-xl border border-white/[0.05] px-3 py-2 flex-shrink-0">
                    <img src={qrDataUrl} alt="QR Code" className="w-14 h-14" />
                    <p className="text-white/25 text-[9px] mt-1 tracking-wide">SCAN TO SHARE</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex-1 flex flex-col gap-2 justify-center">
                  <button
                    onClick={handleShareCard}
                    disabled={sharing}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
                    style={{
                      background: sharing ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${color}cc, ${color}88)`,
                      color: sharing ? 'rgba(255,255,255,0.4)' : '#fff',
                      boxShadow: sharing ? 'none' : `0 4px 20px ${color}44`,
                    }}
                  >
                    {sharing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.338m0 0a5.002 5.002 0 019.802 0m-9.802 0A5.002 5.002 0 013 12c0-2.761 2.239-5 5-5m11 5a5 5 0 11-10 0 5 5 0 0110 0z" />
                        </svg>
                        Share Card
                      </span>
                    )}
                  </button>

                  {shareError && (
                    <p className="text-rose-400 text-[10px] text-center">{shareError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
