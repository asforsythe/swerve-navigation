/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"SF Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.3s ease-out both',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-left': 'slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'dash': 'dash 1.5s ease-in-out infinite',
        'route-draw': 'routeDraw 1.5s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'radar-ping': 'radarPing 2s ease-out infinite',
        // Phase 1 new animations
        'orbit': 'orbit 5s linear infinite',
        'orbit-fast': 'orbit 3s linear infinite',
        'orbit-slow': 'orbit 8s linear infinite',
        'toast-enter': 'toastEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast-shake': 'toastShake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'progress-drain': 'progressDrain linear forwards',
        'svg-draw': 'svgDraw 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'confetti-fall': 'confettiFall 0.9s ease-in forwards',
        'edge-pulse': 'edgePulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px currentColor)' },
          '50%': { filter: 'drop-shadow(0 0 12px currentColor)' },
        },
        dash: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        routeDraw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        radarPing: {
          '0%': { transform: 'scale(0.5)', opacity: '0.6' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        // Phase 1 keyframes
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(var(--orbit-r, 62px)) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(var(--orbit-r, 62px)) rotate(-360deg)' },
        },
        toastEnter: {
          '0%': { opacity: '0', transform: 'translateY(-12px) scale(0.94)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
        },
        toastShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%': { transform: 'translateX(-6px)' },
          '30%': { transform: 'translateX(6px)' },
          '45%': { transform: 'translateX(-4px)' },
          '60%': { transform: 'translateX(4px)' },
          '75%': { transform: 'translateX(-2px)' },
          '90%': { transform: 'translateX(2px)' },
        },
        progressDrain: {
          '0%': { width: '100%' },
          '100%': { width: '0%' },
        },
        svgDraw: {
          '0%': { strokeDashoffset: '200' },
          '100%': { strokeDashoffset: '0' },
        },
        confettiFall: {
          '0%': { opacity: '1', transform: 'translateY(0) rotate(0deg) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(56px) rotate(720deg) scale(0.5)' },
        },
        edgePulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        'glass-lg': '0 12px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'neon-green': '0 0 20px rgba(34, 197, 94, 0.4)',
        'neon-red': '0 0 20px rgba(239, 68, 68, 0.4)',
        'neon-blue': '0 0 20px rgba(59, 130, 246, 0.4)',
        'neon-cyan': '0 0 20px rgba(6, 182, 212, 0.4)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
