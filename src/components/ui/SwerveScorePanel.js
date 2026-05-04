import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSwerveStore from '../../store/useSwerveStore';

// ── Level config ──────────────────────────────────────────────────────────────
const LEVELS = [
  { name: 'Novice',   color: '#94a3b8', glow: 'rgba(148,163,184,0.35)', next: 500  },
  { name: 'Scout',    color: '#22d3ee', glow: 'rgba(34,211,238,0.40)',  next: 2000 },
  { name: 'Ranger',   color: '#a78bfa', glow: 'rgba(167,139,250,0.40)', next: 5000 },
  { name: 'Guardian', color: '#f59e0b', glow: 'rgba(245,158,11,0.45)',  next: 10000 },
  { name: 'Legend',   color: '#f43f5e', glow: 'rgba(244,63,94,0.50)',   next: null },
];

const LEVEL_THRESHOLDS = [0, 500, 2000, 5000, 10000];

// ── Badge catalog ─────────────────────────────────────────────────────────────
const BADGE_META = {
  'first-route':   { label: 'First Route',    icon: '🚗', color: '#22d3ee' },
  'safe-driver':   { label: 'Safe Driver',     icon: '🛡️', color: '#34d399' },
  'storm-chaser':  { label: 'Storm Chaser',    icon: '⛈️', color: '#60a5fa' },
  'streak-3':      { label: '3-Day Streak',    icon: '🔥', color: '#f97316' },
  'streak-7':      { label: 'Week Warrior',    icon: '⚡', color: '#fbbf24' },
  'golden-window': { label: 'Golden Window',   icon: '⭐', color: '#fcd34d' },
  'hazard-scout':  { label: 'Hazard Scout',    icon: '🔭', color: '#a78bfa' },
  'centurion':     { label: 'Road Centurion',  icon: '💯', color: '#f43f5e' },
  'scout-rank':    { label: 'Scout Rank',      icon: '🔵', color: '#22d3ee' },
  'ranger-rank':   { label: 'Ranger Rank',     icon: '💜', color: '#a78bfa' },
  'guardian-rank': { label: 'Guardian Rank',   icon: '🌟', color: '#f59e0b' },
  'legend-rank':   { label: 'Legend',          icon: '🏆', color: '#f43f5e' },
};

// ── Animated ring arc ─────────────────────────────────────────────────────────
const LevelRing = ({ level, total, size = 120 }) => {
  const lv     = LEVELS[Math.min(level, 4)];
  const prev   = LEVEL_THRESHOLDS[level] ?? 0;
  const next   = lv.next ?? (prev + 1);
  const progress = lv.next ? Math.max(0, Math.min(1, (total - prev) / (next - prev))) : 1;

  const r  = (size / 2) - 10;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * progress;
  const gap  = circ - dash;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={cx} cy={cx} r={r}
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="9" fill="none"
        />
        {/* Progress arc */}
        <motion.circle
          cx={cx} cy={cx} r={r}
          stroke={lv.color}
          strokeWidth="9" fill="none"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${dash} ${gap}` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${lv.color})` }}
        />
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={total}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-white font-bold leading-none"
          style={{ fontSize: size * 0.19 }}
        >
          {total.toLocaleString()}
        </motion.span>
        <span className="text-white/40 font-medium" style={{ fontSize: size * 0.1 }}>PTS</span>
      </div>
    </div>
  );
};

// ── Streak flame badge ────────────────────────────────────────────────────────
const StreakBadge = ({ streak }) => {
  const isHot = streak >= 3;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative flex items-center justify-center w-11 h-11 rounded-xl"
        style={{
          background: isHot ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${isHot ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
        }}>
        {isHot && (
          <motion.div
            className="absolute inset-0 rounded-xl"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ background: 'rgba(249,115,22,0.2)' }}
          />
        )}
        <span className="text-xl relative z-10">{isHot ? '🔥' : '❄️'}</span>
      </div>
      <span className="text-white font-bold text-sm leading-none">{streak}</span>
      <span className="text-white/35 text-[9px] tracking-wide uppercase">streak</span>
    </div>
  );
};

