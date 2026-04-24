/**
 * Swerve Easing Curves
 * Shared between CSS (cubic-bezier) and Framer Motion (ease array).
 * Each curve is exported as BOTH a CSS string and a [x1,y1,x2,y2] array.
 */

// Framer Motion accepts arrays directly as "ease"
export const spring = {
  /** Fast snappy UI snap — buttons, tabs, toggles */
  snappy: { type: 'spring', stiffness: 500, damping: 30, mass: 0.8 },
  /** Standard panel slide — drawers, sheets */
  panel:  { type: 'spring', stiffness: 380, damping: 32, mass: 1.0 },
  /** Bouncy entrance — badges, medals, toast */
  bouncy: { type: 'spring', stiffness: 280, damping: 18, mass: 0.9 },
  /** Smooth exit — fade-out, collapse */
  exit:   { type: 'tween',  ease: [0.4, 0, 1, 1], duration: 0.2 },
  /** Hero entrance — start screen, route compute */
  hero:   { type: 'spring', stiffness: 200, damping: 24, mass: 1.2 },
  /** Ambient float — looping idle states */
  float:  { type: 'tween',  ease: 'easeInOut', duration: 3, repeat: Infinity, repeatType: 'reverse' },
};

// CSS cubic-bezier strings
export const ease = {
  spring:  'cubic-bezier(0.16, 1, 0.3, 1)',   // ease-out-expo (snappy)
  out:     'cubic-bezier(0.0, 0.0, 0.2, 1)',   // material ease-out
  inOut:   'cubic-bezier(0.4, 0.0, 0.2, 1)',   // material standard
  in:      'cubic-bezier(0.4, 0.0, 1, 1)',     // material ease-in (exits)
  bounce:  'cubic-bezier(0.34, 1.56, 0.64, 1)',// slight overshoot
};

// Framer Motion ease arrays (matching CSS curves)
export const easeFM = {
  spring:  [0.16, 1, 0.3, 1],
  out:     [0.0, 0.0, 0.2, 1],
  inOut:   [0.4, 0.0, 0.2, 1],
  in:      [0.4, 0.0, 1, 1],
  bounce:  [0.34, 1.56, 0.64, 1],
};

// Duration presets in seconds (Framer Motion uses seconds)
export const dur = {
  instant: 0.08,
  fast:    0.15,
  std:     0.28,
  slow:    0.50,
  slower:  0.70,
};
