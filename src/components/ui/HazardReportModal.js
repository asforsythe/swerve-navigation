import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSwerveStore from '../../store/useSwerveStore';

const HAZARD_TYPES = [
  { key: 'Flooding',     icon: '🌊', color: '#3b82f6', label: 'Flooding'     },
  { key: 'Debris',       icon: '🍂', color: '#fbbf24', label: 'Leaves/Debris'},
  { key: 'Accident',     icon: '💥', color: '#f43f5e', label: 'Accident'     },
  { key: 'Ice',          icon: '🧊', color: '#22d3ee', label: 'Ice'          },
  { key: 'Construction', icon: '🚧', color: '#f97316', label: 'Construction' },
  { key: 'Pothole',      icon: '🕳️', color: '#a78bfa', label: 'Pothole'      },
  { key: 'Animal',       icon: '🦌', color: '#34d399', label: 'Animal'       },
];

export default function HazardReportModal({ reportHazard, userLoc }) {
  const { ui, setUiState } = useSwerveStore();
  const show = ui?.showHazardReport ?? false;

  const [selectedType, setSelectedType] = useState(null);
  const [description, setDescription]   = useState('');
  const [submitting, setSubmitting]      = useState(false);

  const handleClose = () => {
    setUiState({ showHazardReport: false });
    setSelectedType(null);
    setDescription('');
  };

  const handleSubmit = async () => {
    if (!selectedType || !userLoc) return;
    setSubmitting(true);
    const [lng, lat] = userLoc; // userLoc is [lng, lat]
    await reportHazard({ type: selectedType, lat, lng, description });
    setSubmitting(false);
    handleClose();
  };

  const selected = HAZARD_TYPES.find(t => t.key === selectedType);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="hazard-modal"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 z-[55]"
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="relative rounded-t-[24px] border-t border-x border-white/[0.08] p-5"
            style={{
              background: 'rgba(10,10,14,0.97)',
              backdropFilter: 'blur(28px)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[24px]"
              style={{ background: 'linear-gradient(90deg, #f43f5e, #f43f5e44, transparent)' }}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-rose-400">⚠</span>
                <div>
                  <p className="text-white text-xs font-semibold">Report Road Hazard</p>
                  <p className="text-white/30 text-[9px]">
                    {userLoc ? 'At your current location' : 'Enable location to report'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {HAZARD_TYPES.map(({ key, icon, color, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedType(key)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-150 active:scale-95"
                  style={{
                    background: selectedType === key ? `${color}20` : 'rgba(255,255,255,0.03)',
                    borderColor: selectedType === key ? `${color}60` : 'rgba(255,255,255,0.06)',
                    boxShadow: selectedType === key ? `0 0 12px ${color}22` : 'none',
                  }}
                >
                  <span className="text-xl leading-none">{icon}</span>
                  <span
                    className="text-[8px] font-semibold leading-none"
                    style={{ color: selectedType === key ? color : 'rgba(255,255,255,0.4)' }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>

            {/* Description */}
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add details (optional)..."
              maxLength={200}
              rows={2}
              className="w-full bg-white/[0.04] text-white/80 rounded-xl p-3 border border-white/[0.06] outline-none text-xs placeholder:text-white/25 resize-none mb-3 transition-colors"
              style={{ lineHeight: '1.5' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(244,63,94,0.3)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
            />

            {/* No location warning */}
            {!userLoc && (
              <p className="text-amber-400/70 text-[10px] mb-3 flex items-center gap-1.5">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Enable location access to submit a report
              </p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!selectedType || !userLoc || submitting}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: selected
                  ? `linear-gradient(135deg, ${selected.color}dd, ${selected.color}99)`
                  : 'rgba(255,255,255,0.06)',
                boxShadow: selected && !submitting
                  ? `0 4px 16px ${selected.color}44`
                  : 'none',
              }}
            >
              {submitting
                ? 'Submitting...'
                : selectedType
                  ? `Report ${selectedType}`
                  : 'Select a hazard type'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
