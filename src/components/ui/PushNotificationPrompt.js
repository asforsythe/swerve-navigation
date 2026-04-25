import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DISMISS_KEY = 'swerve-push-prompt-dismissed';
const DISMISS_TTL = 7 * 24 * 3600 * 1000; // 7 days

const examples = [
  {
    icon: '⭐',
    color: '#34d399',
    title: 'Golden window opens in 2 hours',
    detail: 'SSI forecast: 91 — perfect conditions for your route',
  },
  {
    icon: '⚠️',
    color: '#f97316',
    title: 'Storm approaching your saved route',
    detail: 'SSI dropped to 42 (Severe). Consider delaying.',
  },
  {
    icon: '👍',
    color: '#a78bfa',
    title: 'Your hazard report was verified',
    detail: '5 drivers upvoted your Flooding report — +10 pts',
  },
];

const PushNotificationPrompt = ({ onSubscribe, onDismiss, isSubscribing }) => {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
    onDismiss?.();
  };

  const handleEnable = async () => {
    const result = await onSubscribe?.();
    if (result?.success || result?.error === 'Notification permission denied') {
      handleDismiss();
    }
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-80 rounded-[20px] overflow-hidden"
        style={{
          background: 'rgba(10,10,14,0.92)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(52,211,153,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute inset-x-0 top-0 h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.6), transparent)' }}
        />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.20)' }}
            >
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm">Stay ahead of the storm</h3>
              <p className="text-white/40 text-[11px] mt-0.5 leading-relaxed">
                Get real-time alerts when conditions change on your routes.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/20 hover:text-white/50 transition-colors mt-0.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Notification examples */}
          <div className="space-y-2 mb-4">
            {examples.map((ex, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span className="text-base leading-none mt-0.5">{ex.icon}</span>
                <div className="min-w-0">
                  <p className="text-white/80 text-[11px] font-semibold truncate">{ex.title}</p>
                  <p className="text-white/35 text-[10px] mt-0.5 truncate">{ex.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <motion.button
              onClick={handleEnable}
              disabled={isSubscribing}
              whileHover={!isSubscribing ? { scale: 1.02 } : {}}
              whileTap={!isSubscribing ? { scale: 0.97 } : {}}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(52,211,153,0.9), rgba(16,185,129,0.85))',
                boxShadow: '0 4px 16px rgba(52,211,153,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              {isSubscribing ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              )}
              Enable Route Alerts
            </motion.button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 transition-colors bg-white/[0.04] hover:bg-white/[0.08]"
            >
              Later
            </button>
          </div>

          <p className="text-white/20 text-[9px] text-center mt-2.5 leading-relaxed">
            You can disable alerts anytime in your browser settings
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/** Returns true if the prompt is eligible to show (not dismissed within TTL) */
export function shouldShowPushPrompt() {
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (!dismissed) return true;
  return Date.now() - parseInt(dismissed, 10) > DISMISS_TTL;
}

export default PushNotificationPrompt;
