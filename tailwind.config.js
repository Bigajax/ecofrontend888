/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin'
import tokens from './tokens.json' assert { type: 'json' }

const glassStroke = tokens.stroke.glass
const glassBackground = tokens.colors.bg.surface
const glassBlur = tokens.blur.glass
const glassBlurStrong = tokens.blur.glassStrong
const glassShadow = tokens.shadows.glass
const floatingShadow = tokens.shadows.floating

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /* Tipografia — SF Pro com fallbacks (Inter fica como fallback também) */
      fontFamily: {
        sans: [
          'SF Pro Display','SF Pro Text',       // macOS/iOS
          '-apple-system','BlinkMacSystemFont', // Apple stack
          'Segoe UI','Inter','system-ui','Roboto',
          'Helvetica Neue','Arial','sans-serif'
        ],
      },

      colors: {
        accent: tokens.colors.accent,
        success: tokens.colors.success,
        warn: tokens.colors.warn,
        danger: tokens.colors.danger,
        'bg-base': tokens.colors.bg.base,
        'glass-surface': glassBackground,
        'text-primary': tokens.colors.text.primary,
        'text-muted': tokens.colors.text.muted,
      },

      backgroundImage: {
        'orb-surface':
          'radial-gradient(680px_560px_at_16%_-12%,rgba(0,122,255,0.06),transparent_58%),' +
          'radial-gradient(540px_420px_at_88%_-6%,rgba(168,85,247,0.045),transparent_62%),' +
          'radial-gradient(720px_620px_at_50%_120%,rgba(14,165,233,0.035),transparent_70%)',
      },

      backdropBlur: {
        glass: glassBlur,
        'glass-strong': glassBlurStrong,
      },

      borderRadius: {
        xl: tokens.radius.xl,
        '2xl': tokens.radius['2xl'],
      },

      boxShadow: {
        glass: glassShadow,
        floating: floatingShadow,
        'accent-glow': '0 0 0 6px rgba(0, 122, 255, 0.15)',
      },

      /* Animações já existentes */
      keyframes: {
        ripple: {
          '0%':   { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        pulseListen: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':      { transform: 'scale(1.08)', opacity: '0.85' },
        },
        pulseTalk: {
          '0%':   { transform: 'scale(1)', opacity: '1' },
          '25%':  { transform: 'scale(1.06)', opacity: '0.85' },
          '50%':  { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSlow: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        ripple: 'ripple 1.5s infinite ease-in-out',
        pulseListen: 'pulseListen 1.2s ease-in-out infinite',
        pulseTalk: 'pulseTalk 3s ease-in-out infinite',
        pulseSlow: 'pulseSlow 6s ease-in-out infinite',
        float: 'float 9s ease-in-out infinite',
        spinSlow: 'spinSlow 18s linear infinite',
      },
    },
  },

  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.glass-shell': {
          'background': glassBackground,
          'border': glassStroke,
          'backdrop-filter': `blur(${glassBlur})`,
          '-webkit-backdrop-filter': `blur(${glassBlur})`,
          'box-shadow': glassShadow,
          'position': 'relative',
          'overflow': 'hidden',
        },
        '.glass-shell::before': {
          'content': '""',
          'position': 'absolute',
          'inset': '0',
          'border-radius': 'inherit',
          'background': 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
          'opacity': '0.75',
          'pointer-events': 'none',
        },
        '.glass-shell-strong': {
          'background': 'rgba(255, 255, 255, 0.75)',
          'border': glassStroke,
          'backdrop-filter': `blur(${glassBlurStrong})`,
          '-webkit-backdrop-filter': `blur(${glassBlurStrong})`,
          'box-shadow': floatingShadow,
        },
      })
    }),
  ],
}
