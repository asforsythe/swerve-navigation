/**
 * Swerve Motion Variants
 * Pre-built Framer Motion variant objects for consistent animation across the app.
 * Import the preset you need and spread onto <motion.X variants={preset} />.
 */
import { spring, easeFM, dur } from './easings';

// ── Fade variants ─────────────────────────────────────────────────────────────
export const fade = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { ease: easeFM.out, duration: dur.std } },
  exit:    { opacity: 0, transition: { ease: easeFM.in,  duration: dur.fast } },
};

// ── Slide-up (bottom sheet, toasts, badges) ───────────────────────────────────
export const slideUp = {
  hidden:  { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: spring.panel },
  exit:    { opacity: 0, y: 16, scale: 0.96, transition: spring.exit },
};

// ── Slide-down (top-bar morphs, dropdown) ────────────────────────────────────
export const slideDown = {
  hidden:  { opacity: 0, y: -16, scale: 0.97 },
  visible: { opacity: 1, y: 0,   scale: 1, transition: spring.panel },
  exit:    { opacity: 0, y: -12, scale: 0.96, transition: spring.exit },
};

// ── Slide-left (right-side panels) ───────────────────────────────────────────
export const slideLeft = {
  hidden:  { opacity: 0, x: 32  },
  visible: { opacity: 1, x: 0, transition: spring.panel },
  exit:    { opacity: 0, x: 24, transition: spring.exit },
};

// ── Slide-right (left-side panels, TelemetryPanel) ───────────────────────────
export const slideRight = {
  hidden:  { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0,   transition: spring.panel },
  exit:    { opacity: 0, x: -24, transition: spring.exit },
};

// ── Scale-in (modals, badges, popups) ────────────────────────────────────────
export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1, transition: spring.bouncy },
  exit:    { opacity: 0, scale: 0.92, transition: spring.exit },
};

// ── Hero entrance (StartScreen, arrival burst) ────────────────────────────────
export const heroEntrance = {
  hidden:  { opacity: 0, scale: 0.80, y: 32 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { ...spring.hero, staggerChildren: 0.08 },
  },
  exit: { opacity: 0, scale: 0.92, y: -16, transition: spring.exit },
};

// ── Stagger children (list mounts) ───────────────────────────────────────────
export const staggerContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const staggerItem = {
  hidden:  { opacity: 0, y: 12, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)', transition: spring.snappy },
};

// ── Number roll (per-digit counter animation) ─────────────────────────────────
export const numberRoll = {
  enter:   (dir) => ({ y: dir > 0 ? 20 : -20, opacity: 0 }),
  center:  { y: 0, opacity: 1,  transition: spring.snappy },
  exit:    (dir) => ({ y: dir > 0 ? -20 : 20, opacity: 0, transition: spring.exit }),
};

// ── Toast variants ────────────────────────────────────────────────────────────
export const toastVariants = {
  hidden:  { opacity: 0, y: -14, scale: 0.92, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0,   scale: 1,    filter: 'blur(0px)', transition: spring.bouncy },
  exit:    { opacity: 0, y: -10, scale: 0.95,  filter: 'blur(3px)', transition: spring.exit },
};

// ── Weather alert edge glow (pulsing inset ring) ──────────────────────────────
export const alertGlow = (color) => ({
  initial:  { opacity: 0.4 },
  animate:  { opacity: [0.4, 1, 0.4], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
  style:    { boxShadow: `inset 0 0 0 2px ${color}` },
});

// ── Maneuver hero (turn-by-turn banner) ──────────────────────────────────────
export const maneuverHero = {
  hidden:  { opacity: 0, x: -40, scale: 0.94 },
  visible: { opacity: 1, x: 0,   scale: 1, transition: { ...spring.snappy, delay: 0.05 } },
  exit:    { opacity: 0, x: 40,  scale: 0.96, transition: spring.exit },
};

// ── Arrival burst (confetti scatter) ─────────────────────────────────────────
export const arrivalBurst = (i) => ({
  initial: { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 },
  animate: {
    opacity: 0, scale: 0.4,
    x:      (Math.cos((i / 12) * Math.PI * 2) * (60 + Math.random() * 40)),
    y:      (Math.sin((i / 12) * Math.PI * 2) * (60 + Math.random() * 40)),
    rotate: Math.random() * 720 - 360,
    transition: { duration: 0.85 + Math.random() * 0.3, ease: easeFM.in },
  },
});

// ── Tap ripple (feedback on press) ───────────────────────────────────────────
export const tapRipple = {
  initial: { scale: 0, opacity: 0.6 },
  animate: { scale: 2.5, opacity: 0, transition: { duration: 0.5, ease: easeFM.out } },
};

// ── Shimmer (loading skeletons, focus borders) ────────────────────────────────
export const shimmerStyle = (accentColor = '#f43f5e') => ({
  background: `linear-gradient(90deg, transparent 0%, ${accentColor}55 50%, transparent 100%)`,
  backgroundSize: '200% 100%',
  animation: `shimmer 1.6s ease-in-out infinite`,
});