// ── Badge chip ────────────────────────────────────────────────────────────────
const BadgeChip = ({ badgeId }) => {
  const meta = BADGE_META[badgeId] || { label: badgeId, icon: '🎖️', color: '#94a3b8' };
  return (
    <div
      className="flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl flex-shrink-0"
      style={{
        background: `${meta.color}14`,
        border: `1px solid ${meta.color}30`,
        minWidth: 60,
      }}
    >
      <span className="text-lg">{meta.icon}</span>
      <span className="text-[9px] text-white/50 text-center leading-tight max-w-[56px]">
        {meta.label}
      </span>
    </div>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────
export default function SwerveScorePanel() {
  const { ui, setUiState, swerveScore } = useSwerveStore();
  const show = ui?.showSwerveScore ?? false;

  const {
    total = 0, level = 0, badges = [],
    currentStreak = 0, longestStreak = 0,
    weeklyPoints = 0, totalRoutes = 0,
    safeRoutes = 0,
  } = swerveScore || {};

  const lv         = LEVELS[Math.min(level, 4)];
  const prevThresh = LEVEL_THRESHOLDS[level] ?? 0;
  const nextThresh = lv.next;
  const ptsToNext  = nextThresh ? Math.max(0, nextThresh - total) : 0;

  const panelVariants = {
    hidden: { opacity: 0, y: 32, scale: 0.96 },
    visible: {
      opacity: 1, y: 0, scale: 1,
      transition: { type: 'spring', stiffness: 340, damping: 30 },
    },
    exit: {
      opacity: 0, y: 24, scale: 0.95,
      transition: { duration: 0.22, ease: 'easeIn' },
    },
  };

  return (
    <AnimatePresence>
      {show && (
        <>
        <motion.div
          key="ssp-backdrop"
          className="sm:hidden fixed inset-0 z-[54] bg-black/55 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setUiState({ showSwerveScore: false })}
        />
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed sm:absolute z-[55] sm:z-50 left-0 right-0 bottom-0 sm:left-4 sm:right-auto sm:bottom-6 w-full sm:w-72 rounded-t-[28px] sm:rounded-[20px] overflow-hidden"
          style={{
            background: 'rgba(10,10,14,0.92)',
            backdropFilter: 'blur(28px)',
            border: `1px solid ${lv.color}22`,
            boxShadow: `0 -10px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}
        >
          {/* Mobile drag handle + status hairline (level-driven) */}
          <div className="sm:hidden">
            <div
              className="absolute inset-x-0 top-0 h-[1.5px]"
              style={{ background: `linear-gradient(90deg, transparent, ${lv.color}, transparent)` }}
            />
            <div className="flex justify-center pt-3 pb-0.5">
              <div className="w-11 h-1 rounded-full" style={{ background: `${lv.color}90`, boxShadow: `0 0 6px ${lv.color}80` }} />
            </div>
          </div>
          {/* Accent top edge */}
          <div
            className="hidden sm:block absolute top-0 left-6 right-6 h-px rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${lv.color}60, transparent)` }}
          />

          <div className="p-5 max-h-[82vh] overflow-y-auto no-scrollbar sm:max-h-none sm:overflow-visible" style={{ paddingBottom: 'max(1.25rem, calc(var(--safe-bottom, 0px) + 1rem))' }}>
            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-5 rounded-full"
                  style={{ background: lv.color, boxShadow: `0 0 8px ${lv.color}` }}
                />
                <span className="text-white/90 text-sm font-semibold tracking-wide">SWERVE SCORE</span>
              </div>
              <button
                onClick={() => setUiState({ showSwerveScore: false })}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/35 hover:text-white/70 hover:bg-white/08 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── Level ring + streak ────────────────────────────────── */}
            <div className="flex items-center justify-between mb-4">
              <LevelRing level={level} total={total} size={112} />

              <div className="flex flex-col items-center gap-4 flex-1 ml-4">
                {/* Level badge */}
                <div className="text-center">
                  <motion.div
                    key={level}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-lg font-bold tracking-widest uppercase"
                    style={{ color: lv.color, textShadow: `0 0 12px ${lv.color}80` }}
                  >
                    {lv.name}
                  </motion.div>
                  <div className="text-white/35 text-[10px] tracking-wide">
                    LEVEL {level + 1}
                  </div>
                </div>

                <StreakBadge streak={currentStreak} />
              </div>
            </div>

            {/* ── Progress to next level ────────────────────────────── */}
            {nextThresh && (
              <div className="mb-4">
                <div className="flex justify-between text-[10px] text-white/35 mb-1.5">
                  <span>{prevThresh.toLocaleString()} pts</span>
                  <span className="font-medium" style={{ color: lv.color }}>
                    {ptsToNext.toLocaleString()} to {LEVELS[level + 1]?.name}
                  </span>
                  <span>{nextThresh.toLocaleString()} pts</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.max(2, Math.round(((total - prevThresh) / (nextThresh - prevThresh)) * 100))}%`,
                    }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    style={{ background: `linear-gradient(90deg, ${lv.color}90, ${lv.color})` }}
                  />
                </div>
              </div>
            )}

            {/* ── Stats row ─────────────────────────────────────────── */}
            <div
              className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {[
                { label: 'ROUTES', value: totalRoutes },
                { label: 'SAFE', value: safeRoutes },
                { label: 'BEST STREAK', value: longestStreak },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-white font-bold text-base leading-none">{value}</div>
                  <div className="text-white/30 text-[9px] tracking-wide mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* ── Weekly points ─────────────────────────────────────── */}
            <div
              className="flex items-center justify-between px-3 py-2 rounded-xl mb-4"
              style={{ background: `${lv.color}0f`, border: `1px solid ${lv.color}20` }}
            >
              <span className="text-[10px] text-white/40 tracking-wide uppercase">This Week</span>
              <span className="text-sm font-bold" style={{ color: lv.color }}>
                +{weeklyPoints.toLocaleString()} pts
              </span>
            </div>

            {/* ── Badges ────────────────────────────────────────────── */}
            {badges.length > 0 ? (
              <div>
                <div className="text-[10px] text-white/30 tracking-widest uppercase mb-2">
                  Badges — {badges.length}
                </div>
                <div
                  className="flex gap-2 overflow-x-auto pb-1"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {badges.map((id) => (
                    <BadgeChip key={id} badgeId={id} />
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="text-center py-3 rounded-xl text-white/25 text-xs"
                style={{ border: '1px dashed rgba(255,255,255,0.08)' }}
              >
                Plan your first route to earn badges
              </div>
            )}
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
