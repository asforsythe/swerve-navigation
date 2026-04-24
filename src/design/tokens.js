/**
 * Swerve Design Tokens — JS source of truth
 * All values are CSS-compatible; Tailwind config imports from here.
 * CSS vars in tokens.css are kept in sync manually (or via build step).
 */

// ── Color Palette ─────────────────────────────────────────────────────────────
export const colors = {
  // Core brand
  primary:    '#f43f5e',   // rose-500 — CTAs, danger alerts
  primaryDim: 'rgba(244, 63, 94, 0.15)',
  primaryGlow:'rgba(244, 63, 94, 0.45)',

  // Safety spectrum (SSI)
  safe:       '#34d399',   // emerald-400 — SSI ≥ 85
  safeGlow:   'rgba(52, 211, 153, 0.50)',
  optimal:    '#22d3ee',   // cyan-400    — SSI 70-84
  optimalGlow:'rgba(34, 211, 238, 0.50)',
  caution:    '#fbbf24',   // amber-400   — SSI 55-69
  cautionGlow:'rgba(251, 191, 36, 0.50)',
  warn:       '#f97316',   // orange-500  — SSI 30-54
  warnGlow:   'rgba(249, 115, 22, 0.50)',
  critical:   '#ef4444',   // red-500     — SSI < 30
  criticalGlow:'rgba(239, 68, 68, 0.50)',

  // Accents
  violet:     '#a78bfa',   // violet-400
  violetGlow: 'rgba(167, 139, 250, 0.50)',
  blue:       '#60a5fa',   // blue-400 — radar, info
  blueGlow:   'rgba(96, 165, 250, 0.50)',
  gold:       '#fcd34d',   // amber-300 — streaks, scores

  // Surface
  surface:    '#0a0a0e',
  surfaceHigh:'#111118',
  surfaceMid: '#0d0d14',
  border:     'rgba(255,255,255,0.08)',
  borderHigh: 'rgba(255,255,255,0.14)',

  // Text
  textPrimary: 'rgba(255,255,255,0.90)',
  textSec:     'rgba(255,255,255,0.55)',
  textMuted:   'rgba(255,255,255,0.30)',
  textDim:     'rgba(255,255,255,0.15)',
};

// ── SSI → color helper (returns { color, glow, label }) ───────────────────────
export function ssiTheme(ssi) {
  if (ssi >= 85) return { color: colors.safe,    glow: colors.safeGlow,    label: 'Optimal' };
  if (ssi >= 70) return { color: colors.optimal,  glow: colors.optimalGlow, label: 'Good' };
  if (ssi >= 55) return { color: colors.caution,  glow: colors.cautionGlow, label: 'Caution' };
  if (ssi >= 30) return { color: colors.warn,     glow: colors.warnGlow,    label: 'Warning' };
  return           { color: colors.critical, glow: colors.criticalGlow, label: 'Critical' };
}

// ── Shadows ───────────────────────────────────────────────────────────────────
export const shadows = {
  glass:    '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
  glassLg:  '0 12px 48px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.08)',
  glassXl:  '0 24px 64px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.10)',
  neonCyan:    '0 0 20px rgba(34,211,238,0.50)',
  neonRose:    '0 0 20px rgba(244,63,94,0.50)',
  neonEmerald: '0 0 20px rgba(52,211,153,0.50)',
  neonAmber:   '0 0 20px rgba(251,191,36,0.50)',
  neonViolet:  '0 0 20px rgba(167,139,250,0.50)',
  innerGlow:   'inset 0 1px 0 rgba(255,255,255,0.08)',
};

// ── Z-index layers ────────────────────────────────────────────────────────────
export const zIndex = {
  map:        0,
  particles:  11,
  weather:    11,
  route:      21,
  markers:    31,
  panels:     40,
  safetyRep:  50,
  hazardModal:55,
  momentCap:  70,
  toasts:     80,
  fx:         90,
};

// ── Timing ────────────────────────────────────────────────────────────────────
export const duration = {
  instant:  100,
  fast:     150,
  std:      300,
  slow:     500,
  slower:   700,
  ambient:  5000,
};

// ── Border radius ─────────────────────────────────────────────────────────────
export const radius = {
  sm:   '10px',
  md:   '14px',
  lg:   '20px',
  xl:   '28px',
  full: '9999px',
};

// ── Typography scale ──────────────────────────────────────────────────────────
export const type = {
  micro: '8px',
  xs:    '10px',
  sm:    '11px',
  base:  '13px',
  md:    '15px',
  lg:    '18px',
  xl:    '24px',
  hero:  '40px',
};

// ── Backdrop blur presets ─────────────────────────────────────────────────────
export const blur = {
  xs:  'blur(4px)',
  sm:  'blur(8px)',
  md:  'blur(16px)',
  lg:  'blur(24px)',
  xl:  'blur(40px)',
};

// ── Glass panel helper ────────────────────────────────────────────────────────
export function glassSurface({ accentColor = null, strength = 'md' } = {}) {
  const blurs = { sm: 'blur(12px)', md: 'blur(20px)', lg: 'blur(32px)' };
  const base = {
    background:   `rgba(10,10,14,0.72)`,
    backdropFilter: blurs[strength] ?? blurs.md,
    WebkitBackdropFilter: blurs[strength] ?? blurs.md,
    border:       `1px solid ${colors.border}`,
    boxShadow:    shadows.glass,
  };
  if (accentColor) {
    base.boxShadow = `0 0 0 1px ${accentColor}33, ${shadows.glass}`;
    base.borderColor = `${accentColor}22`;
  }
  return base;
}
