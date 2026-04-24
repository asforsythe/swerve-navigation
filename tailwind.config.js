/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      // ── Typography ──────────────────────────────────────────────────────────
      fontFamily: {
        mono: ['"SF Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      // ── Colors ─────────────────────────────────────────────────────────────
      colors: {
        surface: {
          DEFAULT: '#0a0a0e',
          high:    '#111118',
          mid:     '#0d0d14',
        },
        swerve: {
          rose:    '#f43f5e',
          cyan:    '#22d3ee',
          emerald: '#34d399',
          amber:   '#fbbf24',
          orange:  '#f97316',
          violet:  '#a78bfa',
          blue:    '#60a5fa',
          gold:    '#fcd34d',
        },
        traffic: {
          unknown:  '#00E5FF',
          free:     '#22E07A',
          moderate: '#FFD24D',
          heavy:    '#FF8A3D',
          severe:   '#FF3B5C',
          incident: '#FF1744',
        },
      },

      // ── Spacing extras ──────────────────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
      },

      // ── Border radius ───────────────────────────────────────────────────────
      borderRadius: {
        '2.5xl': '20px',
        '3xl':   '24px',
        '4xl':   '32px',
      },

      // ── Box shadows ─────────────────────────────────────────────────────────
      boxShadow: {
        'glass':    '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-lg': '0 12px 48px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glass-xl': '0 24px 64px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.10)',
        'neon-cyan':    '0 0 20px rgba(34,211,238,0.50)',
        'neon-emerald': '0 0 20px rgba(52,211,153,0.50)',
        'neon-rose':    '0 0 20px rgba(244,63,94,0.50)',
        'neon-amber':   '0 0 20px rgba(251,191,36,0.50)',
        'neon-orange':  '0 0 20px rgba(249,115,22,0.50)',
        'neon-violet':  '0 0 20px rgba(167,139,250,0.50)',
        'neon-red':     '0 0 20px rgba(239,68,68,0.50)',
        'neon-green':   '0 0 20px rgba(34,197,94,0.40)',
        'neon-blue':    '0 0 20px rgba(59,130,246,0.40)',
        'inner-glow':   'inset 0 1px 0 rgba(255,255,255,0.08)',
        'comet':        '0 0 24px rgba(34,211,238,0.80), 0 0 8px rgba(255,255,255,0.60)',
      },

      // ── Backdrop blur ───────────────────────────────────────────────────────
      backdropBlur: {
        xs:  '2px',
        '4xl':'40px',
      },

      // ── Animations ──────────────────────────────────────────────────────────
      animation: {
        // Entrances
        'fade-in-up':    'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in':       'fadeIn 0.3s ease-out both',
        'scale-in':      'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-right':'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-left': 'slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-top':  'slideInTop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-bottom':'slideInBottom 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',

        // Loops
        'shimmer':       'shimmer 1.6s ease-in-out infinite',
        'shimmer-fast':  'shimmer 0.9s ease-in-out infinite',
        'pulse-glow':    'pulseGlow 2s ease-in-out infinite',
        'pulse-slow':    'pulse 3s ease-in-out infinite',
        'spin-slow':     'spin 3s linear infinite',
        'spin-slower':   'spin 8s linear infinite',
        'float':         'float 3s ease-in-out infinite',
        'float-fast':    'float 1.8s ease-in-out infinite',
        'radar-ping':    'radarPing 2s ease-out infinite',
        'edge-pulse':    'edgePulse 2s ease-in-out infinite',
        'breathe':       'breathe 4s ease-in-out infinite',

        // Route / map
        'route-draw':    'routeDraw 1.5s ease-out forwards',
        'comet-trace':   'cometTrace 2s linear infinite',
        'dash':          'dash 1.5s ease-in-out infinite',
        'svg-draw':      'svgDraw 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',

        // Orbits (TelemetryPanel particles)
        'orbit':         'orbit 5s linear infinite',
        'orbit-fast':    'orbit 3s linear infinite',
        'orbit-slow':    'orbit 8s linear infinite',

        // Toasts & UI
        'toast-enter':   'toastEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast-shake':   'toastShake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'progress-drain':'progressDrain linear forwards',
        'confetti-fall': 'confettiFall 0.9s ease-in forwards',

        // Number roll
        'roll-up':       'rollUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',
        'roll-down':     'rollDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',

        // Tap feedback
        'tap-ripple':    'tapRipple 0.5s ease-out forwards',

        // Voice orb
        'voice-ring':    'voiceRing 1.2s ease-out infinite',
        'voice-core':    'voiceCore 0.8s ease-in-out infinite',
      },

      // ── Keyframes ───────────────────────────────────────────────────────────
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.88)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(32px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-32px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInTop: {
          '0%':   { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInBottom: {
          '0%':   { opacity: '0', transform: 'translateY(24px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px currentColor)' },
          '50%':       { filter: 'drop-shadow(0 0 12px currentColor)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-6px)' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%':       { opacity: '0.9', transform: 'scale(1.04)' },
        },
        radarPing: {
          '0%':   { transform: 'scale(0.5)', opacity: '0.6' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        edgePulse: {
          '0%, 100%': { opacity: '0.55' },
          '50%':       { opacity: '1' },
        },
        dash: {
          '0%':   { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        routeDraw: {
          '0%':   { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        cometTrace: {
          '0%':   { strokeDashoffset: '200' },
          '100%': { strokeDashoffset: '0' },
        },
        orbit: {
          '0%':   { transform: 'rotate(0deg) translateX(var(--orbit-r, 62px)) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(var(--orbit-r, 62px)) rotate(-360deg)' },
        },
        toastEnter: {
          '0%':   { opacity: '0', transform: 'translateY(-12px) scale(0.94)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)',        filter: 'blur(0px)' },
        },
        toastShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%':       { transform: 'translateX(-6px)' },
          '30%':       { transform: 'translateX(6px)' },
          '45%':       { transform: 'translateX(-4px)' },
          '60%':       { transform: 'translateX(4px)' },
          '75%':       { transform: 'translateX(-2px)' },
          '90%':       { transform: 'translateX(2px)' },
        },
        progressDrain: {
          '0%':   { width: '100%' },
          '100%': { width: '0%' },
        },
        svgDraw: {
          '0%':   { strokeDashoffset: '200' },
          '100%': { strokeDashoffset: '0' },
        },
        confettiFall: {
          '0%':   { opacity: '1', transform: 'translateY(0) rotate(0deg) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(56px) rotate(720deg) scale(0.5)' },
        },
        rollUp: {
          '0%':   { opacity: '0', transform: 'translateY(50%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        rollDown: {
          '0%':   { opacity: '0', transform: 'translateY(-50%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        tapRipple: {
          '0%':   { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        voiceRing: {
          '0%':   { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        voiceCore: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%':       { transform: 'scale(1.12)' },
        },
      },
    },
  },
  plugins: [],
};
